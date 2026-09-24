import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

const DATABASE = { __rl: true, mode: 'id', value: 'main' };

/** A dedicated database with `count` recorded operations, served by limit and offset. */
function operationsLog(count: number) {
	const all = Array.from({ length: count }, (_, index) => ({ $id: `op${index}`, type: 'backup' }));
	return (request: IHttpRequestOptions) => {
		const { limit, offset } = request.qs as { limit: number; offset: number };
		return { total: count, operations: all.slice(offset, offset + limit) };
	};
}

async function run(parameters: IDataObject, respond: (request: IHttpRequestOptions) => unknown) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'database', ...parameters },
		respond,
	});
	const [output] = await node.execute.call(context);
	return { output, requests };
}

describe('Database › Get Many Operations', () => {
	it('pages through every operation with limit and offset when returning all', async () => {
		const { output, requests } = await run(
			{ operation: 'getManyOperations', databaseId: DATABASE, returnAll: true },
			operationsLog(60),
		);

		expect(output).toHaveLength(60);
		expect(requests.map((request) => request.url)).toEqual(
			Array(3).fill(`${BASE_URL}/tablesdb/main/operations`),
		);
		expect(requests.map((request) => request.qs)).toEqual([
			{ limit: 25, offset: 0 },
			{ limit: 25, offset: 25 },
			{ limit: 25, offset: 50 },
		]);
	});

	it('stops at the limit, asking only for what is still missing', async () => {
		const { output, requests } = await run(
			{ operation: 'getManyOperations', databaseId: DATABASE, limit: 30 },
			operationsLog(60),
		);

		expect(output).toHaveLength(30);
		expect(requests.map((request) => request.qs)).toEqual([
			{ limit: 25, offset: 0 },
			{ limit: 5, offset: 25 },
		]);
	});

	it('filters by status and simplifies on request', async () => {
		const { output, requests } = await run(
			{
				operation: 'getManyOperations',
				databaseId: DATABASE,
				limit: 5,
				simplify: true,
				options: { operationStatus: 'failed' },
			},
			() => ({
				total: 1,
				operations: [{ $id: 'op1', databaseId: 'main', status: 'failed', errorCode: 'Timeout' }],
			}),
		);

		expect(requests[0].qs).toEqual({ status: 'failed', limit: 5, offset: 0 });
		expect(output[0].json).toEqual({ $id: 'op1', status: 'failed', errorCode: 'Timeout' });
	});
});

describe('Database › migrations to dedicated compute', () => {
	it('starts a migration, leaving Auto Cutover to Appwrite unless set', async () => {
		const { requests } = await run(
			{ operation: 'createMigration', databaseId: DATABASE, databaseSpecification: 's-2vcpu-4gb' },
			() => ({ $id: 'm1' }),
		);

		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/tablesdb/main/migrations`);
		expect(requests[0].body).toEqual({ specification: 's-2vcpu-4gb' });
	});

	it('cuts a parked migration over', async () => {
		const { requests } = await run(
			{ operation: 'createCutover', databaseId: DATABASE, databaseMigrationId: 'm1' },
			() => ({ $id: 'm1' }),
		);

		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/tablesdb/main/migrations/m1/cutovers`);
	});

	it('reports the aborted migration', async () => {
		const { output } = await run(
			{ operation: 'deleteMigration', databaseId: DATABASE, databaseMigrationId: 'm1' },
			() => '',
		);

		expect(output[0].json).toEqual({ deleted: true, databaseId: 'main', migrationId: 'm1' });
	});
});
