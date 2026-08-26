import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	parseJsonArrayParameter,
	parseJsonParameter,
} from '../GenericFunctions';
import { Query, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeTeamOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
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

	const teamPath = (): string =>
		`/teams/${encodeURIComponent(this.getNodeParameter('teamId', i) as string)}`;

	if (operation === 'create') {
		const teamId = resolveId(this.getNodeParameter('teamId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const roles = parseList('roles');
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/teams',
			{ body: { teamId, name, roles: roles.length > 0 ? roles : undefined } },
			i,
		);
		return toItems(response);
	}

	if (operation === 'createMembership') {
		const path = `${teamPath()}/memberships`;
		const roles = parseList('roles');
		const email = this.getNodeParameter('email', i, '') as string;
		const userId = this.getNodeParameter('userId', i, '') as string;
		const phone = this.getNodeParameter('phone', i, '') as string;
		const url = this.getNodeParameter('url', i, '') as string;
		const name = this.getNodeParameter('name', i, '') as string;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			path,
			{
				body: {
					email: email === '' ? undefined : email,
					userId: userId === '' ? undefined : userId,
					phone: phone === '' ? undefined : phone,
					roles,
					url: url === '' ? undefined : url,
					name: name === '' ? undefined : name,
				},
			},
			i,
		);
		return toItems(response);
	}

	if (operation === 'delete') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		await appwriteApiRequest.call(this, 'DELETE', `/teams/${encodeURIComponent(teamId)}`, {}, i);
		return toItems({ success: true, teamId });
	}

	if (operation === 'deleteMembership') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/teams/${encodeURIComponent(teamId)}/memberships/${encodeURIComponent(membershipId)}`,
			{},
			i,
		);
		return toItems({ success: true, teamId, membershipId });
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', teamPath(), {}, i);
		return toItems(response);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const searchArg = search === '' ? undefined : search;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const allTeams = await fetchAllPages(
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/teams',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'teams',
			);
			return toItems(allTeams as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/teams',
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		);
		return toItems(response.teams as IDataObject[]);
	}

	if (operation === 'getManyMemberships') {
		const path = `${teamPath()}/memberships`;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const searchArg = search === '' ? undefined : search;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const memberships = await fetchAllPages(
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						path,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'memberships',
			);
			return toItems(memberships as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		);
		return toItems(response.memberships as IDataObject[]);
	}

	if (operation === 'getMembership') {
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${teamPath()}/memberships/${encodeURIComponent(membershipId)}`,
			{},
			i,
		);
		return toItems(response);
	}

	if (operation === 'getPrefs') {
		const response = await appwriteApiRequest.call(this, 'GET', `${teamPath()}/prefs`, {}, i);
		return toItems(response);
	}

	if (operation === 'updateMembership') {
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		const path = `${teamPath()}/memberships/${encodeURIComponent(membershipId)}`;
		const roles = parseList('roles');
		const response = await appwriteApiRequest.call(this, 'PATCH', path, { body: { roles } }, i);
		return toItems(response);
	}

	if (operation === 'updateName') {
		const path = teamPath();
		const name = this.getNodeParameter('name', i) as string;
		const response = await appwriteApiRequest.call(this, 'PUT', path, { body: { name } }, i);
		return toItems(response);
	}

	if (operation === 'updatePrefs') {
		const path = `${teamPath()}/prefs`;
		const prefs = parseJsonParameter.call(this, this.getNodeParameter('prefs', i), 'prefs', i);
		const response = await appwriteApiRequest.call(this, 'PUT', path, { body: { prefs } }, i);
		return toItems(response);
	}

	throw new NodeOperationError(this.getNode(), `Unknown team operation "${operation}"`, {
		itemIndex: i,
	});
}
