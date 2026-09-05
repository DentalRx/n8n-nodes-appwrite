import { describe, expect, it } from 'vitest';

import { Query } from '../nodes/Appwrite/helpers/appwrite';
import {
	getBuckets,
	getColumns,
	getDatabases,
	getRuntimes,
	getTables,
	getUsers,
} from '../nodes/Appwrite/methods/loadOptions';
import { BASE_URL, createLoadOptionsContext } from './helpers/mock-context';

const parse = (query: string) => JSON.parse(query) as { method: string; values?: unknown[] };

describe('load options', () => {
	it('lists databases sorted by name, ignoring case', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({
				databases: [
					{ $id: 'b', name: 'beta' },
					{ $id: 'a', name: 'Alpha' },
					{ $id: 'c', name: '' },
				],
			}),
		});

		expect(await getDatabases.call(context)).toEqual([
			{ name: 'Alpha', value: 'a' },
			{ name: 'beta', value: 'b' },
			{ name: 'c', value: 'c' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/tablesdb`);
		expect(parse((requests[0].qs as Record<string, string>)['queries[0]'])).toEqual({
			method: 'limit',
			values: [100],
		});
	});

	it('pages through long lists with cursors, up to the option cap', async () => {
		const page = (from: number, count: number) =>
			Array.from({ length: count }, (_, i) => ({
				$id: `b${from + i}`,
				name: `Bucket ${from + i}`,
			}));
		const { context, requests } = createLoadOptionsContext({
			respond: (_request, index) => ({ buckets: index === 0 ? page(0, 100) : page(100, 20) }),
		});

		expect(await getBuckets.call(context)).toHaveLength(120);
		expect(requests).toHaveLength(2);
		const second = requests[1].qs as Record<string, string>;
		expect(parse(second['queries[1]'])).toEqual({ method: 'cursorAfter', values: ['b99'] });
	});

	it('returns nothing for dependent pickers until their parent is chosen', async () => {
		const { context, requests } = createLoadOptionsContext({ current: { databaseId: '' } });
		expect(await getTables.call(context)).toEqual([]);
		expect(await getColumns.call(context)).toEqual([]);
		expect(requests).toHaveLength(0);
	});

	it('accepts a Console URL in the parent picker', async () => {
		const { context, requests } = createLoadOptionsContext({
			current: {
				databaseId: 'https://cloud.appwrite.io/console/project-p/databases/database-main',
			},
			respond: () => ({ tables: [{ $id: 't1', name: 'Orders' }] }),
		});
		expect(await getTables.call(context)).toEqual([{ name: 'Orders', value: 't1' }]);
		expect(requests[0].url).toBe(`${BASE_URL}/tablesdb/main/tables`);
	});

	it('identifies columns by key and pages them by offset', async () => {
		const { context, requests } = createLoadOptionsContext({
			current: { databaseId: 'db', tableId: 'orders' },
			respond: (_request, index) =>
				index === 0
					? {
							columns: Array.from({ length: 100 }, (_, i) => ({
								key: `c${String(i).padStart(3, '0')}`,
							})),
						}
					: { columns: [{ key: 'zzz' }] },
		});

		const options = await getColumns.call(context);
		expect(options).toHaveLength(101);
		expect(options[0]).toEqual({ name: 'c000', value: 'c000' });
		expect(requests[0].url).toBe(`${BASE_URL}/tablesdb/db/tables/orders/columns`);
		expect(parse((requests[1].qs as Record<string, string>)['queries[1]'])).toEqual({
			method: 'offset',
			values: [100],
		});
	});

	it('labels users by name, then email, then phone', async () => {
		const { context } = createLoadOptionsContext({
			respond: () => ({
				users: [
					{ $id: 'u1', name: '', email: 'a@example.com', phone: '+1' },
					{ $id: 'u2', name: 'Bea', email: 'b@example.com' },
					{ $id: 'u3', name: '', email: '', phone: '+2' },
				],
			}),
		});
		expect(await getUsers.call(context)).toEqual([
			{ name: '+2', value: 'u3' },
			{ name: 'a@example.com', value: 'u1' },
			{ name: 'Bea', value: 'u2' },
		]);
	});

	it('labels runtimes with their version so families are distinguishable', async () => {
		const { context } = createLoadOptionsContext({
			respond: () => ({
				runtimes: [
					{ $id: 'node-20.0', name: 'Node.js', version: '20.0' },
					{ $id: 'node-18.0', name: 'Node.js', version: '18.0' },
				],
			}),
		});
		expect(await getRuntimes.call(context)).toEqual([
			{ name: 'Node.js 18.0', value: 'node-18.0' },
			{ name: 'Node.js 20.0', value: 'node-20.0' },
		]);
	});

	it('uses the same query helpers as the operations', () => {
		expect(parse(Query.limit(100))).toEqual({ method: 'limit', values: [100] });
	});
});
