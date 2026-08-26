import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { Query } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** Appwrite caps list endpoints at 100 results per page. */
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

/** Read a sibling parameter that a dependent list needs, e.g. the database a table belongs to. */
function dependency(context: ILoadOptionsFunctions, name: string): string {
	const value = context.getCurrentNodeParameter(name);
	return typeof value === 'string' ? value : '';
}

export async function getDatabases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const databases = await listAll(this, '/tablesdb', 'databases');
	return toOptions(databases, (database) => database.name ?? '');
}

export async function getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const databaseId = dependency(this, 'databaseId');
	if (databaseId === '') return [];

	const tables = await listAll(
		this,
		`/tablesdb/${encodeURIComponent(databaseId)}/tables`,
		'tables',
	);
	return toOptions(tables, (table) => table.name ?? '');
}

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const databaseId = dependency(this, 'databaseId');
	const tableId = dependency(this, 'tableId');
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

export async function getBuckets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const buckets = await listAll(this, '/storage/buckets', 'buckets');
	return toOptions(buckets, (bucket) => bucket.name ?? '');
}

export async function getFunctions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const functions = await listAll(this, '/functions', 'functions');
	return toOptions(functions, (fn) => fn.name ?? '');
}

export async function getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const teams = await listAll(this, '/teams', 'teams');
	return toOptions(teams, (team) => team.name ?? '');
}

export async function getTopics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const topics = await listAll(this, '/messaging/topics', 'topics');
	return toOptions(topics, (topic) => topic.name ?? '');
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const users = await listAll(this, '/users', 'users');
	return toOptions(
		users,
		(user) => (user.name as string) || (user.email as string) || (user.phone as string) || '',
	);
}

export async function getRuntimes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await appwriteApiRequest.call(this, 'GET', '/functions/runtimes');
	const runtimes = (response.runtimes ?? []) as AppwriteListItem[];
	return toOptions(runtimes, (runtime) => (runtime.name as string) ?? '');
}

export async function getMessagingProviders(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const providers = await listAll(this, '/messaging/providers', 'providers');
	return toOptions(providers, (provider) => provider.name ?? '');
}
