import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getCollectionParameter,
	parseJsonArrayParameter,
	parseStringList,
	simplifyItems,
	toItems,
} from '../GenericFunctions';
import { appwriteApiRequest, appwriteUserRequest, browserUrl, getProject } from '../transport';
import { getUserAuthentication } from './AccountOperations';

/** The grant fields a consent page shows, for the Simplify toggle. */
const GRANT_SIMPLIFY_FIELDS = [
	'$id',
	'userId',
	'appId',
	'scopes',
	'resources',
	'authorizationDetails',
	'prompt',
	'redirectUri',
	'authTime',
	'expire',
];

/**
 * Appwrite answers the authorize, approve, and reject endpoints with a
 * redirect unless the caller asks for JSON, which then carries the redirect
 * URL. n8n asks for JSON by default; the consent operations rely on it, so
 * they ask explicitly.
 */
const JSON_ANSWER: IDataObject = { accept: 'application/json' };

interface AuthorizationOptions {
	authorizationDetails?: unknown;
	nonce?: unknown;
	oauth2CodeChallenge?: unknown;
	oauth2CodeChallengeMethod?: unknown;
	oauth2MaxAge?: number;
	oauth2Prompt?: unknown;
	oauth2Resource?: unknown;
	oauth2Scopes?: unknown;
	oauth2State?: unknown;
}

/** A text value, or undefined when it is empty. Expressions may yield numbers. */
function optionalText(value: unknown): string | undefined {
	const text = value === undefined || value === null ? '' : String(value).trim();
	return text === '' ? undefined : text;
}

