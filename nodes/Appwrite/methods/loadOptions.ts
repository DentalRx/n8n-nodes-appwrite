import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { Query, extractId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** Fetch picker lists in pages of 100. */
const PAGE_SIZE = 100;

/** Stop paginating a picker list here; longer lists are better served by an expression. */
const MAX_OPTIONS = 500;

interface AppwriteListItem extends IDataObject {
	$id?: string;
	name?: string;
	key?: string;
}

/**
 * Fetch every page of an Appwrite list endpoint, up to MAX_OPTIONS entries.
 * Cursor pagination is used where the entries carry an $id; entries without
 * one (columns, indexes) fall back to offset paging.
 */
async function listAll(
	context: ILoadOptionsFunctions,
	path: string,
	listKey: string,
): Promise<AppwriteListItem[]> {
	const results: AppwriteListItem[] = [];
	let cursor: string | undefined;

	while (results.length < MAX_OPTIONS) {
		const queries = [Query.limit(PAGE_SIZE)];
		if (cursor !== undefined) {
			queries.push(Query.cursorAfter(cursor));
		} else if (results.length > 0) {
			queries.push(Query.offset(results.length));
		}

		const response = await appwriteApiRequest.call(context, 'GET', path, { qs: { queries } });
		const page = (response[listKey] ?? []) as AppwriteListItem[];
		results.push(...page);

		if (page.length < PAGE_SIZE) break;
		cursor = page[page.length - 1].$id;
	}

	return results;
}

/**
 * Turn Appwrite list entries into picker options, labelled with whatever the
 * resource calls itself and sorted the way n8n shows them.
 */
function toOptions(
	items: AppwriteListItem[],
	label: (item: AppwriteListItem) => string,
	value: (item: AppwriteListItem) => string = (item) => item.$id ?? '',
): INodePropertyOptions[] {
	return items
		.map((item) => ({ name: label(item) || value(item), value: value(item) }))
		.filter((option) => option.value !== '')
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

/**
 * Read a sibling parameter that a dependent list needs, e.g. the database a
 * table belongs to. Run through extractId so a Console URL pasted into the
 * parent field works for the dependent dropdowns exactly as it does at
 * execute time.
 */
function dependency(context: ILoadOptionsFunctions, name: string, kind: string): string {
	const value = context.getCurrentNodeParameter(name, { extractValue: true });
	return typeof value === 'string' ? extractId(value, kind) : '';
}

export async function getAppInstallationScopes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = await appwriteApiRequest.call(this, 'GET', '/apps/scopes/installations');
	const scopes = (response.scopes ?? []) as AppwriteListItem[];
	// Appwrite keeps deprecated scopes working but asks that they not be
	// offered for new grants.
	return scopes
		.filter((scope) => scope.deprecated !== true && typeof scope.value === 'string')
		.map((scope) => ({
			name: scope.value as string,
			value: scope.value as string,
			...(scope.description ? { description: scope.description as string } : {}),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const databaseId = dependency(this, 'databaseId', 'database');
	const tableId = dependency(this, 'tableId', 'table');
	if (databaseId === '' || tableId === '') return [];

	const columns = await listAll(
		this,
		`/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}/columns`,
		'columns',
	);
	return toOptions(
		columns,
		(column) => column.key ?? '',
		(column) => column.key ?? '',
	);
}

export async function getFrameworks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await appwriteApiRequest.call(this, 'GET', '/sites/frameworks');
	return toOptions(
		(response.frameworks ?? []) as AppwriteListItem[],
		(framework) => framework.name ?? '',
		(framework) => framework.key ?? '',
	);
}

export async function getSiteBuildRuntimes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = await appwriteApiRequest.call(this, 'GET', '/sites/frameworks');
	const frameworks = (response.frameworks ?? []) as AppwriteListItem[];

	// Create picks the framework on the node's face, Update inside its Options.
	const options = this.getCurrentNodeParameter('options') as IDataObject | undefined;
	const chosen = this.getCurrentNodeParameter('siteFramework') ?? options?.siteFramework;
	const matching = frameworks.filter((framework) => framework.key === chosen);

	// Until a framework is chosen, or while an update keeps the current one,
	// offer every runtime that some framework builds with.
	const runtimes = new Set(
		(matching.length > 0 ? matching : frameworks).flatMap(
			(framework) => (framework.runtimes as string[] | undefined) ?? [],
		),
	);
	return toOptions(
		[...runtimes].map((runtime) => ({ $id: runtime })),
		(runtime) => runtime.$id ?? '',
	);
}

export async function getRuntimes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await appwriteApiRequest.call(this, 'GET', '/functions/runtimes');
	const runtimes = (response.runtimes ?? []) as AppwriteListItem[];
	// The runtime model's `name` is the family alone ("Node.js"), so without the
	// version the dropdown would show many indistinguishable duplicates.
	return toOptions(runtimes, (runtime) => {
		const name = (runtime.name as string) ?? '';
		const version = (runtime.version as string) ?? '';
		return version === '' ? name : `${name} ${version}`;
	});
}

/**
 * The extensions a PostgreSQL dedicated database can install, or has
 * installed. Appwrite adds a display name and description for the extensions
 * it curates; any other shows under its own name.
 */
async function postgresqlExtensions(
	context: ILoadOptionsFunctions,
	list: 'available' | 'installed',
): Promise<INodePropertyOptions[]> {
	const databaseId = dependency(context, 'dedicatedDatabaseId', 'database');
	if (databaseId === '') return [];

	const response = await appwriteApiRequest.call(
		context,
		'GET',
		`/postgresql/${encodeURIComponent(databaseId)}/extensions`,
	);
	const metadata = new Map(
		((response.metadata ?? []) as IDataObject[]).map((entry) => [entry.key, entry]),
	);
	return ((response[list] ?? []) as string[])
		.map((key) => {
			const entry = metadata.get(key);
			const option: INodePropertyOptions = { name: (entry?.name as string) || key, value: key };
			if (typeof entry?.description === 'string') option.description = entry.description;
			return option;
		})
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export async function getAvailablePostgresqlExtensions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await postgresqlExtensions(this, 'available');
}

export async function getInstalledPostgresqlExtensions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await postgresqlExtensions(this, 'installed');
}
