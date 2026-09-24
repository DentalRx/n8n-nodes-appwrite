import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getOptionalResourceId,
	getResourceId,
	getStringListParameter,
	getStringParameter,
	parseJsonParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest, appwriteUserRequest } from '../transport';
import {
	TEAM_INSTALLATION_OPERATIONS,
	executeTeamInstallationOperation,
} from './TeamInstallationOperations';

export async function executeTeamOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (TEAM_INSTALLATION_OPERATIONS.has(operation)) {
		return await executeTeamInstallationOperation.call(this, operation, i);
	}

	const teamPath = (): string =>
		`/teams/${encodeURIComponent(getResourceId.call(this, 'teamId', i, 'team', 'Team'))}`;

	if (operation === 'create') {
		const teamId = resolveId(getStringParameter.call(this, 'teamId', i, ''));
		const name = getStringParameter.call(this, 'name', i);
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
		const email = getStringParameter.call(this, 'email', i, '');
		const userId = getOptionalResourceId.call(this, 'userId', i, 'user');
		const phone = getStringParameter.call(this, 'phone', i, '');
		const options = getCollectionParameter.call(this, 'options', i) as {
			name?: string;
			url?: string;
		};
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
		const teamId = getResourceId.call(this, 'teamId', i, 'team', 'Team');
		await appwriteApiRequest.call(this, 'DELETE', `/teams/${encodeURIComponent(teamId)}`, {}, i);
		return toItems({ deleted: true, teamId }, i);
	}

	if (operation === 'deleteMembership') {
		const teamId = getResourceId.call(this, 'teamId', i, 'team', 'Team');
		const membershipId = getStringParameter.call(this, 'membershipId', i);
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
		const search =
			(getCollectionParameter.call(this, 'options', i) as { search?: string }).search ?? '';
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
		const search =
			(getCollectionParameter.call(this, 'options', i) as { search?: string }).search ?? '';
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
		const membershipId = getStringParameter.call(this, 'membershipId', i);
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
		const membershipId = getStringParameter.call(this, 'membershipId', i);
		const path = `${teamPath()}/memberships/${encodeURIComponent(membershipId)}`;
		const roles = getStringListParameter.call(this, 'roles', i, 'Roles');
		const response = await appwriteApiRequest.call(this, 'PATCH', path, { body: { roles } }, i);
		return toItems(response, i);
	}

	if (operation === 'updateMembershipStatus') {
		// Accepting an invitation is proved by the secret from the invitation
		// link, not by credentials: Appwrite refuses API keys here (the route's
		// scope is public), so the request goes out without the key.
		const membershipId = String(this.getNodeParameter('membershipId', i) ?? '');
		const userId = getResourceId.call(this, 'userId', i, 'user', 'User');
		const secret = String(this.getNodeParameter('membershipSecret', i) ?? '');
		const response = await appwriteUserRequest.call(
			this,
			'PATCH',
			`${teamPath()}/memberships/${encodeURIComponent(membershipId)}/status`,
			{ type: 'guest' },
			{ body: { userId, secret } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateName') {
		const path = teamPath();
		const name = getStringParameter.call(this, 'name', i);
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
