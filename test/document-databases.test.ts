import type { IDataObject, IHttpRequestOptions, INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { parseVector } from '../nodes/Appwrite/GenericFunctions';
import { Query } from '../nodes/Appwrite/helpers/appwrite';
import {
	searchDocumentsDbDatabases,
	searchVectorsDbCollections,
} from '../nodes/Appwrite/methods/listSearch';
import type { Responder } from './helpers/mock-context';
import {
	BASE_URL,
	createExecuteContext,
	createLoadOptionsContext,
	description,
	node,
} from './helpers/mock-context';

const parse = (query: string) => JSON.parse(query) as IDataObject;

/** Run the node once with `parameters` and return what it sent and output. */
async function run(parameters: INodeParameters, respond: Responder = () => ({ $id: 'model' })) {
	const { context, requests } = createExecuteContext({ parameters, respond });
	const [output] = await node.execute.call(context);
	return { requests, output: output.map((item) => item.json) };
}

/** The queries a request carried, in the query string or the body, decoded. */
const queriesOf = (request: IHttpRequestOptions): IDataObject[] => {
	const body = request.body as IDataObject | undefined;
	if (Array.isArray(body?.queries)) return (body.queries as string[]).map(parse);
	return Object.entries((request.qs ?? {}) as IDataObject)
		.filter(([key]) => key.startsWith('queries['))
		.map(([, value]) => parse(value as string));
};

describe('parseVector', () => {
	const { context } = createExecuteContext({
		parameters: { resource: 'vectorsDbDocument', operation: 'create' },
	});
	const vector = (value: unknown) => parseVector.call(context, value, 'Embeddings', 0);

	it('accepts a JSON array, a resolved array, or comma-separated numbers', () => {
		expect(vector('[0.12, -0.55, 8e-3]')).toEqual([0.12, -0.55, 0.008]);
		expect(vector([1, 2, 3])).toEqual([1, 2, 3]);
		expect(vector('0.5, 1,2')).toEqual([0.5, 1, 2]);
	});

	it('reads quoted numbers as numbers', () => {
		expect(vector(['0.25', ' -1 '])).toEqual([0.25, -1]);
	});

	it('returns an empty vector for an empty field', () => {
		expect(vector('')).toEqual([]);
		expect(vector('[]')).toEqual([]);
		expect(vector(undefined)).toEqual([]);
	});

	it('rejects anything that is not a list of finite numbers, naming the entry', () => {
		expect(() => vector('[1, "x"]')).toThrow(/must contain only numbers/);
		expect(() => vector([1, [2]])).toThrow(NodeOperationError);
		expect(() => vector([1, null])).toThrow(NodeOperationError);
		expect(() => vector([true])).toThrow(NodeOperationError);
		expect(() => vector('1, , 2')).toThrow(NodeOperationError);
		expect(() => vector('{"a": 1}')).toThrow(NodeOperationError);

		let thrown: NodeOperationError | undefined;
		try {
			vector([1, 2, 'abc']);
		} catch (error) {
			thrown = error as NodeOperationError;
		}
		expect(thrown?.description).toContain('Entry 3 is "abc"');
	});
});

describe('vector queries', () => {
	it('encode the vector as a single value, as the Appwrite SDK does', () => {
		expect(parse(Query.vectorCosine('embeddings', [1, 0]))).toEqual({
			method: 'vectorCosine',
			attribute: 'embeddings',
			values: [[1, 0]],
		});
		expect(parse(Query.vectorDot('embeddings', [1])).method).toBe('vectorDot');
		expect(parse(Query.vectorEuclidean('embeddings', [1])).method).toBe('vectorEuclidean');
	});
});

describe('VectorsDB documents', () => {
	const base = {
		resource: 'vectorsDbDocument',
		databaseId: 'kb',
		collectionId: 'chunks',
	};
	const documentsUrl = `${BASE_URL}/vectorsdb/kb/collections/chunks/documents`;

	it('creates a document from its embeddings and metadata', async () => {
		const { requests } = await run({
			...base,
			operation: 'create',
			documentId: 'doc-1',
			vectorEmbeddings: '[0.1, 0.2, 0.3]',
			vectorMetadata: '{"source": "faq"}',
			permissions: 'read("any")',
			options: { transactionId: 'tx-1' },
		});

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(documentsUrl);
		expect(requests[0].body).toEqual({
			documentId: 'doc-1',
			data: { embeddings: [0.1, 0.2, 0.3], metadata: { source: 'faq' } },
			permissions: ['read("any")'],
			transactionId: 'tx-1',
		});
	});

	it('leaves empty metadata out, and refuses to create a document without embeddings', async () => {
		const { requests } = await run({
			...base,
			operation: 'create',
			vectorEmbeddings: [1, 2],
		});
		expect((requests[0].body as IDataObject).data).toEqual({ embeddings: [1, 2] });

		const { context, requests: sent } = createExecuteContext({
			parameters: { ...base, operation: 'create', vectorEmbeddings: '[]' },
		});
		await expect(node.execute.call(context)).rejects.toThrow("The 'Embeddings' parameter is empty");
		expect(sent).toHaveLength(0);
	});

	it('updates only the parts that are given', async () => {
		const { requests } = await run({
			...base,
			operation: 'update',
			documentId: 'doc-1',
			vectorMetadata: { rank: 2 },
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${documentsUrl}/doc-1`);
		expect(requests[0].body).toEqual({ data: { metadata: { rank: 2 } } });
	});

	it.each([
		['cosine', 'vectorCosine'],
		['dot', 'vectorDot'],
		['euclidean', 'vectorEuclidean'],
	])('searches by %s similarity through the query endpoint', async (metric, method) => {
		const { requests, output } = await run(
			{
				...base,
				operation: 'search',
				searchVector: '[0.5, 0.25]',
				similarityMetric: metric,
				limit: 3,
				queriesUi: {
					queryValues: [{ type: 'equal', column: 'metadata', value: '{"source": "faq"}' }],
				},
				options: { transactionId: 'tx-1', ttl: 60 },
			},
			() => ({ total: 1, documents: [{ $id: 'doc-1' }] }),
		);

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${documentsUrl}/query`);
		expect(requests[0].qs).toBeUndefined();
		expect(queriesOf(requests[0])).toEqual([
			{ method, attribute: 'embeddings', values: [[0.5, 0.25]] },
			{ method: 'equal', attribute: 'metadata', values: [{ source: 'faq' }] },
			{ method: 'limit', values: [3] },
		]);
		expect(requests[0].body).toMatchObject({ transactionId: 'tx-1', ttl: 60 });
		expect(output).toEqual([{ $id: 'doc-1' }]);
	});

	it('refuses to search without a vector', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { ...base, operation: 'search', searchVector: '[]' },
		});
		await expect(node.execute.call(context)).rejects.toThrow("The 'Vector' parameter is empty");
		expect(requests).toHaveLength(0);
	});

	it('lists documents with a cache TTL and one item per document', async () => {
		const { requests, output } = await run(
			{ ...base, operation: 'getMany', limit: 2, options: { ttl: 30 } },
			() => ({ total: 2, documents: [{ $id: 'a' }, { $id: 'b' }] }),
		);
		expect(requests[0].method).toBe('GET');
		expect(requests[0].url).toBe(documentsUrl);
		expect(requests[0].qs).toMatchObject({ ttl: 30 });
		expect(queriesOf(requests[0])).toEqual([{ method: 'limit', values: [2] }]);
		expect(output).toEqual([{ $id: 'a' }, { $id: 'b' }]);
	});
});

