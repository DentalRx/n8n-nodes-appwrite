import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	getAvailablePostgresqlExtensions,
	getInstalledPostgresqlExtensions,
} from '../nodes/Appwrite/methods/loadOptions';
import { searchDedicatedDatabases } from '../nodes/Appwrite/methods/listSearch';
import type { Responder } from './helpers/mock-context';
import {
	BASE_URL,
	createExecuteContext,
	createLoadOptionsContext,
	node,
} from './helpers/mock-context';

/** Run one Dedicated Database operation and return its requests and output items. */
async function run(parameters: INodeParameters, respond: Responder = () => ({})) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'dedicatedDatabase', ...parameters },
		respond,
	});
	const [output] = await node.execute.call(context);
	return { requests, items: output.map((item) => item.json) };
}

/** Run an operation that must fail, and return the error and the requests sent before it. */
async function runFailing(parameters: INodeParameters, respond: Responder = () => ({})) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'dedicatedDatabase', ...parameters },
		respond,
	});
	const error = await node.execute.call(context).then(
		() => undefined,
		(thrown: unknown) => thrown,
	);
	expect(error).toBeInstanceOf(NodeOperationError);
	return { error: error as NodeOperationError, requests };
}

const sql = (
	engine: string,
	options: INodeParameters = {},
	statement = 'SELECT 1',
): INodeParameters => ({
	operation: 'executeSql',
	databaseEngine: engine,
	dedicatedDatabaseId: 'orders',
	sqlStatement: statement,
	options,
});

describe('Dedicated Database paths', () => {
	it.each([
		['mongodb', '/mongo'],
		['mysql', '/mysql'],
		['postgresql', '/postgresql'],
	])('builds the %s paths under %s', async (databaseEngine, prefix) => {
		const get = await run({ operation: 'get', databaseEngine, dedicatedDatabaseId: 'orders' });
		expect(get.requests[0].url).toBe(`${BASE_URL}${prefix}/orders`);

		const list = await run({ operation: 'getMany', databaseEngine, limit: 5 }, () => ({
			databases: [],
		}));
		expect(list.requests[0].url).toBe(`${BASE_URL}${prefix}`);

		const specifications = await run({ operation: 'getManySpecifications', databaseEngine });
		expect(specifications.requests[0].url).toBe(`${BASE_URL}${prefix}/specifications`);

		const policy = await run({
			operation: 'getBackupPolicy',
			databaseEngine,
			dedicatedDatabaseId: 'orders',
			backupPolicyId: 'nightly',
		});
		expect(policy.requests[0].url).toBe(`${BASE_URL}${prefix}/orders/backups/policies/nightly`);
	});

	it('takes the database ID from a Console URL', async () => {
		const { requests } = await run({
			operation: 'getStatus',
			databaseEngine: 'mysql',
			dedicatedDatabaseId: {
				__rl: true,
				mode: 'url',
				value: 'https://cloud.appwrite.io/console/project-fra-p/databases/database-orders',
			},
		});
		expect(requests[0].url).toBe(`${BASE_URL}/mysql/orders/status`);
	});

	it('refuses engine-specific operations for other engines before sending anything', async () => {
		const sqlOnMongo = await runFailing(sql('mongodb'));
		expect(sqlOnMongo.error.message).toBe('This operation is not available for MongoDB databases');
		expect(sqlOnMongo.error.description).toContain('MySQL and PostgreSQL');
		expect(sqlOnMongo.requests).toHaveLength(0);

		const extensionOnMysql = await runFailing({
			operation: 'installExtension',
			databaseEngine: 'mysql',
			dedicatedDatabaseId: 'orders',
			extensionName: 'vector',
		});
		expect(extensionOnMysql.error.description).toContain('PostgreSQL databases only');
		expect(extensionOnMysql.requests).toHaveLength(0);
	});

	it('offers only the engines an operation supports', () => {
		const engineOptions = (operation: string) =>
			node.description.properties
				.filter(
					(property) =>
						property.name === 'databaseEngine' &&
						(property.displayOptions?.show?.operation as string[]).includes(operation),
				)
				.map((property) => (property.options ?? []).map((option) => option.name));

		expect(engineOptions('get')).toEqual([['MongoDB', 'MySQL', 'PostgreSQL']]);
		expect(engineOptions('executeSql')).toEqual([['MySQL', 'PostgreSQL']]);
		expect(engineOptions('updatePooler')).toEqual([['MySQL', 'PostgreSQL']]);
		expect(engineOptions('installExtension')).toEqual([['PostgreSQL']]);
	});
});

