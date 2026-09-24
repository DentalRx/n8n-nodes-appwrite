import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getResourceId,
	getStringParameter,
	parseJsonParameter,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import type { UserAuthentication } from '../transport';
import { appwriteApiRequest, appwriteUserRequest, browserUrl, getProject } from '../transport';

/** The account fields most workflows read, for the Simplify toggle. */
const USER_SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'email',
	'phone',
	'status',
	'emailVerification',
	'phoneVerification',
	'mfa',
	'registration',
	'accessedAt',
];

/** The session fields most workflows read: who, until when, and from where. */
const SESSION_SIMPLIFY_FIELDS = [
	'$id',
	'userId',
	'provider',
	'current',
	'expire',
	'ip',
	'countryName',
	'clientName',
	'osName',
	'deviceName',
];

/** The identity fields without the provider's tokens. */
const IDENTITY_SIMPLIFY_FIELDS = [
	'$id',
	'userId',
	'provider',
	'providerUid',
	'providerEmail',
	'providerAccessTokenExpiry',
	'$createdAt',
	'$updatedAt',
];

/** The consent token fields that say which app holds what access, and until when. */
const CONSENT_TOKEN_SIMPLIFY_FIELDS = [
	'$id',
	'consentId',
	'userId',
	'appId',
	'scopes',
	'resources',
	'expire',
	'$createdAt',
];

/**
 * The authenticator routes. Appwrite's only authenticator type is an
 * authenticator app (TOTP), so the type is fixed rather than a one-entry
 * dropdown.
 */
const TOTP_PATH = '/account/mfa/authenticators/totp';

interface RequestOptions {
	qs?: IDataObject;
	body?: IDataObject;
}

/** Read a secret the user must supply, stopping the item when it is empty. */
function getRequiredSecret(
	this: IExecuteFunctions,
	parameterName: string,
	label: string,
	description: string,
	itemIndex: number,
): string {
	const value = String(this.getNodeParameter(parameterName, itemIndex, '') ?? '').trim();
	if (value === '') {
		throw new NodeOperationError(this.getNode(), `The '${label}' parameter is empty`, {
			description,
			itemIndex,
		});
	}
	return value;
}

/** The user of the session secret an operation was given. */
function getSessionAuthentication(this: IExecuteFunctions, itemIndex: number): UserAuthentication {
	const secret = getRequiredSecret.call(
		this,
		'accountSessionSecret',
		'Session Secret',
		"Pass the 'secret' field of a session created with the API key, e.g. by Create Email Password Session.",
		itemIndex,
	);
	return { type: 'session', secret };
}

/**
 * The user an operation acts as, from its Authentication choice. The Account
 * endpoints identify the user by a JWT or a session secret; the API key cannot
 * stand in for either. The OAuth2 Server resource's consent operations act as
 * the user the same way.
 */
export function getUserAuthentication(
	this: IExecuteFunctions,
	itemIndex: number,
): UserAuthentication {
	const authentication = getStringParameter.call(this, 'accountAuthentication', itemIndex);

	if (authentication === 'jwt') {
		const jwt = getRequiredSecret.call(
			this,
			'accountJwt',
			'JWT',
			"Pass the user's JWT, e.g. from the User resource's Create JWT operation or from your app through a webhook.",
			itemIndex,
		);
		return { type: 'jwt', jwt };
	}

	if (authentication === 'session') return getSessionAuthentication.call(this, itemIndex);

	throw new NodeOperationError(this.getNode(), `Unknown authentication "${authentication}"`, {
		description: 'Choose User JWT or User Session Secret.',
		itemIndex,
	});
}