describe('DocumentsDB documents', () => {
	const base = {
		resource: 'documentsDbDocument',
		databaseId: 'main',
		collectionId: 'articles',
	};
	const documentsUrl = `${BASE_URL}/documentsdb/main/collections/articles/documents`;

	it('builds document data from individual fields', async () => {
		const { requests } = await run({
			...base,
			operation: 'upsert',
			documentId: 'a1',
			dataMode: 'fields',
			dataFieldsUi: {
				fieldValues: [
					{ fieldName: 'title', fieldValue: 'Hello' },
					{ fieldName: 'views', fieldValue: '3' },
				],
			},
		});
		expect(requests[0].method).toBe('PUT');
		expect(requests[0].url).toBe(`${documentsUrl}/a1`);
		expect(requests[0].body).toEqual({ data: { title: 'Hello', views: 3 } });
	});

	it('increments an attribute within a transaction, up to a maximum', async () => {
		const { requests } = await run({
			...base,
			operation: 'increment',
			documentId: 'a1',
			documentAttribute: 'views',
			amount: 2,
			options: { max: 10, transactionId: 'tx-1' },
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${documentsUrl}/a1/views/increment`);
		expect(requests[0].body).toEqual({ value: 2, max: 10, transactionId: 'tx-1' });
	});

	it('deletes a document in a transaction and reports what was deleted', async () => {
		const { requests, output } = await run({
			...base,
			operation: 'delete',
			documentId: 'a1',
			options: { transactionId: 'tx-1' },
		});
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].qs).toEqual({ transactionId: 'tx-1' });
		expect(output).toEqual([{ deleted: true, documentId: 'a1' }]);
	});

	it('pages through every document with Return All', async () => {
		const page = (from: number, count: number) =>
			Array.from({ length: count }, (_, index) => ({ $id: `d${from + index}` }));
		const { requests, output } = await run(
			{ ...base, operation: 'getMany', returnAll: true },
			(_request, index) => ({ documents: index === 0 ? page(0, 100) : page(100, 5) }),
		);
		expect(requests).toHaveLength(2);
		expect(queriesOf(requests[1])).toContainEqual({ method: 'cursorAfter', values: ['d99'] });
		expect(output).toHaveLength(105);
	});
});

describe('document database resources', () => {
	it('keep a disabled database disabled when renaming it', async () => {
		const { requests } = await run(
			{
				resource: 'documentsDbDatabase',
				operation: 'update',
				databaseId: 'main',
				name: 'Renamed',
				updateFields: { replicas: 2, syncMode: 'quorum' },
			},
			(request) => (request.method === 'GET' ? { $id: 'main', enabled: false } : { $id: 'main' }),
		);
		expect(requests.map((request) => request.method)).toEqual(['GET', 'PUT']);
		expect(requests[1].url).toBe(`${BASE_URL}/documentsdb/main`);
		expect(requests[1].body).toEqual({
			name: 'Renamed',
			enabled: false,
			replicas: 2,
			syncMode: 'quorum',
		});
	});

	it('pages through lifecycle operations by offset until the total is reached', async () => {
		const page = (count: number) => Array.from({ length: count }, () => ({ $id: 'op' }));
		const { requests, output } = await run(
			{
				resource: 'vectorsDbDatabase',
				operation: 'getManyOperations',
				databaseId: 'kb',
				returnAll: true,
				options: { status: 'failed' },
			},
			(_request, index) => ({ total: 150, operations: index === 0 ? page(100) : page(50) }),
		);
		expect(requests.map((request) => request.qs)).toEqual([
			{ status: 'failed', limit: 100, offset: 0 },
			{ status: 'failed', limit: 100, offset: 100 },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/vectorsdb/kb/operations`);
		expect(output).toHaveLength(150);
	});

	it.each([
		['documentsDbDatabase', 'documentsdb'],
		['vectorsDbDatabase', 'vectorsdb'],
	])('runs the transactions of %s against its own API', async (resource, api) => {
		const { requests } = await run({
			resource,
			operation: 'commitTransaction',
			transactionId: 'tx-1',
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${BASE_URL}/${api}/transactions/tx-1`);
		expect(requests[0].body).toEqual({ commit: true });
	});

	it('creates a VectorsDB collection with its dimension', async () => {
		const { requests } = await run({
			resource: 'vectorsDbCollection',
			operation: 'create',
			databaseId: 'kb',
			collectionId: 'chunks',
			name: 'Chunks',
			vectorDimension: 768,
		});
		expect(requests[0].url).toBe(`${BASE_URL}/vectorsdb/kb/collections`);
		expect(requests[0].body).toEqual({ collectionId: 'chunks', name: 'Chunks', dimension: 768 });
	});

	it('creates a DocumentsDB collection with attribute and index definitions', async () => {
		const attributes = [{ key: 'title', type: 'varchar', size: 255 }];
		const { requests } = await run({
			resource: 'documentsDbCollection',
			operation: 'create',
			databaseId: 'main',
			collectionId: 'articles',
			name: 'Articles',
			options: { attributes: JSON.stringify(attributes), indexes: '[]', documentSecurity: true },
		});
		expect(requests[0].body).toEqual({
			collectionId: 'articles',
			name: 'Articles',
			documentSecurity: true,
			attributes,
		});
	});

	it('keep collection settings the user leaves out when updating', async () => {
		const { requests } = await run(
			{
				resource: 'documentsDbCollection',
				operation: 'update',
				databaseId: 'main',
				collectionId: 'articles',
				name: 'Articles',
				updateFields: { purge: true },
			},
			(request) =>
				request.method === 'GET' ? { enabled: false, documentSecurity: true } : { $id: 'articles' },
		);
		expect(requests[1].method).toBe('PUT');
		expect(requests[1].body).toEqual({
			name: 'Articles',
			enabled: false,
			documentSecurity: true,
			purge: true,
		});
	});

	it('creates a vector index on the embeddings', async () => {
		const { requests } = await run({
			resource: 'vectorsDbCollection',
			operation: 'createIndex',
			databaseId: 'kb',
			collectionId: 'chunks',
			key: 'by_similarity',
			indexType: 'hnsw_dot',
			indexAttributes: 'embeddings',
		});
		expect(requests[0].url).toBe(`${BASE_URL}/vectorsdb/kb/collections/chunks/indexes`);
		expect(requests[0].body).toEqual({
			key: 'by_similarity',
			type: 'hnsw_dot',
			attributes: ['embeddings'],
		});
	});
});

describe('document database pickers', () => {
	it('filter databases by name or ID locally, since the API takes no search term', async () => {
		const full = Array.from({ length: 100 }, (_, index) => ({ $id: `db${index}`, name: 'Other' }));
		const { context, requests } = createLoadOptionsContext({
			respond: (_request, index) => ({
				databases: index === 0 ? full : [{ $id: 'kb', name: 'Knowledge Base' }],
			}),
		});

		expect(await searchDocumentsDbDatabases.call(context, 'knowledge')).toEqual({
			results: [{ name: 'Knowledge Base', value: 'kb' }],
			paginationToken: undefined,
		});
		// The page without a match is skipped rather than shown empty.
		expect(requests).toHaveLength(2);
		expect(requests[0].url).toBe(`${BASE_URL}/documentsdb`);
		expect((requests[0].qs as IDataObject).search).toBeUndefined();
		expect(parse((requests[1].qs as Record<string, string>)['queries[1]'])).toEqual({
			method: 'cursorAfter',
			values: ['db99'],
		});
	});

	it("list a database's collections with Appwrite's search", async () => {
		const { context, requests } = createLoadOptionsContext({
			current: { databaseId: { __rl: true, mode: 'id', value: 'kb' } },
			respond: () => ({ collections: [{ $id: 'chunks', name: 'Chunks' }] }),
		});
		expect((await searchVectorsDbCollections.call(context, 'chu')).results).toEqual([
			{ name: 'Chunks', value: 'chunks' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/vectorsdb/kb/collections`);
		expect((requests[0].qs as IDataObject).search).toBe('chu');

		const { context: blank } = createLoadOptionsContext();
		expect(await searchVectorsDbCollections.call(blank)).toEqual({ results: [] });
	});
});

describe('document query builder wording', () => {
	const builderField = (resource: string) => {
		const queries = description.properties.find(
			(property) =>
				property.name === 'queriesUi' &&
				(property.displayOptions?.show?.resource as string[]).includes(resource),
		);
		const values = (
			queries?.options?.[0] as { values: Array<{ name: string; displayName: string }> }
		).values;
		return values.find((value) => value.name === 'column')?.displayName;
	};

	it('says attribute for documents and keeps column for rows', () => {
		expect(builderField('documentsDbDocument')).toBe('Attribute');
		expect(builderField('vectorsDbDocument')).toBe('Attribute');
		expect(builderField('row')).toBe('Column');
	});
});
