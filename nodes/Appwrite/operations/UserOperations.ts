import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	fetchAllPagesByOffset,
	getStringListParameter,
	parseJsonParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeUserOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const userId = this.getNodeParameter('userId', i, '') as string;
	const userPath = `/users/${encodeURIComponent(userId)}`;

	if (operation === 'create') {
		const createUserId = resolveId(userId);
		const options = this.getNodeParameter('options', i, {}) as {
			email?: string;
			name?: string;
			password?: string;
			phone?: string;
		};
		const response = (await appwriteApiRequest.call(
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
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'createJWT') {
		const options = this.getNodeParameter('options', i, {}) as {
			duration?: number;
			sessionId?: string;
		};
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath}/jwts`,
			{ body: { sessionId: options.sessionId || undefined, duration: options.duration ?? 900 } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'createSession') {
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath}/sessions`,
			{},
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'createToken') {
		const options = this.getNodeParameter('options', i, {}) as {
			expire?: number;
			length?: number;
		};
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath}/tokens`,
			{ body: { length: options.length ?? 6, expire: options.expire ?? 900 } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(this, 'DELETE', userPath, {}, i);
		return toItems({ success: true, userId }, i);
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
		return toItems({ success: true, identityId }, i);
	}

	if (operation === 'deleteSession') {
		const sessionId = this.getNodeParameter('sessionId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${userPath}/sessions/${encodeURIComponent(sessionId)}`,
			{},
			i,
		);
		return toItems({ success: true, userId, sessionId }, i);
	}

	if (operation === 'deleteSessions') {
		await appwriteApiRequest.call(this, 'DELETE', `${userPath}/sessions`, {}, i);
		return toItems({ success: true, userId }, i);
	}

	if (operation === 'get') {
		const response = (await appwriteApiRequest.call(this, 'GET', userPath, {}, i)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					(await appwriteApiRequest.call(
						this,
						'GET',
						'/users',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					)) as IDataObject,
				'users',
			);
			return toItems(result as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			'/users',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.users as IDataObject[], i);
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
					(await appwriteApiRequest.call(
						this,
						'GET',
						'/users/identities',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					)) as IDataObject,
				'identities',
			);
			return toItems(result as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			'/users/identities',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.identities as IDataObject[], i);
	}

	if (operation === 'getManyLogs') {
		// Log entries have no ID, so cursor pagination cannot be used here.
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const logs = await fetchAllPagesByOffset.call(
				this,
				queries,
				async (pageQueries) =>
					(await appwriteApiRequest.call(
						this,
						'GET',
						`${userPath}/logs`,
						{ qs: { queries: pageQueries } },
						i,
					)) as IDataObject,
				'logs',
			);
			return toItems(logs as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/logs`,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		)) as IDataObject;
		return toItems(response.logs as IDataObject[], i);
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
					(await appwriteApiRequest.call(
						this,
						'GET',
						`${userPath}/memberships`,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					)) as IDataObject,
				'memberships',
			);
			return toItems(result as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/memberships`,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.memberships as IDataObject[], i);
	}

	if (operation === 'getManySessions') {
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/sessions`,
			{},
			i,
		)) as IDataObject;
		return toItems(response.sessions as IDataObject[], i);
	}

	if (operation === 'getPrefs') {
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/prefs`,
			{},
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updateEmail') {
		const email = this.getNodeParameter('email', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/email`,
			{ body: { email } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updateEmailVerification') {
		const emailVerification = this.getNodeParameter('emailVerification', i, true) as boolean;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/verification`,
			{ body: { emailVerification } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updateLabels') {
		const labels = getStringListParameter.call(this, 'labels', i);
		const response = (await appwriteApiRequest.call(
			this,
			'PUT',
			`${userPath}/labels`,
			{ body: { labels } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updateName') {
		const name = this.getNodeParameter('name', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/name`,
			{ body: { name } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updatePassword') {
		const password = this.getNodeParameter('password', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/password`,
			{ body: { password } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updatePhone') {
		const phone = this.getNodeParameter('phone', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/phone`,
			{ body: { number: phone } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updatePhoneVerification') {
		const phoneVerification = this.getNodeParameter('phoneVerification', i, true) as boolean;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/verification/phone`,
			{ body: { phoneVerification } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updatePrefs') {
		const prefs = parseJsonParameter.call(this, this.getNodeParameter('prefs', i), 'prefs', i);
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/prefs`,
			{ body: { prefs } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	if (operation === 'updateStatus') {
		const status = this.getNodeParameter('status', i, true) as boolean;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/status`,
			{ body: { status } },
			i,
		)) as IDataObject;
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown user operation "${operation}"`, {
		itemIndex: i,
	});
}