export async function executeOAuth2ServerOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// The endpoints take the project in the path, since a browser opening the
	// authorization URL cannot send the project header. It is the credential's
	// project, as in the Appwrite SDKs.
	const { baseUrl, projectId } = await getProject.call(this);
	const oauth2Path = (endpoint: string): string =>
		`/oauth2/${encodeURIComponent(projectId)}/${endpoint}`;

	const text = (name: string): string => String(this.getNodeParameter(name, i, '') ?? '').trim();

	const required = (name: string, label: string, description: string): string => {
		const value = text(name);
		if (value === '') {
			throw new NodeOperationError(this.getNode(), `The '${label}' parameter is empty`, {
				description,
				itemIndex: i,
			});
		}
		return value;
	};

	// The app is read as entered: besides app IDs, the ID mode takes the URL of
	// a client metadata document, which an ID lookup in a Console URL would cut.
	const clientId = (): string => {
		const value = this.getNodeParameter('appId', i, '', { extractValue: true });
		const id = optionalText(
			value !== null && typeof value === 'object' && 'value' in value
				? (value as { value: unknown }).value
				: value,
		);
		if (id === undefined) {
			throw new NodeOperationError(this.getNode(), "The 'App' parameter is empty", {
				description:
					'Choose an app from the list, or enter its ID or the URL of its client metadata document.',
				itemIndex: i,
			});
		}
		return id;
	};

	// A confidential app proves itself with its secret; a public app has none.
	const clientSecret = (): string | undefined =>
		this.getNodeParameter('appClientType', i) === 'confidential'
			? required(
					'oauth2ClientSecret',
					'Client Secret',
					"Enter a secret of the app, or choose the Public client type if the app has none. The App resource's Create Secret operation creates one.",
				)
			: undefined;

	const grantId = (): string =>
		required(
			'oauth2GrantId',
			'Grant ID',
			'Enter the ID of the grant, e.g. from Start Authorization or the grant_id query parameter of your consent page.',
		);

	// OAuth2 writes scopes space-separated; commas and JSON arrays work too.
	const scope = (raw: unknown): string | undefined => {
		const scopes = parseStringList
			.call(this, raw, 'Scopes', i)
			.flatMap((entry) => entry.split(/\s+/))
			.filter((entry) => entry !== '');
		return scopes.length > 0 ? scopes.join(' ') : undefined;
	};

	const resource = (raw: unknown): string[] | undefined => {
		const resources = parseStringList.call(this, raw, 'Resource', i);
		return resources.length > 0 ? resources : undefined;
	};

	// Appwrite takes the details as a JSON-encoded string.
	const authorizationDetails = (raw: unknown): string | undefined => {
		const details = parseJsonArrayParameter.call(this, raw, 'Authorization Details', i);
		return details.length > 0 ? JSON.stringify(details) : undefined;
	};

	// An authorization request as its parameters, or as the request URI of a
	// pushed request, which Appwrite accepts with the client ID only.
	const authorizationRequest = (pushable: boolean): IDataObject => {
		if (pushable && this.getNodeParameter('oauth2RequestMode', i) === 'pushed') {
			return {
				client_id: clientId(),
				request_uri: required(
					'oauth2RequestUri',
					'Request URI',
					'Enter the request_uri returned by Create Pushed Authorization Request.',
				),
			};
		}
		const options = getCollectionParameter.call(this, 'options', i) as AuthorizationOptions;
		const codeChallenge = optionalText(options.oauth2CodeChallenge);
		const prompt = Array.isArray(options.oauth2Prompt)
			? options.oauth2Prompt.join(' ')
			: options.oauth2Prompt;
		return {
			client_id: clientId(),
			redirect_uri: text('oauth2RedirectUri'),
			response_type: text('oauth2ResponseType'),
			scope: scope(options.oauth2Scopes),
			state: optionalText(options.oauth2State),
			nonce: optionalText(options.nonce),
			code_challenge: codeChallenge,
			code_challenge_method:
				codeChallenge === undefined
					? undefined
					: (optionalText(options.oauth2CodeChallengeMethod) ?? 'S256'),
			prompt: optionalText(prompt),
			max_age: options.oauth2MaxAge,
			authorization_details: authorizationDetails(options.authorizationDetails),
			resource: resource(options.oauth2Resource),
		};
	};

	// Requests of the app, which proves itself with its ID and secret rather
	// than with the API key: the routes' scope is public, which Appwrite grants
	// to guests and users but to no API key.
	const asClient = async (endpoint: string, body: IDataObject): Promise<IDataObject> =>
		await appwriteUserRequest.call(
			this,
			'POST',
			oauth2Path(endpoint),
			{ type: 'guest' },
			{ body },
			i,
		);

	// Requests of a consent page: the consent is the signed-in user's own.
	const asUser = async (endpoint: string, body: IDataObject): Promise<IDataObject> =>
		await appwriteUserRequest.call(
			this,
			'POST',
			oauth2Path(endpoint),
			getUserAuthentication.call(this, i),
			{ body, headers: JSON_ANSWER },
			i,
		);

	if (operation === 'approveAuthorization') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			authorizationDetails?: unknown;
			oauth2Scopes?: unknown;
		};
		const response = await asUser('approve', {
			grant_id: grantId(),
			authorization_details: authorizationDetails(options.authorizationDetails),
			scope: scope(options.oauth2Scopes),
		});
		return toItems(response, i);
	}

	if (operation === 'createDeviceAuthorization') {
		const options = getCollectionParameter.call(this, 'options', i) as AuthorizationOptions;
		const response = await asClient('device_authorization', {
			client_id: clientId(),
			scope: scope(options.oauth2Scopes),
			authorization_details: authorizationDetails(options.authorizationDetails),
			resource: resource(options.oauth2Resource),
		});
		return toItems(response, i);
	}

	if (operation === 'createDeviceGrant') {
		const response = await asUser('grants', {
			user_code: required(
				'oauth2UserCode',
				'User Code',
				'Enter the code the user typed in, as shown on their device.',
			),
		});
		return toItems(response, i);
	}

	if (operation === 'createPushedAuthorizationRequest') {
		const response = await asClient('par', authorizationRequest(false));
		return toItems(response, i);
	}

	if (operation === 'createToken') {
		const grantType = String(this.getNodeParameter('oauth2GrantType', i));
		const options = getCollectionParameter.call(this, 'options', i) as {
			oauth2CodeVerifier?: unknown;
			oauth2Resource?: unknown;
		};
		const body: IDataObject = {
			grant_type: grantType,
			client_id: clientId(),
			client_secret: clientSecret(),
			resource: resource(options.oauth2Resource),
		};
		if (grantType === 'authorization_code') {
			body.code = text('oauth2Code');
			body.redirect_uri = text('oauth2RedirectUri');
			// Public apps always use PKCE, so their verifier is required; for a
			// confidential app it is an option.
			body.code_verifier =
				this.getNodeParameter('appClientType', i) === 'public'
					? text('oauth2CodeVerifier')
					: optionalText(options.oauth2CodeVerifier);
		} else if (grantType === 'refresh_token') {
			body.refresh_token = text('oauth2RefreshToken');
		} else {
			body.device_code = text('oauth2DeviceCode');
		}
		const response = await asClient('token', body);
		return toItems(response, i);
	}

	if (operation === 'getAuthorizationUrl') {
		// The authorization starts in the user's browser: without a session
		// there, Appwrite redirects it to the project's consent page. n8n cannot
		// follow that redirect for the user, so it only builds the URL.
		const url = browserUrl(baseUrl, oauth2Path('authorize'), authorizationRequest(true));
		return toItems({ url }, i);
	}

	if (operation === 'getGrant') {
		// Appwrite lets a grant be read by its user or with an API key.
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			oauth2Path(`grants/${encodeURIComponent(grantId())}`),
			{},
			i,
		);
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		return toItems(simplify ? simplifyItems(response, GRANT_SIMPLIFY_FIELDS) : response, i);
	}

	if (operation === 'rejectAuthorization') {
		const response = await asUser('reject', { grant_id: grantId() });
		return toItems(response, i);
	}

	if (operation === 'revokeToken') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			oauth2TokenTypeHint?: unknown;
		};
		// The answer carries nothing: OAuth2 revocation succeeds alike whether
		// or not the token was still valid (RFC 7009).
		await asClient('revoke', {
			token: required('oauth2Token', 'Token', 'Enter the access or refresh token to revoke.'),
			token_type_hint: optionalText(options.oauth2TokenTypeHint),
			client_id: clientId(),
			client_secret: clientSecret(),
		});
		return toItems({ revoked: true }, i);
	}

	if (operation === 'startAuthorization') {
		const response = await asUser('authorize', authorizationRequest(true));
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown OAuth2 server operation "${operation}"`, {
		itemIndex: i,
	});
}
