import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	getStringListParameter,
	lookupEnum,
	parseJsonParameter,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The endpoint that imports users whose passwords were hashed with each algorithm. */
const PASSWORD_HASH_PATHS: Record<string, string> = {
	argon2: '/users/argon2',
	bcrypt: '/users/bcrypt',
	md5: '/users/md5',
	phpass: '/users/phpass',
	scrypt: '/users/scrypt',
	scryptModified: '/users/scrypt-modified',
	sha: '/users/sha',
};

/** The user-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'email',
	'phone',
	'status',
	'emailVerification',
	'phoneVerification',
	'labels',
	'registration',
	'accessedAt',
];

export async function executeUserOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: create and the list operations act on no existing user.
	const userId = (): string => getResourceId.call(this, 'userId', i, 'user', 'User');
	const userPath = (): string => `/users/${encodeURIComponent(userId())}`;
	const targetId = (): string => this.getNodeParameter('targetId', i) as string;
	const targetPath = (): string => `${userPath()}/targets/${encodeURIComponent(targetId())}`;

	if (operation === 'create') {
		const createUserId = resolveId(this.getNodeParameter('userId', i, '') as string);
		const options = this.getNodeParameter('options', i, {}) as {
			email?: string;
			name?: string;
			password?: string;
			phone?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/users',
			{
				body: {
					userId: createUserId,
					email: options.email || undefined,
					phone: options.phone || undefined,
					password: options.password || undefined,
					name: options.name || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createJWT') {
		const options = this.getNodeParameter('options', i, {}) as {
			duration?: number;
			sessionId?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath()}/jwts`,
			{ body: { sessionId: options.sessionId || undefined, duration: options.duration ?? 900 } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createMfaRecoveryCodes') {
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/mfa/recovery-codes`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createSession') {
		const response = await appwriteApiRequest.call(this, 'POST', `${userPath()}/sessions`, {}, i);
		return toItems(response, i);
	}

	if (operation === 'createTarget') {
		const options = this.getNodeParameter('options', i, {}) as {
			name?: string;
			providerId?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath()}/targets`,
			{
				body: {
					targetId: resolveId(this.getNodeParameter('targetId', i, '') as string),
					providerType: this.getNodeParameter('targetProviderType', i) as string,
					identifier: this.getNodeParameter('targetIdentifier', i) as string,
					providerId: options.providerId || undefined,
					name: options.name || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createToken') {
		const options = this.getNodeParameter('options', i, {}) as {
			expire?: number;
			length?: number;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath()}/tokens`,
			{ body: { length: options.length ?? 6, expire: options.expire ?? 900 } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createWithPasswordHash') {
		const algorithm = this.getNodeParameter('passwordHashAlgorithm', i) as string;
		const path = lookupEnum(this, PASSWORD_HASH_PATHS, algorithm, 'hash algorithm', i);
		const { name } = this.getNodeParameter('options', i, {}) as { name?: string };
		const body: IDataObject = {
			userId: resolveId(this.getNodeParameter('userId', i, '') as string),
			email: this.getNodeParameter('email', i) as string,
			password: this.getNodeParameter('passwordHash', i) as string,
			name: name || undefined,
		};

		// Each algorithm's endpoint takes its own hashing parameters; the others
		// are hidden in the UI and must not be read.
		if (algorithm === 'scrypt') {
			body.passwordSalt = this.getNodeParameter('passwordSalt', i) as string;
			body.passwordCpu = this.getNodeParameter('passwordCpu', i) as number;
			body.passwordMemory = this.getNodeParameter('passwordMemory', i) as number;
			body.passwordParallel = this.getNodeParameter('passwordParallel', i) as number;
			body.passwordLength = this.getNodeParameter('passwordLength', i) as number;
		} else if (algorithm === 'scryptModified') {
			body.passwordSalt = this.getNodeParameter('passwordSalt', i) as string;
			body.passwordSaltSeparator = this.getNodeParameter('passwordSaltSeparator', i) as string;
			body.passwordSignerKey = this.getNodeParameter('passwordSignerKey', i) as string;
		} else if (algorithm === 'sha') {
			body.passwordVersion = this.getNodeParameter('passwordVersion', i) as string;
		}

		const response = await appwriteApiRequest.call(this, 'POST', path, { body }, i);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(this, 'DELETE', userPath(), {}, i);
		return toItems({ deleted: true, userId: userId() }, i);
	}

	if (operation === 'deleteIdentity') {
		const identityId = this.getNodeParameter('identityId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/users/identities/${encodeURIComponent(identityId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, identityId }, i);
	}

	if (operation === 'deleteMfaAuthenticator') {
		// An authenticator app (TOTP) is the only authenticator type Appwrite has.
		await appwriteApiRequest.call(this, 'DELETE', `${userPath()}/mfa/authenticators/totp`, {}, i);
		return toItems({ deleted: true, userId: userId() }, i);
	}

	if (operation === 'deleteSession') {
		const sessionId = this.getNodeParameter('sessionId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${userPath()}/sessions/${encodeURIComponent(sessionId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, userId: userId(), sessionId }, i);
	}

	if (operation === 'deleteSessions') {
		await appwriteApiRequest.call(this, 'DELETE', `${userPath()}/sessions`, {}, i);
		return toItems({ deleted: true, userId: userId() }, i);
	}

	if (operation === 'deleteTarget') {
		await appwriteApiRequest.call(this, 'DELETE', targetPath(), {}, i);
		return toItems({ deleted: true, userId: userId(), targetId: targetId() }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', userPath(), {}, i);
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		return toItems(simplify ? simplifyItems(response, SIMPLIFY_FIELDS) : response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		const project = (users: IDataObject[]) =>
			simplify ? (simplifyItems(users, SIMPLIFY_FIELDS) as IDataObject[]) : users;

		if (returnAll) {
			const result = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/users',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'users',
				i,
			);
			return toItems(project(result as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/users',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(project(response.users as IDataObject[]), i);
	}

	if (operation === 'getManyIdentities') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/users/identities',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'identities',
				i,
			);
			return toItems(result as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/users/identities',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.identities as IDataObject[], i);
	}

	if (operation === 'getManyMemberships') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						`${userPath()}/memberships`,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'memberships',
				i,
			);
			return toItems(result as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath()}/memberships`,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.memberships as IDataObject[], i);
	}

	if (operation === 'getManySessions') {
		const response = await appwriteApiRequest.call(this, 'GET', `${userPath()}/sessions`, {}, i);
		return toItems(response.sessions as IDataObject[], i);
	}

	if (operation === 'getManyTargets') {
		const path = `${userPath()}/targets`;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const targets = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(this, 'GET', path, { qs: { queries: pageQueries } }, i),
				'targets',
				i,
			);
			return toItems(targets as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.targets as IDataObject[], i);
	}

	if (operation === 'getMfaChallenge') {
		const challengeId = this.getNodeParameter('mfaChallengeId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath()}/mfa/challenges/${encodeURIComponent(challengeId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMfaFactors') {
		const response = await appwriteApiRequest.call(this, 'GET', `${userPath()}/mfa/factors`, {}, i);
		return toItems(response, i);
	}

	if (operation === 'getMfaRecoveryCodes') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath()}/mfa/recovery-codes`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getPrefs') {
		const response = await appwriteApiRequest.call(this, 'GET', `${userPath()}/prefs`, {}, i);
		return toItems(response, i);
	}

	if (operation === 'getTarget') {
		const response = await appwriteApiRequest.call(this, 'GET', targetPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'regenerateMfaRecoveryCodes') {
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${userPath()}/mfa/recovery-codes`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateEmail') {
		const email = this.getNodeParameter('email', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/email`,
			{ body: { email } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateEmailVerification') {
		const emailVerification = this.getNodeParameter('emailVerification', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/verification`,
			{ body: { emailVerification } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateImpersonator') {
		const impersonator = this.getNodeParameter('impersonator', i, false) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/impersonator`,
			{ body: { impersonator } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateLabels') {
		const labels = getStringListParameter.call(this, 'labels', i, 'Labels');
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${userPath()}/labels`,
			{ body: { labels } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateMfa') {
		const mfa = this.getNodeParameter('mfa', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/mfa`,
			{ body: { mfa } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateName') {
		const name = this.getNodeParameter('name', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/name`,
			{ body: { name } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updatePassword') {
		const password = this.getNodeParameter('password', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/password`,
			{ body: { password } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updatePhone') {
		const phone = this.getNodeParameter('phone', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/phone`,
			{ body: { number: phone } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updatePhoneVerification') {
		const phoneVerification = this.getNodeParameter('phoneVerification', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/verification/phone`,
			{ body: { phoneVerification } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updatePrefs') {
		const prefs = parseJsonParameter.call(
			this,
			this.getNodeParameter('prefs', i),
			'Preferences',
			i,
		);
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/prefs`,
			{ body: { prefs } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateStatus') {
		const status = this.getNodeParameter('status', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath()}/status`,
			{ body: { status } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateTarget') {
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			name?: string;
			providerId?: string;
			targetIdentifier?: string;
		};
		// Appwrite leaves a field unchanged when it is sent empty, so an update
		// needs no read of the current target.
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			targetPath(),
			{
				body: {
					identifier: updateFields.targetIdentifier || undefined,
					providerId: updateFields.providerId || undefined,
					name: updateFields.name || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown user operation "${operation}"`, {
		itemIndex: i,
	});
}
