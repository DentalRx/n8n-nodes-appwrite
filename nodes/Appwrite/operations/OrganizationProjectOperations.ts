import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getCollectionParameter,
	getResourceId,
	getStringListParameter,
	parseStringList,
	simplifyItems,
	toItems,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { organizationApiRequest, organizationGetMany } from '../helpers/organization';

/** The project-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'name',
	'teamId',
	'region',
	'status',
	'labels',
	'authMethods',
	'services',
	'protocols',
];

export async function executeOrganizationProjectOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: creating and listing projects act on no existing project.
	const projectId = (): string =>
		getResourceId.call(this, 'organizationProjectId', i, 'project', 'Project');
	const projectPath = (): string => `/organization/projects/${encodeURIComponent(projectId())}`;
	const keyId = (): string =>
		getResourceId.call(this, 'organizationProjectKeyId', i, 'key', 'API Key');
	const keyPath = (): string => `${projectPath()}/keys/${encodeURIComponent(keyId())}`;
	const simplified = (data: IDataObject | IDataObject[]) =>
		toItems(
			(this.getNodeParameter('simplify', i, false) as boolean)
				? simplifyItems(data, SIMPLIFY_FIELDS)
				: data,
			i,
		);

	if (operation === 'create') {
		const options = getCollectionParameter.call(this, 'options', i) as { projectRegion?: string };
		const response = await organizationApiRequest.call(
			this,
			'POST',
			'/organization/projects',
			{
				body: {
					projectId: resolveId(this.getNodeParameter('organizationProjectId', i, '')),
					name: String(this.getNodeParameter('name', i) ?? ''),
					region: options.projectRegion,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createEphemeralKey') {
		const scopes = getStringListParameter.call(this, 'keyScopes', i, 'Scopes');
		if (scopes.length === 0) {
			throw new NodeOperationError(this.getNode(), "The 'Scopes' parameter is empty", {
				description: 'Enter at least one scope for the key to grant, such as users.read.',
				itemIndex: i,
			});
		}
		const duration = this.getNodeParameter('keyDuration', i) as number;
		// The response carries the key's secret: handing it to the next node is
		// what this operation is for.
		const response = await organizationApiRequest.call(
			this,
			'POST',
			`${projectPath()}/keys/ephemeral`,
			{ body: { scopes, duration } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const organizationProjectId = projectId();
		await organizationApiRequest.call(
			this,
			'DELETE',
			`/organization/projects/${encodeURIComponent(organizationProjectId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, projectId: organizationProjectId }, i);
	}

	if (operation === 'deleteKey') {
		const path = keyPath();
		await organizationApiRequest.call(this, 'DELETE', path, {}, i);
		return toItems({ deleted: true, projectId: projectId(), apiKeyId: keyId() }, i);
	}

	if (operation === 'get') {
		return simplified(await organizationApiRequest.call(this, 'GET', projectPath(), {}, i));
	}

	if (operation === 'getKey') {
		return toItems(await organizationApiRequest.call(this, 'GET', keyPath(), {}, i), i);
	}

	if (operation === 'getMany') {
		const search = String(
			(getCollectionParameter.call(this, 'options', i) as { search?: unknown }).search ?? '',
		);
		return simplified(
			await organizationGetMany.call(
				this,
				'/organization/projects',
				'projects',
				i,
				search === '' ? undefined : search,
			),
		);
	}

	if (operation === 'getManyKeys') {
		return toItems(await organizationGetMany.call(this, `${projectPath()}/keys`, 'keys', i), i);
	}

	if (operation === 'updateKey') {
		const path = keyPath();
		const updateFields = getCollectionParameter.call(this, 'updateFields', i) as {
			expire?: string;
			keyScopes?: unknown;
			name?: unknown;
		};
		// PUT replaces the name, the scopes and the expiration date together, and
		// a missing expiration date means "never expires": read the key first and
		// resend whatever the user did not change.
		const current = await organizationApiRequest.call(this, 'GET', path, {}, i);
		const expire =
			updateFields.expire === undefined
				? (current.expire as string | undefined)
				: updateFields.expire;
		const response = await organizationApiRequest.call(
			this,
			'PUT',
			path,
			{
				body: {
					name: updateFields.name === undefined ? current.name : String(updateFields.name),
					scopes:
						updateFields.keyScopes === undefined
							? ((current.scopes as string[] | undefined) ?? [])
							: parseStringList.call(this, updateFields.keyScopes, 'Scopes', i),
					// Appwrite reads null, not an empty date, as "never expires".
					expire: expire || null,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateName') {
		const response = await organizationApiRequest.call(
			this,
			'PATCH',
			projectPath(),
			{ body: { name: String(this.getNodeParameter('name', i) ?? '') } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unknown organization project operation "${operation}"`,
		{ itemIndex: i },
	);
}
