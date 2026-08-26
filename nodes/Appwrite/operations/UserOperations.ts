import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ID, Query, type Users } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	parseJsonArrayParameter,
	parseJsonParameter,
} from '../GenericFunctions';

export async function executeUserOperation(
	this: IExecuteFunctions,
	users: Users,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const userId = this.getNodeParameter('userId', i, '') as string;

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
		const createUserId = userId === '' || userId === 'unique()' ? ID.unique() : userId;
		const email = this.getNodeParameter('email', i, '') as string;
		const phone = this.getNodeParameter('phone', i, '') as string;
		const password = this.getNodeParameter('password', i, '') as string;
		const name = this.getNodeParameter('name', i, '') as string;
		const response = await users.create({
			userId: createUserId,
			email: email === '' ? undefined : email,
			phone: phone === '' ? undefined : phone,
			password: password === '' ? undefined : password,
			name: name === '' ? undefined : name,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'createJWT') {
		const sessionId = this.getNodeParameter('sessionId', i, '') as string;
		const duration = this.getNodeParameter('duration', i, 900) as number;
		const response = await users.createJWT({
			userId,
			sessionId: sessionId === '' ? undefined : sessionId,
			duration,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'createSession') {
		const response = await users.createSession({ userId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'createToken') {
		const length = this.getNodeParameter('length', i, 6) as number;
		const expire = this.getNodeParameter('expire', i, 900) as number;
		const response = await users.createToken({ userId, length, expire });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'delete') {
		await users.delete({ userId });
		return toItems({ success: true, userId });
	}

	if (operation === 'deleteIdentity') {
		const identityId = this.getNodeParameter('identityId', i) as string;
		await users.deleteIdentity({ identityId });
		return toItems({ success: true, identityId });
	}

	if (operation === 'deleteSession') {
		const sessionId = this.getNodeParameter('sessionId', i) as string;
		await users.deleteSession({ userId, sessionId });
		return toItems({ success: true, userId, sessionId });
	}

	if (operation === 'deleteSessions') {
		await users.deleteSessions({ userId });
		return toItems({ success: true, userId });
	}

	if (operation === 'get') {
		const response = await users.get({ userId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await users.list({ queries: pageQueries, search: searchArg })) as unknown as IDataObject,
				'users',
			);
			return toItems(result as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await users.list({
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.users as unknown as IDataObject[]);
	}

	if (operation === 'getManyIdentities') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await users.listIdentities({
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'identities',
			);
			return toItems(result as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await users.listIdentities({
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.identities as unknown as IDataObject[]);
	}

	if (operation === 'getManyLogs') {
		// Log entries have no ID, so cursor pagination cannot be used here.
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const response = await users.listLogs({
				userId,
				queries: queries.length > 0 ? queries : undefined,
			});
			return toItems(response.logs as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await users.listLogs({ userId, queries: [...queries, Query.limit(limit)] });
		return toItems(response.logs as unknown as IDataObject[]);
	}

	if (operation === 'getManyMemberships') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const result = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await users.listMemberships({
						userId,
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'memberships',
			);
			return toItems(result as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await users.listMemberships({
			userId,
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.memberships as unknown as IDataObject[]);
	}

	if (operation === 'getManySessions') {
		const response = await users.listSessions({ userId });
		return toItems(response.sessions as unknown as IDataObject[]);
	}

	if (operation === 'getPrefs') {
		const response = await users.getPrefs({ userId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updateEmail') {
		const email = this.getNodeParameter('email', i) as string;
		const response = await users.updateEmail({ userId, email });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updateEmailVerification') {
		const emailVerification = this.getNodeParameter('emailVerification', i, false) as boolean;
		const response = await users.updateEmailVerification({ userId, emailVerification });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updateLabels') {
		const labels = parseList('labels');
		const response = await users.updateLabels({ userId, labels });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updateName') {
		const name = this.getNodeParameter('name', i) as string;
		const response = await users.updateName({ userId, name });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updatePassword') {
		const password = this.getNodeParameter('password', i) as string;
		const response = await users.updatePassword({ userId, password });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updatePhone') {
		const phone = this.getNodeParameter('phone', i) as string;
		const response = await users.updatePhone({ userId, number: phone });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updatePhoneVerification') {
		const phoneVerification = this.getNodeParameter('phoneVerification', i, false) as boolean;
		const response = await users.updatePhoneVerification({ userId, phoneVerification });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updatePrefs') {
		const prefs = parseJsonParameter.call(this, this.getNodeParameter('prefs', i), 'prefs', i);
		const response = await users.updatePrefs({ userId, prefs });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'updateStatus') {
		const status = this.getNodeParameter('status', i, true) as boolean;
		const response = await users.updateStatus({ userId, status });
		return toItems(response as unknown as IDataObject);
	}

	throw new NodeOperationError(this.getNode(), `Unknown user operation "${operation}"`, {
		itemIndex: i,
	});
}
