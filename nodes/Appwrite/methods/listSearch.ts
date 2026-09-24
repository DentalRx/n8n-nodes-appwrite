import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { Query, extractId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** Entries fetched per page of a From List search. */
const PAGE_SIZE = 100;

interface ListEntry extends IDataObject {
	$id?: string;
	name?: string;
}

/**
 * One page of an Appwrite list endpoint for a resource locator's From List
 * mode. The typed filter goes to Appwrite's own `search` parameter, and the
 * last ID of a full page becomes the cursor n8n hands back for the next page.
 */
async function searchList(
	context: ILoadOptionsFunctions,
	path: string,
	listKey: string,
	label: (entry: ListEntry) => string,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const queries = [Query.limit(PAGE_SIZE)];
	if (paginationToken) queries.push(Query.cursorAfter(paginationToken));

	const qs: IDataObject = { queries };
	if (filter) qs.search = filter;

	const response = await appwriteApiRequest.call(context, 'GET', path, { qs });
	const page = (response[listKey] ?? []) as ListEntry[];
	const entries = page.filter((entry) => typeof entry.$id === 'string' && entry.$id !== '');

	const results: INodeListSearchItems[] = entries.map((entry) => ({
		name: label(entry) || (entry.$id as string),
		value: entry.$id as string,
	}));

	return {
		results,
		paginationToken: page.length === PAGE_SIZE ? page[page.length - 1].$id : undefined,
	};
}

/**
 * The ID a dependent list needs from its parent locator, e.g. the database a
 * table belongs to. Returns '' until the parent has a value.
 */
function parentId(context: ILoadOptionsFunctions, name: string, kind: string): string {
	const value = context.getCurrentNodeParameter(name, { extractValue: true });
	return typeof value === 'string' ? extractId(value, kind) : '';
}

const byName = (entry: ListEntry): string => entry.name ?? '';

export async function searchDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/tablesdb', 'databases', byName, filter, paginationToken);
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const databaseId = parentId(this, 'databaseId', 'database');
	if (databaseId === '') return { results: [] };
	return await searchList(
		this,
		`/tablesdb/${encodeURIComponent(databaseId)}/tables`,
		'tables',
		byName,
		filter,
		paginationToken,
	);
}

export async function searchBuckets(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/storage/buckets', 'buckets', byName, filter, paginationToken);
}

export async function searchFiles(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const bucketId = parentId(this, 'bucketId', 'bucket');
	if (bucketId === '') return { results: [] };
	return await searchList(
		this,
		`/storage/buckets/${encodeURIComponent(bucketId)}/files`,
		'files',
		byName,
		filter,
		paginationToken,
	);
}

export async function searchFunctions(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/functions', 'functions', byName, filter, paginationToken);
}

export async function searchSites(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/sites', 'sites', byName, filter, paginationToken);
}

export async function searchTeams(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/teams', 'teams', byName, filter, paginationToken);
}

export async function searchProviders(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(
		this,
		'/messaging/providers',
		'providers',
		byName,
		filter,
		paginationToken,
	);
}

export async function searchTopics(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/messaging/topics', 'topics', byName, filter, paginationToken);
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// Users often have no name; fall back to how the Console identifies them.
	return await searchList(
		this,
		'/users',
		'users',
		(user) => (user.name as string) || (user.email as string) || (user.phone as string) || '',
		filter,
		paginationToken,
	);
}
