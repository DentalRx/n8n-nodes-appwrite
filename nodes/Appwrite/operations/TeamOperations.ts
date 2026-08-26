import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { type Teams } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	getStringListParameter,
	parseJsonParameter,
	resolveId,
	toItems,
	withLimit,
} from '../GenericFunctions';

export async function executeTeamOperation(
	this: IExecuteFunctions,
	teams: Teams,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const rawTeamId = this.getNodeParameter('teamId', i, '') as string;
		const teamId = resolveId(rawTeamId);
		const name = this.getNodeParameter('name', i) as string;
		const roles = getStringListParameter.call(this, 'roles', i);
		const response = await teams.create({
			teamId,
			name,
			roles: roles.length > 0 ? roles : undefined,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'createMembership') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const roles = getStringListParameter.call(this, 'roles', i);
		const email = this.getNodeParameter('email', i, '') as string;
		const userId = this.getNodeParameter('userId', i, '') as string;
		const phone = this.getNodeParameter('phone', i, '') as string;
		const url = this.getNodeParameter('url', i, '') as string;
		const name = this.getNodeParameter('name', i, '') as string;
		const response = await teams.createMembership({
			teamId,
			roles,
			email: email === '' ? undefined : email,
			userId: userId === '' ? undefined : userId,
			phone: phone === '' ? undefined : phone,
			url: url === '' ? undefined : url,
			name: name === '' ? undefined : name,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		await teams.delete({ teamId });
		return toItems({ success: true, teamId }, i);
	}

	if (operation === 'deleteMembership') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		await teams.deleteMembership({ teamId, membershipId });
		return toItems({ success: true, teamId, membershipId }, i);
	}

	if (operation === 'get') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const response = await teams.get({ teamId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const searchArg = search === '' ? undefined : search;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const allTeams = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await teams.list({ queries: pageQueries, search: searchArg })) as unknown as IDataObject,
				'teams',
			);
			return toItems(allTeams as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await teams.list({
			queries: withLimit(queries, limit),
			search: searchArg,
		});
		return toItems(response.teams as unknown as IDataObject[], i);
	}

	if (operation === 'getManyMemberships') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const searchArg = search === '' ? undefined : search;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const memberships = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await teams.listMemberships({
						teamId,
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'memberships',
			);
			return toItems(memberships as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await teams.listMemberships({
			teamId,
			queries: withLimit(queries, limit),
			search: searchArg,
		});
		return toItems(response.memberships as unknown as IDataObject[], i);
	}

	if (operation === 'getMembership') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		const response = await teams.getMembership({ teamId, membershipId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getPrefs') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const response = await teams.getPrefs({ teamId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'updateMembership') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		const roles = getStringListParameter.call(this, 'roles', i);
		const response = await teams.updateMembership({ teamId, membershipId, roles });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'updateName') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const name = this.getNodeParameter('name', i) as string;
		const response = await teams.updateName({ teamId, name });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'updatePrefs') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const prefs = parseJsonParameter.call(this, this.getNodeParameter('prefs', i), 'prefs', i);
		const response = await teams.updatePrefs({ teamId, prefs });
		return toItems(response as unknown as IDataObject, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown team operation "${operation}"`, {
		itemIndex: i,
	});
}
