import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getResourceId,
	getStringParameter,
	parseJsonArrayParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

/** The Team resource's operations on the apps installed on a team. */
export const TEAM_INSTALLATION_OPERATIONS = new Set([
	'createInstallation',
	'deleteInstallation',
	'getInstallation',
	'getManyInstallations',
	'updateInstallation',
]);

export async function executeTeamInstallationOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const teamId = getResourceId.call(this, 'teamId', i, 'team', 'Team');
	const installationsPath = `/teams/${encodeURIComponent(teamId)}/installations`;
	const installationId = (): string => getStringParameter.call(this, 'installationId', i);
	const installationPath = (): string =>
		`${installationsPath}/${encodeURIComponent(installationId())}`;

	// Appwrite takes the details as a string holding a JSON array, not as the array itself.
	const authorizationDetails = (values: { authorizationDetails?: unknown }): string | undefined =>
		values.authorizationDetails === undefined
			? undefined
			: JSON.stringify(
					parseJsonArrayParameter.call(
						this,
						values.authorizationDetails,
						'Authorization Details',
						i,
					),
				);

	if (operation === 'createInstallation') {
		const options = getCollectionParameter.call(this, 'options', i);
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			installationsPath,
			{
				body: {
					appId: getResourceId.call(this, 'appId', i, 'app', 'App'),
					authorizationDetails: authorizationDetails(options),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'deleteInstallation') {
		await appwriteApiRequest.call(this, 'DELETE', installationPath(), {}, i);
		return toItems({ deleted: true, teamId, installationId: installationId() }, i);
	}

	if (operation === 'getInstallation') {
		const response = await appwriteApiRequest.call(this, 'GET', installationPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getManyInstallations') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const installations = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						installationsPath,
						{ qs: { queries: pageQueries } },
						i,
					),
				'installations',
				i,
			);
			return toItems(installations as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			installationsPath,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.installations as IDataObject[], i);
	}

	if (operation === 'updateInstallation') {
		const updateFields = getCollectionParameter.call(this, 'updateFields', i);
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			installationPath(),
			{ body: { authorizationDetails: authorizationDetails(updateFields) } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown team operation "${operation}"`, {
		itemIndex: i,
	});
}
