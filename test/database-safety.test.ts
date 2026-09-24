import type { IDataObject, IHttpRequestOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import type { Responder } from './helpers/mock-context';
import { BASE_URL, createExecuteContext, node, testNode } from './helpers/mock-context';

const DATABASE = { __rl: true, mode: 'id', value: 'main' };
const TABLE = { __rl: true, mode: 'id', value: 'orders' };
const ROWS = `${BASE_URL}/tablesdb/main/tables/orders/rows`;
const STATUS_QUERY = {
	queryValues: [{ type: 'equal', column: 'status', value: 'cancelled' }],
};

/** The queries of a request, which go out as `queries[0]`, `queries[1]`, ... */
const queriesOf = (request: IHttpRequestOptions): Array<{ method: string; values?: unknown[] }> =>
	Object.entries((request.qs ?? {}) as Record<string, string>)
		.filter(([key]) => key.startsWith('queries['))
		.map(([, query]) => JSON.parse(query) as { method: string; values?: unknown[] });

async function run(parameters: IDataObject, respond: Responder = () => ({})) {
	const { context, requests } = createExecuteContext({
		parameters: parameters as never,
		respond,
	});
	const outcome = await node.execute.call(context).then(
		([output]) => ({ output, error: undefined }),
		(error: unknown) => ({ output: undefined, error }),
	);
	return { ...outcome, requests };
}

const rows = (parameters: IDataObject, respond?: Responder) =>
	run({ resource: 'row', databaseId: DATABASE, tableId: TABLE, ...parameters }, respond);

describe('bulk writes', () => {
	it('output a summary inside a transaction, where Appwrite stages the rows and returns none', async () => {
		const { output } = await rows(
			{
				operation: 'createMany',
				rowsJson: '[{"a": 1}, {"a": 2}]',
				options: { transactionId: 'tx1' },
			},
			() => ({ rows: [], total: 2 }),
		);
		expect(output?.map((item) => item.json)).toEqual([{ total: 2, transactionId: 'tx1' }]);
	});

	it('output one item per written row outside a transaction', async () => {
		const { output } = await rows({ operation: 'upsertMany', rowsJson: '[{"$id": "r1"}]' }, () => ({
			rows: [{ $id: 'r1' }],
			total: 1,
		}));
		expect(output?.map((item) => item.json)).toEqual([{ $id: 'r1' }]);
	});

	it('output a summary when an update matches no rows, so the workflow goes on', async () => {
		const { output } = await rows(
			{
				operation: 'updateMany',
				queriesUi: STATUS_QUERY,
				dataMode: 'json',
				dataJson: '{"status": "archived"}',
			},
			() => ({ rows: [], total: 0 }),
		);
		expect(output?.map((item) => item.json)).toEqual([{ total: 0 }]);
	});

	it('confirm a bulk delete with one item, like every other delete', async () => {
		const { output, requests } = await rows(
			{ operation: 'deleteMany', queriesUi: STATUS_QUERY },
			() => ({ rows: [{ $id: 'r1' }, { $id: 'r2' }], total: 2 }),
		);
		expect(requests[0].method).toBe('DELETE');
		expect(output?.map((item) => item.json)).toEqual([{ deleted: true, total: 2 }]);
	});
});

describe('Update Many and Delete Many without a query', () => {
	it.each(['updateMany', 'deleteMany'])(
		'%s refuses to act on every row unless Apply to All Rows is on',
		async (operation) => {
			const parameters = { operation, dataMode: 'json', dataJson: '{"status": "archived"}' };

			const refused = await rows(parameters);
			expect(refused.error).toBeInstanceOf(NodeOperationError);
			expect((refused.error as Error).message).toBe('No query selects which rows to change');
			expect(refused.requests).toHaveLength(0);

			const allowed = await rows({ ...parameters, applyToAll: true }, () => ({ total: 3 }));
			expect(allowed.error).toBeUndefined();
			expect(allowed.requests[0].url).toBe(ROWS);
		},
	);

	it('guards DocumentsDB and VectorsDB documents too', async () => {
		const { error, requests } = await run({
			resource: 'documentsDbDocument',
			operation: 'deleteMany',
			databaseId: DATABASE,
			collectionId: { __rl: true, mode: 'id', value: 'articles' },
		});
		expect((error as Error).message).toBe('No query selects which documents to change');
		expect(requests).toHaveLength(0);
	});
});

describe('transactions', () => {
	it('page Return All by offset, as Appwrite cannot resolve a cursor in this list', async () => {
		const all = Array.from({ length: 150 }, (_, index) => ({ $id: `t${index}` }));
		const { output, requests } = await run(
			{ resource: 'transaction', operation: 'getMany', returnAll: true },
			(request) => {
				const offset = queriesOf(request).find((query) => query.method === 'offset');
				const start = (offset?.values?.[0] as number | undefined) ?? 0;
				return { transactions: all.slice(start, start + 100), total: all.length };
			},
		);
		expect(output).toHaveLength(150);
		const methods = requests.map((request) => queriesOf(request).map((query) => query.method));
		expect(methods.flat()).not.toContain('cursorAfter');
	});

	it('generate the IDs of staged records given as unique()', async () => {
		const { requests } = await run({
			resource: 'transaction',
			operation: 'createOperations',
			transactionId: 'tx1',
			operationsJson: JSON.stringify([
				{ action: 'create', databaseId: 'main', tableId: 'orders', rowId: 'unique()', data: {} },
				{ action: 'update', databaseId: 'main', tableId: 'orders', rowId: 'r1', data: {} },
			]),
		});
		const [created, updated] = (requests[0].body as { operations: IDataObject[] }).operations;
		expect(created.rowId).toMatch(/^[0-9a-f]{20}$/);
		expect(updated.rowId).toBe('r1');
	});
});

describe('Column → Update', () => {
	const update = (options: IDataObject, current: IDataObject) =>
		run(
			{
				resource: 'column',
				operation: 'update',
				databaseId: DATABASE,
				tableId: TABLE,
				columnType: 'integer',
				key: 'quantity',
				options,
			},
			(request) => (request.method === 'GET' ? { key: 'quantity', ...current } : {}),
		);

	it("keeps the column's Required and Default unless they are set", async () => {
		const { requests } = await update({ newKey: 'qty' }, { required: true, default: null });
		expect(requests.map((request) => request.method)).toEqual(['GET', 'PATCH']);
		expect(requests[1].body).toMatchObject({ required: true, default: null, newKey: 'qty' });

		const optional = await update({}, { required: false, default: 5 });
		expect(optional.requests[1].body).toMatchObject({ required: false, default: 5 });
	});

	it('removes the default when Default Value is added empty, or the column becomes required', async () => {
		const cleared = await update({ defaultValue: '' }, { required: false, default: 5 });
		expect(cleared.requests[1].body).toMatchObject({ required: false, default: null });

		const required = await update({ required: true }, { required: false, default: 5 });
		expect(required.requests[1].body).toMatchObject({ required: true, default: null });

		const changed = await update({ defaultValue: '7' }, { required: false, default: 5 });
		expect(changed.requests[1].body).toMatchObject({ required: false, default: 7 });
	});
});

describe('Return All with a sort', () => {
	it('continues by offset once Appwrite cannot page past a null sort value', async () => {
		const page = (start: number, count: number) =>
			Array.from({ length: count }, (_, index) => ({ $id: `r${start + index}` }));
		const respond: Responder = (request: IHttpRequestOptions, index) => {
			if (index === 1) {
				throw new NodeApiError(testNode, {
					response: {
						status: 400,
						data: {
							message:
								'The order attribute/column had a null value. Cursor pagination requires all documents/rows order attribute/column values are non-null.',
							code: 400,
							type: 'database_query_order_null',
						},
					},
				} as unknown as JsonObject);
			}
			return { rows: index === 0 ? page(0, 100) : page(100, 20), total: 120 };
		};
		const { output, requests, error } = await rows(
			{
				operation: 'getMany',
				returnAll: true,
				sortUi: { sortValues: [{ column: 'dueDate', direction: 'asc' }] },
			},
			respond,
		);
		expect(error).toBeUndefined();
		expect(output).toHaveLength(120);
		const last = queriesOf(requests[2]);
		expect(last).toContainEqual({ method: 'offset', values: [100] });
		expect(last.map((query) => query.method)).not.toContain('cursorAfter');
	});
});
