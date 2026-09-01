import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The table-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'databaseId',
	'name',
	'enabled',
	'rowSecurity',
	'$createdAt',
	'$updatedAt',
];

export async function executeTableOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
	const tablesPath = `/tablesdb/${encodeURIComponent(databaseId)}/tables`;

	if (operation === 'create') {
		const tableId = resolveId(this.getNodeParameter('tableId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const rowSecurity = this.getNodeParameter('rowSecurity', i, false) as boolean;
		const enabled = this.getNodeParameter('enabled', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			tablesPath,
			{ body: { tableId, name, permissions, rowSecurity, enabled } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'get') {
		const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{},
			i,
		);
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		return toItems(simplify ? simplifyItems(response, SIMPLIFY_FIELDS) : response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		const project = (tables: IDataObject[]) =>
			simplify ? (simplifyItems(tables, SIMPLIFY_FIELDS) as IDataObject[]) : tables;

		if (returnAll) {
			const tables = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						tablesPath,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'tables',
				i,
			);
			return toItems(project(tables as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			tablesPath,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(project(response.tables as IDataObject[]), i);
	}

	if (operation === 'update') {
		const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			enabled?: boolean;
			rowSecurity?: boolean;
		};
		// PUT treats omitted `enabled`/`rowSecurity` as their defaults (true/false),
		// so a plain rename would re-enable a disabled table or turn row security
		// off. Read the current values when the user leaves the options out.
		let { enabled, rowSecurity } = updateFields;
		if (enabled === undefined || rowSecurity === undefined) {
			const current = await appwriteApiRequest.call(
				this,
				'GET',
				`${tablesPath}/${encodeURIComponent(tableId)}`,
				{},
				i,
			);
			enabled = enabled ?? (current.enabled as boolean | undefined);
			rowSecurity = rowSecurity ?? (current.rowSecurity as boolean | undefined);
		}
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{
				body: {
					name,
					permissions,
					rowSecurity,
					enabled,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${tablesPath}/${encodeURIComponent(tableId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, databaseId, tableId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown table operation "${operation}"`, {
		itemIndex: i,
	});
}
