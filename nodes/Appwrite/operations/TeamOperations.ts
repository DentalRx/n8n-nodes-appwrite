import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getStringListParameter,
	parseJsonParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeTeamOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const teamPath = (): string =>
		`/teams/${encodeURIComponent(extractId(this.getNodeParameter('teamId', i) as string, 'team'))}`;

	if (operation === 'create') {
		const teamId = resolveId(this.getNodeParameter('teamId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const roles = getStringListParameter.call(this, 'roles', i, 'Roles');
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/teams',
			{ body: { teamId, name, roles: roles.length > 0 ? roles : undefined } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createMembership') {
		const path = `${teamPath()}/memberships`;
		const roles = getStringListParameter.call(this, 'roles', i, 'Roles');
		const email = this.getNodeParameter('email', i, '') as string;
		const userId = this.getNodeParameter('userId', i, '') as string;
		const phone = this.getNodeParameter('phone', i, '') as string;
		const options = this.getNodeParameter('options', i, {}) as { name?: string; url?: string };
		const url = options.url ?? '';
		const name = options.name ?? '';
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
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const teamId = extractId(this.getNodeParameter('teamId', i) as string, 'team');
		await appwriteApiRequest.call(this, 'DELETE', `/teams/${encodeURIComponent(teamId)}`, {}, i);
		return toItems({ deleted: true, teamId }, i);
	}

	if (operation === 'deleteMembership') {
		const teamId = extractId(this.getNodeParameter('teamId', i) as string, 'team');
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/teams/${encodeURIComponent(teamId)}/memberships/${encodeURIComponent(membershipId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, teamId, membershipId }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', teamPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const searchArg = search === '' ? undefined : search;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const allTeams = await fetchAllPages.call(
				this,
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
				i,
			);
			return toItems(allTeams as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/teams',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.teams as IDataObject[], i);
	}

	if (operation === 'getManyMemberships') {
		const path = `${teamPath()}/memberships`;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const searchArg = search === '' ? undefined : search;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const memberships = await fetchAllPages.call(
				this,
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
				i,
			);
			return toItems(memberships as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.memberships as IDataObject[], i);
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
		return toItems(response, i);
	}

	if (operation === 'getPrefs') {
		const response = await appwriteApiRequest.call(this, 'GET', `${teamPath()}/prefs`, {}, i);
		return toItems(response, i);
	}

	if (operation === 'updateMembership') {
		const membershipId = this.getNodeParameter('membershipId', i) as string;
		const path = `${teamPath()}/memberships/${encodeURIComponent(membershipId)}`;
		const roles = getStringListParameter.call(this, 'roles', i, 'Roles');
		const response = await appwriteApiRequest.call(this, 'PATCH', path, { body: { roles } }, i);
		return toItems(response, i);
	}

	if (operation === 'updateName') {
		const path = teamPath();
		const name = this.getNodeParameter('name', i) as string;
		const response = await appwriteApiRequest.call(this, 'PUT', path, { body: { name } }, i);
		return toItems(response, i);
	}

	if (operation === 'updatePrefs') {
		const path = `${teamPath()}/prefs`;
		const prefs = parseJsonParameter.call(
			this,
			this.getNodeParameter('prefs', i),
			'Preferences',
			i,
		);
		const response = await appwriteApiRequest.call(this, 'PUT', path, { body: { prefs } }, i);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown team operation "${operation}"`, {
		itemIndex: i,
	});
}