export async function executeAccountOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Registering users, signing them in and emailing them secrets use the API
	// key: Appwrite only returns the new session's or token's secret to one.
	const withApiKey = async (
		method: IHttpRequestMethods,
		path: string,
		options: RequestOptions = {},
	): Promise<IDataObject> => await appwriteApiRequest.call(this, method, path, options, i);

	const asUser = async (
		method: IHttpRequestMethods,
		path: string,
		options: RequestOptions = {},
	): Promise<IDataObject> =>
		await appwriteUserRequest.call(
			this,
			method,
			path,
			getUserAuthentication.call(this, i),
			options,
			i,
		);

	// Turning MFA on, verifying an authenticator and completing a challenge
	// record factors on the current session, which Appwrite finds from a
	// session secret only: a JWT names no current session.
	const asSession = async (
		method: IHttpRequestMethods,
		path: string,
		options: RequestOptions = {},
	): Promise<IDataObject> =>
		await appwriteUserRequest.call(
			this,
			method,
			path,
			getSessionAuthentication.call(this, i),
			options,
			i,
		);

	// Completing a verification needs no signed-in user: the user ID and secret
	// from the message prove who is calling, and Appwrite serves these
	// endpoints to guests and users but not to API keys.
	const asGuest = async (
		method: IHttpRequestMethods,
		path: string,
		options: RequestOptions = {},
	): Promise<IDataObject> =>
		await appwriteUserRequest.call(this, method, path, { type: 'guest' }, options, i);

	const simplified = (
		data: IDataObject | IDataObject[],
		fields: string[],
	): IDataObject | IDataObject[] =>
		(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data;

	// IDs that go into a path are checked for emptiness: with a blank session
	// ID, Delete Session would request /account/sessions/, which differs only
	// by a trailing slash from the path that signs the user out on every device.
	const requiredId = (parameterName: string, label: string): string => {
		const id = String(this.getNodeParameter(parameterName, i, '') ?? '').trim();
		if (id === '') {
			throw new NodeOperationError(this.getNode(), `The '${label}' parameter is empty`, {
				description: 'Enter the ID, or map it from a previous node with an expression.',
				itemIndex: i,
			});
		}
		return id;
	};

	const sessionId = (): string => requiredId('sessionId', 'Session ID');
	const consentId = (): string => requiredId('consentId', 'Consent ID');
	const consentTokenId = (): string => requiredId('consentTokenId', 'Token ID');
	const sessionPath = (id: string): string => `/account/sessions/${encodeURIComponent(id)}`;
	const consentPath = (id: string): string => `/account/consents/${encodeURIComponent(id)}`;
	const consentTokenPath = (id: string, tokenId: string): string =>
		`${consentPath(id)}/tokens/${encodeURIComponent(tokenId)}`;

	// The user a secret was sent to, and the secret itself.
	const userId = (): string => getResourceId.call(this, 'userId', i, 'user', 'User');
	const secret = (): string => getStringParameter.call(this, 'accountSecret', i);

	const byCode = (): boolean =>
		getStringParameter.call(this, 'accountEmailMethod', i, 'link') === 'code';

	const phraseOption = (): boolean | undefined =>
		(getCollectionParameter.call(this, 'options', i) as { phrase?: boolean }).phrase;

	const getMany = async (path: string, listKey: string): Promise<IDataObject[]> => {
		const authentication = getUserAuthentication.call(this, i);
		const fetchPage = async (queries: string[]): Promise<IDataObject> =>
			await appwriteUserRequest.call(this, 'GET', path, authentication, { qs: { queries } }, i);
		const queries = buildQueries.call(this, i);

		if (this.getNodeParameter('returnAll', i, false) as boolean) {
			return (await fetchAllPages.call(this, queries, fetchPage, listKey, i)) as IDataObject[];
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await fetchPage(withLimit(queries, limit));
		return (response[listKey] as IDataObject[] | undefined) ?? [];
	};

	if (operation === 'completeEmailVerification') {
		const path = byCode() ? '/account/verifications/email/otp' : '/account/verifications/email';
		const response = await asGuest('PUT', path, { body: { userId: userId(), secret: secret() } });
		return toItems(response, i);
	}

	if (operation === 'completeMfaChallenge') {
		const challengeId = getStringParameter.call(this, 'challengeId', i);
		const otp = getStringParameter.call(this, 'accountOtp', i);
		const response = await asSession('PUT', '/account/mfa/challenges', {
			body: { challengeId, otp },
		});
		return toItems(response, i);
	}

	if (operation === 'completePhoneVerification') {
		const response = await asGuest('PUT', '/account/verifications/phone', {
			body: { userId: userId(), secret: secret() },
		});
		return toItems(response, i);
	}

	if (operation === 'completeRecovery') {
		const path = byCode() ? '/account/recovery/otp' : '/account/recovery';
		const password = getStringParameter.call(this, 'password', i);
		const response = await withApiKey('PUT', path, {
			body: { userId: userId(), secret: secret(), password },
		});
		return toItems(response, i);
	}

	if (operation === 'create') {
		const options = getCollectionParameter.call(this, 'options', i) as { name?: string };
		const response = await withApiKey('POST', '/account', {
			body: {
				userId: resolveId(getStringParameter.call(this, 'userId', i, '')),
				email: getStringParameter.call(this, 'email', i),
				password: getStringParameter.call(this, 'password', i),
				name: options.name || undefined,
			},
		});
		return toItems(response, i);
	}

	if (operation === 'createAnonymousSession') {
		const response = await withApiKey('POST', '/account/sessions/anonymous');
		return toItems(response, i);
	}

	if (operation === 'createEmailPasswordSession') {
		const response = await withApiKey('POST', '/account/sessions/email', {
			body: {
				email: getStringParameter.call(this, 'email', i),
				password: getStringParameter.call(this, 'password', i),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'createEmailToken') {
		const response = await withApiKey('POST', '/account/tokens/email', {
			body: {
				userId: resolveId(getStringParameter.call(this, 'userId', i, '')),
				email: getStringParameter.call(this, 'email', i),
				phrase: phraseOption(),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'createEmailVerification') {
		const response = byCode()
			? await asUser('POST', '/account/verifications/email/otp', {
					body: { phrase: phraseOption() },
				})
			: await asUser('POST', '/account/verifications/email', {
					body: { url: getStringParameter.call(this, 'url', i) },
				});
		return toItems(response, i);
	}

	if (operation === 'createIdTokenSession') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			accessToken?: string;
			accessTokenExpiry?: number;
			name?: string;
			nonce?: string;
		};
		const request: RequestOptions = {
			body: {
				provider: getStringParameter.call(this, 'accountIdTokenProvider', i),
				idToken: getStringParameter.call(this, 'accountIdToken', i),
				nonce: options.nonce || undefined,
				accessToken: options.accessToken || undefined,
				accessTokenExpiry: options.accessTokenExpiry,
				name: options.name || undefined,
			},
		};
		// As a signed-in user, the identity is linked to that user's account.
		const response =
			getStringParameter.call(this, 'accountAuthentication', i) === 'apiKey'
				? await withApiKey('POST', '/account/sessions/id-token', request)
				: await asUser('POST', '/account/sessions/id-token', request);
		return toItems(response, i);
	}

	if (operation === 'createMagicUrlToken') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			phrase?: boolean;
			url?: string;
		};
		const response = await withApiKey('POST', '/account/tokens/magic-url', {
			body: {
				userId: resolveId(getStringParameter.call(this, 'userId', i, '')),
				email: getStringParameter.call(this, 'email', i),
				url: options.url || undefined,
				phrase: options.phrase,
			},
		});
		return toItems(response, i);
	}

	if (operation === 'createMfaAuthenticator') {
		const response = await asUser('POST', TOTP_PATH);
		return toItems(response, i);
	}

	if (operation === 'createMfaChallenge') {
		const factor = getStringParameter.call(this, 'accountMfaFactor', i);
		const response = await asUser('POST', '/account/mfa/challenges', { body: { factor } });
		return toItems(response, i);
	}

	if (operation === 'createMfaRecoveryCodes') {
		const response = await asUser('POST', '/account/mfa/recovery-codes');
		return toItems(response, i);
	}

	if (operation === 'createPhoneToken') {
		const response = await withApiKey('POST', '/account/tokens/phone', {
			body: {
				userId: resolveId(getStringParameter.call(this, 'userId', i, '')),
				phone: getStringParameter.call(this, 'phone', i),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'createPhoneVerification') {
		const response = await asUser('POST', '/account/verifications/phone');
		return toItems(response, i);
	}

	if (operation === 'createRecovery') {
		const email = getStringParameter.call(this, 'email', i);
		const response = byCode()
			? await withApiKey('POST', '/account/recovery/otp', {
					body: { email, phrase: phraseOption() },
				})
			: await withApiKey('POST', '/account/recovery', {
					body: { email, url: getStringParameter.call(this, 'url', i) },
				});
		return toItems(response, i);
	}

	if (operation === 'createSession') {
		const response = await withApiKey('POST', '/account/sessions/token', {
			body: { userId: userId(), secret: secret() },
		});
		return toItems(response, i);
	}

	if (operation === 'deleteConsent') {
		const id = consentId();
		await asUser('DELETE', consentPath(id));
		return toItems({ deleted: true, consentId: id }, i);
	}

	if (operation === 'deleteConsentToken') {
		const id = consentId();
		const tokenId = consentTokenId();
		await asUser('DELETE', consentTokenPath(id, tokenId));
		return toItems({ deleted: true, consentId: id, tokenId }, i);
	}

	if (operation === 'deleteIdentity') {
		const identityId = requiredId('identityId', 'Identity ID');
		await asUser('DELETE', `/account/identities/${encodeURIComponent(identityId)}`);
		return toItems({ deleted: true, identityId }, i);
	}

	if (operation === 'deleteMfaAuthenticator') {
		await asUser('DELETE', TOTP_PATH);
		return toItems({ deleted: true, type: 'totp' }, i);
	}

	if (operation === 'deleteSession') {
		const id = sessionId();
		await asUser('DELETE', sessionPath(id));
		return toItems({ deleted: true, sessionId: id }, i);
	}

	if (operation === 'deleteSessions') {
		await asUser('DELETE', '/account/sessions');
		return toItems({ deleted: true }, i);
	}

	if (operation === 'get') {
		const response = await asUser('GET', '/account');
		return toItems(simplified(response, USER_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getConsent') {
		const response = await asUser('GET', consentPath(consentId()));
		return toItems(response, i);
	}

	if (operation === 'getConsentToken') {
		const response = await asUser('GET', consentTokenPath(consentId(), consentTokenId()));
		return toItems(simplified(response, CONSENT_TOKEN_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManyConsents') {
		return toItems(await getMany('/account/consents', 'consents'), i);
	}

	if (operation === 'getManyConsentTokens') {
		const tokens = await getMany(`${consentPath(consentId())}/tokens`, 'tokens');
		return toItems(simplified(tokens, CONSENT_TOKEN_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManyIdentities') {
		const identities = await getMany('/account/identities', 'identities');
		return toItems(simplified(identities, IDENTITY_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManySessions') {
		const response = await asUser('GET', '/account/sessions');
		const sessions = (response.sessions as IDataObject[] | undefined) ?? [];
		return toItems(simplified(sessions, SESSION_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getMfaFactors') {
		const response = await asUser('GET', '/account/mfa/factors');
		return toItems(response, i);
	}

	if (operation === 'getMfaRecoveryCodes') {
		const response = await asUser('GET', '/account/mfa/recovery-codes');
		return toItems(response, i);
	}

	if (operation === 'getOAuth2LoginUrl') {
		// Appwrite answers this endpoint with a redirect to the provider's
		// sign-in page, which only the user's browser can follow. So the node
		// builds the URL for the browser to open, exactly as Appwrite's web SDK
		// does; a browser cannot send the project header, so the project ID
		// goes in the query string.
		const provider = String(this.getNodeParameter('oauth2Provider', i) ?? '');
		const options = getCollectionParameter.call(this, 'options', i) as {
			accountFailureUrl?: unknown;
			accountProviderScopes?: unknown;
		};
		const optional = (value: unknown): string | undefined =>
			String(value ?? '').trim() || undefined;
		const scopes = parseStringList.call(this, options.accountProviderScopes, 'Scopes', i);
		const { baseUrl, projectId } = await getProject.call(this);
		const url = browserUrl(baseUrl, `/account/tokens/oauth2/${encodeURIComponent(provider)}`, {
			success: optional(this.getNodeParameter('accountSuccessUrl', i, '')),
			failure: optional(options.accountFailureUrl),
			scopes: scopes.length > 0 ? scopes : undefined,
			project: projectId,
		});
		return toItems({ url }, i);
	}

	if (operation === 'getPrefs') {
		const response = await asUser('GET', '/account/prefs');
		return toItems(response, i);
	}

	if (operation === 'getSession') {
		const response = await asUser('GET', sessionPath(sessionId()));
		return toItems(simplified(response, SESSION_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'regenerateMfaRecoveryCodes') {
		const response = await asUser('PATCH', '/account/mfa/recovery-codes');
		return toItems(response, i);
	}

	if (operation === 'updateEmail') {
		const response = await asUser('PATCH', '/account/email', {
			body: {
				email: getStringParameter.call(this, 'email', i),
				password: getStringParameter.call(this, 'password', i),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'updateMfa') {
		const mfa = this.getNodeParameter('accountMfa', i, true) as boolean;
		const response = await asSession('PATCH', '/account/mfa', { body: { mfa } });
		return toItems(response, i);
	}

	if (operation === 'updateName') {
		const name = getStringParameter.call(this, 'name', i);
		const response = await asUser('PATCH', '/account/name', { body: { name } });
		return toItems(response, i);
	}

	if (operation === 'updatePassword') {
		const options = getCollectionParameter.call(this, 'options', i) as { oldPassword?: string };
		const response = await asUser('PATCH', '/account/password', {
			body: {
				password: getStringParameter.call(this, 'password', i),
				oldPassword: options.oldPassword || undefined,
			},
		});
		return toItems(response, i);
	}

	if (operation === 'updatePhone') {
		const response = await asUser('PATCH', '/account/phone', {
			body: {
				phone: getStringParameter.call(this, 'phone', i),
				password: getStringParameter.call(this, 'password', i),
			},
		});
		return toItems(response, i);
	}

	if (operation === 'updatePrefs') {
		const prefs = parseJsonParameter.call(
			this,
			this.getNodeParameter('prefs', i),
			'Preferences',
			i,
		);
		const response = await asUser('PATCH', '/account/prefs', { body: { prefs } });
		return toItems(response, i);
	}

	if (operation === 'updateSession') {
		const response = await asUser('PATCH', sessionPath(sessionId()));
		return toItems(response, i);
	}

	if (operation === 'updateStatus') {
		const response = await asUser('PATCH', '/account/status');
		return toItems(response, i);
	}

	if (operation === 'verifyMfaAuthenticator') {
		const otp = getStringParameter.call(this, 'accountOtp', i);
		const response = await asSession('PUT', TOTP_PATH, { body: { otp } });
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown account operation "${operation}"`, {
		itemIndex: i,
	});
}
