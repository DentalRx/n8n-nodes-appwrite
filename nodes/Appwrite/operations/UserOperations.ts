import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	fetchAllPagesByOffset,
	parseJsonArrayParameter,
	parseJsonParameter,
} from '../GenericFunctions';
import { Query, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeUserOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const userId = this.getNodeParameter('userId', i, '') as string;
	const userPath = `/users/${encodeURIComponent(userId)}`;

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	const parseList = (name: string): string[] => {
		const raw = this.getNodeParameter(name, i, '') as string;
		if (raw.trim() === '') return [];
		if (raw.trim().startsWith('[')) {
			return parseJsonArrayParameter.call(this, raw, name, i).map((e) => String(e));
		}
		return raw
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e !== '');
	};

	if (operation === 'create') {
		const createUserId = resolveId(userId);
		const email = this.getNodeParameter('email', i, '') as string;
		const phone = this.getNodeParameter('phone', i, '') as string;
		const password = this.getNodeParameter('password', i, '') as string;
		const name = this.getNodeParameter('name', i, '') as string;
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			'/users',
			{
				body: {
					userId: createUserId,
					email: email === '' ? undefined : email,
					phone: phone === '' ? undefined : phone,
					password: password === '' ? undefined : password,
					name: name === '' ? undefined : name,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'createJWT') {
		const sessionId = this.getNodeParameter('sessionId', i, '') as string;
		const duration = this.getNodeParameter('duration', i, 900) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath}/jwts`,
			{ body: { sessionId: sessionId === '' ? undefined : sessionId, duration } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'createSession') {
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath}/sessions`,
			{},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'createToken') {
		const length = this.getNodeParameter('length', i, 6) as number;
		const expire = this.getNodeParameter('expire', i, 900) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'POST',
			`${userPath}/tokens`,
			{ body: { length, expire } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(this, 'DELETE', userPath, {}, i);
		return toItems({ success: true, userId });
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
		return toItems({ success: true, identityId });
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
		return toItems({ success: true, userId, sessionId });
	}

	if (operation === 'deleteSessions') {
		await appwriteApiRequest.call(this, 'DELETE', `${userPath}/sessions`, {}, i);
		return toItems({ success: true, userId });
	}

	if (operation === 'get') {
		const response = (await appwriteApiRequest.call(this, 'GET', userPath, {}, i)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages(
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
			return toItems(result as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			'/users',
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.users as IDataObject[]);
	}

	if (operation === 'getManyIdentities') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages(
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
			return toItems(result as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			'/users/identities',
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.identities as IDataObject[]);
	}

	if (operation === 'getManyLogs') {
		// Log entries have no ID, so cursor pagination cannot be used here.
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const logs = await fetchAllPagesByOffset(
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
			return toItems(logs as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/logs`,
			{ qs: { queries: [...queries, Query.limit(limit)] } },
			i,
		)) as IDataObject;
		return toItems(response.logs as IDataObject[]);
	}

	if (operation === 'getManyMemberships') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages(
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
			return toItems(result as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/memberships`,
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.memberships as IDataObject[]);
	}

	if (operation === 'getManySessions') {
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/sessions`,
			{},
			i,
		)) as IDataObject;
		return toItems(response.sessions as IDataObject[]);
	}

	if (operation === 'getPrefs') {
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${userPath}/prefs`,
			{},
			i,
		)) as IDataObject;
		return toItems(response);
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
		return toItems(response);
	}

	if (operation === 'updateEmailVerification') {
		const emailVerification = this.getNodeParameter('emailVerification', i, false) as boolean;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/verification`,
			{ body: { emailVerification } },
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'updateLabels') {
		const labels = parseList('labels');
		const response = (await appwriteApiRequest.call(
			this,
			'PUT',
			`${userPath}/labels`,
			{ body: { labels } },
			i,
		)) as IDataObject;
		return toItems(response);
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
		return toItems(response);
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
		return toItems(response);
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
		return toItems(response);
	}

	if (operation === 'updatePhoneVerification') {
		const phoneVerification = this.getNodeParameter('phoneVerification', i, false) as boolean;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${userPath}/verification/phone`,
			{ body: { phoneVerification } },
			i,
		)) as IDataObject;
		return toItems(response);
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
		return toItems(response);
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
		return toItems(response);
	}

	throw new NodeOperationError(this.getNode(), `Unknown user operation "${operation}"`, {
		itemIndex: i,
	});
}
