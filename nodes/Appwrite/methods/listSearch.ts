import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { Query, extractId } from '../helpers/appwrite';
import { findEngine } from '../helpers/dedicatedDatabases';
import type { DocumentDatabaseType } from '../helpers/documentDatabases';
import { DOCUMENTS_DB, VECTORS_DB } from '../helpers/documentDatabases';
import type { AppwriteCredentialType } from '../transport';
import { appwriteApiRequest } from '../transport';

/** Entries fetched per page of a From List search. */
const PAGE_SIZE = 100;

export interface ListEntry extends IDataObject {
	$id?: string;
	name?: string;
}

/**
 * One page of an Appwrite list endpoint for a resource locator's From List
 * mode. The typed filter goes to Appwrite's own `search` parameter, and the
 * last ID of a full page becomes the cursor n8n hands back for the next page.
 */
export async function searchList(
	context: ILoadOptionsFunctions,
	path: string,
	listKey: string,
	label: (entry: ListEntry) => string,
	filter?: string,
	paginationToken?: string,
	credentialType?: AppwriteCredentialType,
): Promise<INodeListSearchResult> {
	const queries = [Query.limit(PAGE_SIZE)];
	if (paginationToken) queries.push(Query.cursorAfter(paginationToken));

	const qs: IDataObject = { queries };
	if (filter) qs.search = filter;

	const response = await appwriteApiRequest.call(context, 'GET', path, { qs, credentialType });
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
 * searchList for endpoints without a `search` parameter: the typed filter is
 * matched here, against the labels and IDs. A page without a match moves
 * straight on to the next, so the picker is never left empty while more
 * entries remain.
 */
export async function searchListByLabel(
	context: ILoadOptionsFunctions,
	path: string,
	listKey: string,
	label: (entry: ListEntry) => string,
	filter?: string,
	paginationToken?: string,
	credentialType?: AppwriteCredentialType,
): Promise<INodeListSearchResult> {
	const needle = (filter ?? '').toLowerCase();
	let cursor = paginationToken;
	for (;;) {
		const page = await searchList(context, path, listKey, label, undefined, cursor, credentialType);
		const results = page.results.filter(
			(result) =>
				result.name.toLowerCase().includes(needle) ||
				String(result.value).toLowerCase().includes(needle),
		);
		if (results.length > 0 || page.paginationToken === undefined) {
			return { results, paginationToken: page.paginationToken };
		}
		cursor = page.paginationToken as string;
	}
}

/**
 * The ID a dependent list needs from its parent locator, e.g. the database a
 * table belongs to. Returns '' until the parent has a value.
 */
export function parentId(context: ILoadOptionsFunctions, name: string, kind: string): string {
	const value = context.getCurrentNodeParameter(name, { extractValue: true });
	return typeof value === 'string' ? extractId(value, kind) : '';
}

export const byName = (entry: ListEntry): string => entry.name ?? '';

export async function searchApps(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchListByLabel(this, '/apps', 'apps', byName, filter, paginationToken);
}

export async function searchProxyRules(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// A proxy rule has no name; the Console lists it by its domain.
	return await searchListByLabel(
		this,
		'/proxy/rules',
		'rules',
		(rule) => (rule.domain as string | undefined) ?? '',
		filter,
		paginationToken,
	);
}

export async function searchWafRules(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/waf/rules', 'rules', byName, filter, paginationToken);
}

export async function searchDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(this, '/tablesdb', 'databases', byName, filter, paginationToken);
}

export async function searchDedicatedDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const engine = findEngine(this.getCurrentNodeParameter('databaseEngine'));
	if (engine === undefined) return { results: [] };

	// Unlike the other lists, this one takes no `search` parameter, so the typed
	// filter narrows each page here. A project runs few dedicated databases, so
	// one page is nearly always the whole list.
	const page = await searchList(this, engine.path, 'databases', byName, undefined, paginationToken);
	if (!filter) return page;
	const needle = filter.toLowerCase();
	return {
		...page,
		results: page.results.filter(
			(result) =>
				result.name.toLowerCase().includes(needle) ||
				String(result.value).toLowerCase().includes(needle),
		),
	};
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

/**
 * The databases of DocumentsDB or VectorsDB. Their list endpoints take no
 * search term (Appwrite 2.3), so the typed filter is matched against the
 * fetched pages by name or ID instead. A page without a match is skipped
 * rather than returned empty, since the picker only asks for more results
 * when the user scrolls through the ones it has.
 */
async function searchDatabasesOfType(
	context: ILoadOptionsFunctions,
	type: DocumentDatabaseType,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const fetchPage = async (token?: string) =>
		await searchList(context, type.path, 'databases', byName, undefined, token);
	let page = await fetchPage(paginationToken);
	if (!filter) return page;

	const needle = filter.toLowerCase();
	const matches = (entry: INodeListSearchItems) =>
		entry.name.toLowerCase().includes(needle) || String(entry.value).toLowerCase().includes(needle);
	let results = page.results.filter(matches);
	while (results.length === 0 && page.paginationToken !== undefined) {
		page = await fetchPage(page.paginationToken as string);
		results = page.results.filter(matches);
	}
	return { results, paginationToken: page.paginationToken };
}

async function searchCollectionsOfType(
	context: ILoadOptionsFunctions,
	type: DocumentDatabaseType,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const databaseId = parentId(context, 'databaseId', 'database');
	if (databaseId === '') return { results: [] };
	return await searchList(
		context,
		`${type.path}/${encodeURIComponent(databaseId)}/collections`,
		'collections',
		byName,
		filter,
		paginationToken,
	);
}

export async function searchDocumentsDbDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchDatabasesOfType(this, DOCUMENTS_DB, filter, paginationToken);
}

export async function searchDocumentsDbCollections(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchCollectionsOfType(this, DOCUMENTS_DB, filter, paginationToken);
}

export async function searchVectorsDbDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchDatabasesOfType(this, VECTORS_DB, filter, paginationToken);
}

export async function searchVectorsDbCollections(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchCollectionsOfType(this, VECTORS_DB, filter, paginationToken);
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

export async function searchApiKeys(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchListByLabel(this, '/project/keys', 'keys', byName, filter, paginationToken);
}

export async function searchPlatforms(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchListByLabel(
		this,
		'/project/platforms',
		'platforms',
		byName,
		filter,
		paginationToken,
	);
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

export async function searchWebhooks(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// The webhooks list takes no search parameter, so the typed filter is
	// matched against each page's names and IDs here instead.
	const page = await searchList(this, '/webhooks', 'webhooks', byName, undefined, paginationToken);
	if (!filter) return page;
	const needle = filter.toLowerCase();
	return {
		...page,
		results: page.results.filter(
			(entry) =>
				entry.name.toLowerCase().includes(needle) ||
				String(entry.value).toLowerCase().includes(needle),
		),
	};
}
