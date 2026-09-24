import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getStringParameter,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The archive-model fields most workflows read, for the Simplify toggle. */
const ARCHIVE_SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'policyId',
	'status',
	'size',
	'startedAt',
	'services',
	'resources',
	'resourceId',
	'resourceType',
];

/** The policy-model fields most workflows read, for the Simplify toggle. */
const POLICY_SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'enabled',
	'schedule',
	'retention',
	'type',
	'services',
	'resourceId',
	'resourceType',
	'$createdAt',
];

/** The restoration-model fields most workflows read, for the Simplify toggle. */
const RESTORATION_SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'archiveId',
	'policyId',
	'status',
	'startedAt',
	'services',
	'resources',
	'options',
];

export async function executeBackupOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const archiveId = (): string => getStringParameter.call(this, 'archiveId', i);
	const policyId = (): string => getStringParameter.call(this, 'policyId', i);
	const services = (): string[] => this.getNodeParameter('backupServices', i, []) as string[];

	const simplified = (data: IDataObject | IDataObject[], fields: string[]) =>
		(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data;

	/** Get Many for archives, policies and restorations, which differ only in path and model. */
	const getMany = async (path: string, listKey: string, fields: string[]) => {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const list = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(this, 'GET', path, { qs: { queries: pageQueries } }, i),
				listKey,
				i,
			);
			return toItems(simplified(list as IDataObject[], fields), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(simplified(response[listKey] as IDataObject[], fields), i);
	};

	if (operation === 'createArchive') {
		const options = getCollectionParameter.call(this, 'options', i) as { resourceId?: string };
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/backups/archives',
			{ body: { services: services(), resourceId: options.resourceId || undefined } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createPolicy') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			enabled?: boolean;
			name?: string;
			resourceId?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/backups/policies',
			{
				body: {
					policyId: resolveId(getStringParameter.call(this, 'policyId', i, '')),
					services: services(),
					retention: this.getNodeParameter('backupRetention', i) as number,
					schedule: getStringParameter.call(this, 'backupSchedule', i),
					name: options.name || undefined,
					enabled: options.enabled,
					resourceId: options.resourceId || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createRestoration') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			newResourceId?: string;
			newResourceName?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/backups/restoration',
			{
				body: {
					archiveId: archiveId(),
					services: services(),
					newResourceId: options.newResourceId || undefined,
					newResourceName: options.newResourceName || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'deleteArchive') {
		const id = archiveId();
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/backups/archives/${encodeURIComponent(id)}`,
			{},
			i,
		);
		return toItems({ deleted: true, archiveId: id }, i);
	}

	if (operation === 'deletePolicy') {
		const id = policyId();
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/backups/policies/${encodeURIComponent(id)}`,
			{},
			i,
		);
		return toItems({ deleted: true, policyId: id }, i);
	}

	if (operation === 'getArchive') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/backups/archives/${encodeURIComponent(archiveId())}`,
			{},
			i,
		);
		return toItems(simplified(response, ARCHIVE_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManyArchives') {
		return await getMany('/backups/archives', 'archives', ARCHIVE_SIMPLIFY_FIELDS);
	}

	if (operation === 'getManyPolicies') {
		return await getMany('/backups/policies', 'policies', POLICY_SIMPLIFY_FIELDS);
	}

	if (operation === 'getManyRestorations') {
		return await getMany('/backups/restorations', 'restorations', RESTORATION_SIMPLIFY_FIELDS);
	}

	if (operation === 'getPolicy') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/backups/policies/${encodeURIComponent(policyId())}`,
			{},
			i,
		);
		return toItems(simplified(response, POLICY_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getRestoration') {
		const restorationId = getStringParameter.call(this, 'restorationId', i);
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/backups/restorations/${encodeURIComponent(restorationId)}`,
			{},
			i,
		);
		return toItems(simplified(response, RESTORATION_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'updatePolicy') {
		const updateFields = getCollectionParameter.call(this, 'updateFields', i) as {
			enabled?: boolean;
			name?: string;
			retention?: number;
			schedule?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/backups/policies/${encodeURIComponent(policyId())}`,
			{
				body: {
					name: updateFields.name || undefined,
					retention: updateFields.retention,
					schedule: updateFields.schedule || undefined,
					enabled: updateFields.enabled,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown backup operation "${operation}"`, {
		itemIndex: i,
	});
}