describe('Dedicated Database › Execute SQL', () => {
	const result = {
		rows: [
			{ id: 1, status: 'open' },
			{ id: 2, status: 'open' },
		],
		rowCount: 2,
		columns: [
			{ name: 'id', type: 'int4' },
			{ name: 'status', type: 'text' },
		],
		durationMs: 3,
		truncated: false,
		bytes: 64,
	};

	it('sends the statement, bindings and timeout, and outputs one item per row', async () => {
		const { requests, items } = await run(
			sql(
				'postgresql',
				{ bindings: '["open", 10]', timeoutSeconds: 5 },
				'SELECT id, status FROM orders WHERE status = $1 LIMIT $2',
			),
			() => result,
		);

		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/postgresql/orders/executions`);
		expect(requests[0].body).toEqual({
			sql: 'SELECT id, status FROM orders WHERE status = $1 LIMIT $2',
			bindings: ['open', 10],
			timeoutSeconds: 5,
		});
		expect(items).toEqual(result.rows);
	});

	it('accepts bindings an expression already resolved, including named ones', async () => {
		const positional = await run(sql('mysql', { bindings: ['open', 10] }), () => result);
		expect(positional.requests[0].url).toBe(`${BASE_URL}/mysql/orders/executions`);
		expect(positional.requests[0].body).toMatchObject({ bindings: ['open', 10] });

		const named = await run(sql('mysql', { bindings: { status: 'open' } }), () => result);
		expect(named.requests[0].body).toMatchObject({ bindings: { status: 'open' } });
	});

	it('sends no bindings when there are none', async () => {
		for (const bindings of ['[]', '', '{}', []]) {
			const { requests } = await run(sql('postgresql', { bindings }), () => result);
			expect(requests[0].body).toEqual({ sql: 'SELECT 1' });
		}
	});

	it('rejects bindings that are not a JSON array or object', async () => {
		const scalar = await runFailing(sql('postgresql', { bindings: '42' }));
		expect(scalar.error.message).toBe("Parameter 'Bindings' must be a JSON array or object");
		expect(scalar.requests).toHaveLength(0);

		const broken = await runFailing(sql('postgresql', { bindings: '["open",' }));
		expect(broken.error.message).toBe("Parameter 'Bindings' is not valid JSON");
	});

	it('rejects an empty statement', async () => {
		const { error, requests } = await runFailing(sql('postgresql', {}, '  '));
		expect(error.message).toBe("The 'SQL Statement' parameter is empty");
		expect(requests).toHaveLength(0);
	});

	it('outputs the affected row count for a statement without a result set', async () => {
		const { items } = await run(sql('mysql', {}, 'UPDATE orders SET status = ?'), () => ({
			rows: [],
			rowCount: 7,
			columns: [],
			durationMs: 4,
			truncated: false,
			bytes: 0,
		}));
		expect(items).toEqual([{ rowCount: 7, durationMs: 4, truncated: false, bytes: 0 }]);
	});

	it('outputs no items for a query that matched no rows', async () => {
		const { items } = await run(sql('postgresql'), () => ({ ...result, rows: [], rowCount: 0 }));
		expect(items).toEqual([]);
	});

	it('stops on a truncated result unless the full response is asked for', async () => {
		const truncated = { ...result, truncated: true };

		const { error } = await runFailing(sql('postgresql'), () => truncated);
		expect(error.message).toContain('truncated');
		expect(error.description).toContain('Full Response');

		const { items } = await run(sql('postgresql', { output: 'fullResponse' }), () => truncated);
		expect(items).toEqual([truncated]);
	});
});

describe('Dedicated Database › request shaping', () => {
	it('creates a database with only the options that were added', async () => {
		const { requests } = await run({
			operation: 'create',
			databaseEngine: 'mongodb',
			name: 'Orders',
			dedicatedDatabaseId: 'orders',
			options: { replicas: 2, networkIPAllowlist: '203.0.113.7, 198.51.100.0/24', version: '' },
		});
		expect(requests[0].url).toBe(`${BASE_URL}/mongo`);
		expect(requests[0].body).toEqual({
			databaseId: 'orders',
			name: 'Orders',
			replicas: 2,
			networkIPAllowlist: ['203.0.113.7', '198.51.100.0/24'],
		});
	});

	it('updates only the fields that were set', async () => {
		const { requests } = await run({
			operation: 'update',
			databaseEngine: 'postgresql',
			dedicatedDatabaseId: 'orders',
			updateFields: { status: 'paused', name: '', sqlApiAllowedStatements: ['SELECT'] },
		});
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].body).toEqual({ status: 'paused', sqlApiAllowedStatements: ['SELECT'] });
	});

	it('resets an emptied pooler override to its default', async () => {
		const { requests } = await run({
			operation: 'updatePooler',
			databaseEngine: 'mysql',
			dedicatedDatabaseId: 'orders',
			updateFields: { mode: 'session', poolerCpuLimit: '', poolerMemoryLimit: '512Mi' },
		});
		expect(requests[0].url).toBe(`${BASE_URL}/mysql/orders/pooler`);
		expect(requests[0].body).toEqual({
			mode: 'session',
			poolerCpuLimit: null,
			poolerMemoryLimit: '512Mi',
		});
	});

	it('restores from a backup or to a point in time', async () => {
		const fromBackup = await run({
			operation: 'restore',
			databaseEngine: 'postgresql',
			dedicatedDatabaseId: 'orders',
			restorationType: 'backup',
			backupId: 'b1',
		});
		expect(fromBackup.requests[0].body).toEqual({ type: 'backup', backupId: 'b1' });

		const toPoint = await run({
			operation: 'restore',
			databaseEngine: 'postgresql',
			dedicatedDatabaseId: 'orders',
			restorationType: 'pitr',
			restorationTargetTime: '2026-09-01T12:00:00.000Z',
			options: { targetDatabaseId: 'orders-copy' },
		});
		expect(toPoint.requests[0].body).toEqual({
			type: 'pitr',
			targetTime: '2026-09-01T12:00:00.000Z',
			targetDatabaseId: 'orders-copy',
		});
	});

	it('pages operations by offset until the reported total', async () => {
		const page = (count: number, from: number) =>
			Array.from({ length: count }, (_, index) => ({ $id: `op${from + index}` }));
		const { requests, items } = await run(
			{
				operation: 'getManyOperations',
				databaseEngine: 'mysql',
				dedicatedDatabaseId: 'orders',
				returnAll: true,
				options: { status: 'failed' },
			},
			(_request, index) => ({ total: 150, operations: index === 0 ? page(100, 0) : page(50, 100) }),
		);
		expect(items).toHaveLength(150);
		expect(requests.map((request) => request.qs)).toEqual([
			{ status: 'failed', limit: 100, offset: 0 },
			{ status: 'failed', limit: 100, offset: 100 },
		]);
	});

	it('outputs the IDs of a deleted backup policy', async () => {
		const { requests, items } = await run({
			operation: 'deleteBackupPolicy',
			databaseEngine: 'mongodb',
			dedicatedDatabaseId: 'orders',
			backupPolicyId: 'nightly',
		});
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].url).toBe(`${BASE_URL}/mongo/orders/backups/policies/nightly`);
		expect(items).toEqual([{ deleted: true, databaseId: 'orders', policyId: 'nightly' }]);
	});

	it('leaves the connection credentials out of a simplified database', async () => {
		const { items } = await run(
			{
				operation: 'get',
				databaseEngine: 'postgresql',
				dedicatedDatabaseId: 'orders',
				simplify: true,
			},
			() => ({
				$id: 'orders',
				name: 'Orders',
				engine: 'postgresql',
				connectionUser: 'admin',
				connectionPassword: 'secret',
				connectionString: 'postgresql://admin:secret@db:5432/db',
			}),
		);
		expect(items).toEqual([
			{ $id: 'orders', name: 'Orders', engine: 'postgresql', connectionUser: 'admin' },
		]);
	});
});

describe('Dedicated Database pickers', () => {
	it("lists the chosen engine's databases and filters them locally", async () => {
		const { context, requests } = createLoadOptionsContext({
			current: { databaseEngine: 'mongodb' },
			respond: () => ({
				databases: [
					{ $id: 'orders', name: 'Orders' },
					{ $id: 'events', name: 'Event log' },
				],
			}),
		});

		expect((await searchDedicatedDatabases.call(context, 'ORD')).results).toEqual([
			{ name: 'Orders', value: 'orders' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/mongo`);
		// The list endpoint takes no search parameter.
		expect((requests[0].qs as IDataObject).search).toBeUndefined();
	});

	it('lists nothing until an engine is chosen', async () => {
		const { context, requests } = createLoadOptionsContext({ current: {} });
		expect(await searchDedicatedDatabases.call(context)).toEqual({ results: [] });
		expect(requests).toHaveLength(0);
	});

	it('lists available and installed extensions with their curated names', async () => {
		const extensions = {
			installed: ['vector'],
			available: ['vector', 'postgis', 'hstore'],
			metadata: [
				{ key: 'vector', name: 'pgvector', description: 'Vector similarity search' },
				{ key: 'postgis', name: 'PostGIS', description: 'Spatial types' },
			],
		};
		const { context, requests } = createLoadOptionsContext({
			current: { dedicatedDatabaseId: { __rl: true, mode: 'id', value: 'orders' } },
			respond: () => extensions,
		});

		expect(await getAvailablePostgresqlExtensions.call(context)).toEqual([
			{ name: 'hstore', value: 'hstore' },
			{ name: 'pgvector', value: 'vector', description: 'Vector similarity search' },
			{ name: 'PostGIS', value: 'postgis', description: 'Spatial types' },
		]);
		expect(await getInstalledPostgresqlExtensions.call(context)).toEqual([
			{ name: 'pgvector', value: 'vector', description: 'Vector similarity search' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/postgresql/orders/extensions`);
	});
});
