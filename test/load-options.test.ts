import { describe, expect, it } from 'vitest';

import { Query } from '../nodes/Appwrite/helpers/appwrite';
import {
	searchBuckets,
	searchDatabases,
	searchFiles,
	searchSites,
	searchTables,
	searchUsers,
} from '../nodes/Appwrite/methods/listSearch';
import {
	getColumns,
	getFrameworks,
	getRuntimes,
	getSiteBuildRuntimes,
} from '../nodes/Appwrite/methods/loadOptions';
import { BASE_URL, createLoadOptionsContext } from './helpers/mock-context';

const parse = (query: string) => JSON.parse(query) as { method: string; values?: unknown[] };

/** A resource locator value as n8n stores it. */
const locator = (mode: 'list' | 'id' | 'url', value: string) => ({ __rl: true, mode, value });

describe('list search (resource locator From List mode)', () => {
	it('lists databases by name, falling back to the ID', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({
				databases: [
					{ $id: 'b', name: 'beta' },
					{ $id: 'c', name: '' },
				],
			}),
		});

		expect(await searchDatabases.call(context)).toEqual({
			results: [
				{ name: 'beta', value: 'b' },
				{ name: 'c', value: 'c' },
			],
			paginationToken: undefined,
		});
		expect(requests[0].url).toBe(`${BASE_URL}/tablesdb`);
		expect(parse((requests[0].qs as Record<string, string>)['queries[0]'])).toEqual({
			method: 'limit',
			values: [100],
		});
		expect((requests[0].qs as Record<string, string>).search).toBeUndefined();
	});

	it("sends the typed filter to Appwrite's search", async () => {
		const { context, requests } = createLoadOptionsContext({ respond: () => ({ buckets: [] }) });
		await searchBuckets.call(context, 'avatars');
		expect((requests[0].qs as Record<string, string>).search).toBe('avatars');
	});

	it('hands back a cursor after a full page and resumes from it', async () => {
		const page = Array.from({ length: 100 }, (_, i) => ({ $id: `b${i}`, name: `Bucket ${i}` }));
		const { context, requests } = createLoadOptionsContext({
			respond: (_request, index) => ({ buckets: index === 0 ? page : [] }),
		});

		const first = await searchBuckets.call(context);
		expect(first.results).toHaveLength(100);
		expect(first.paginationToken).toBe('b99');

		await searchBuckets.call(context, undefined, first.paginationToken as string);
		const second = requests[1].qs as Record<string, string>;
		expect(parse(second['queries[1]'])).toEqual({ method: 'cursorAfter', values: ['b99'] });
	});

	it('returns nothing for dependent lists until their parent is chosen', async () => {
		const { context, requests } = createLoadOptionsContext({
			current: { databaseId: locator('list', ''), bucketId: locator('list', '') },
		});
		expect(await searchTables.call(context)).toEqual({ results: [] });
		expect(await searchFiles.call(context)).toEqual({ results: [] });
		expect(await getColumns.call(context)).toEqual([]);
		expect(requests).toHaveLength(0);
	});

	it('reads the parent from any locator mode, including a Console URL', async () => {
		const { context, requests } = createLoadOptionsContext({
			current: {
				databaseId: locator(
					'url',
					'https://cloud.appwrite.io/console/project-fra-p/databases/database-main',
				),
			},
			respond: () => ({ tables: [{ $id: 't1', name: 'Orders' }] }),
		});
		expect((await searchTables.call(context)).results).toEqual([{ name: 'Orders', value: 't1' }]);
		expect(requests[0].url).toBe(`${BASE_URL}/tablesdb/main/tables`);
	});

	it('lists the files of the chosen bucket', async () => {
		const { context, requests } = createLoadOptionsContext({
			current: { bucketId: locator('id', 'avatars') },
			respond: () => ({ files: [{ $id: 'f1', name: 'photo.png' }] }),
		});
		expect((await searchFiles.call(context)).results).toEqual([{ name: 'photo.png', value: 'f1' }]);
		expect(requests[0].url).toBe(`${BASE_URL}/storage/buckets/avatars/files`);
	});

	it('lists sites by name', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({ sites: [{ $id: 'shop', name: 'Shop' }] }),
		});
		expect((await searchSites.call(context, 'sh')).results).toEqual([
			{ name: 'Shop', value: 'shop' },
		]);
		expect(requests[0].url).toBe(`${BASE_URL}/sites`);
		expect((requests[0].qs as Record<string, string>).search).toBe('sh');
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
		expect((await searchUsers.call(context)).results).toEqual([
			{ name: 'a@example.com', value: 'u1' },
			{ name: 'Bea', value: 'u2' },
			{ name: '+2', value: 'u3' },
		]);
	});
});

describe('load options', () => {
	it('identifies columns by key and pages them by offset', async () => {
		const { context, requests } = createLoadOptionsContext({
			current: { databaseId: locator('list', 'db'), tableId: locator('id', 'orders') },
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

	describe('site frameworks and build runtimes', () => {
		const frameworks = {
			frameworks: [
				{ key: 'nextjs', name: 'Next.js', runtimes: ['node-20.0', 'node-22'] },
				{ key: 'astro', name: 'Astro', runtimes: ['node-22', 'bun-1.1'] },
			],
		};

		it('offers frameworks by name with their key as the value', async () => {
			const { context, requests } = createLoadOptionsContext({ respond: () => frameworks });
			expect(await getFrameworks.call(context)).toEqual([
				{ name: 'Astro', value: 'astro' },
				{ name: 'Next.js', value: 'nextjs' },
			]);
			expect(requests[0].url).toBe(`${BASE_URL}/sites/frameworks`);
		});

		it('offers the runtimes of the framework chosen on create', async () => {
			const { context } = createLoadOptionsContext({
				current: { siteFramework: 'nextjs' },
				respond: () => frameworks,
			});
			expect(await getSiteBuildRuntimes.call(context)).toEqual([
				{ name: 'node-20.0', value: 'node-20.0' },
				{ name: 'node-22', value: 'node-22' },
			]);
		});

		it('offers the runtimes of the framework chosen in the update options', async () => {
			const { context } = createLoadOptionsContext({
				current: { options: { siteFramework: 'astro' } },
				respond: () => frameworks,
			});
			expect((await getSiteBuildRuntimes.call(context)).map((option) => option.value)).toEqual([
				'bun-1.1',
				'node-22',
			]);
		});

		it('offers every runtime once until a framework is chosen', async () => {
			const { context } = createLoadOptionsContext({ respond: () => frameworks });
			expect((await getSiteBuildRuntimes.call(context)).map((option) => option.value)).toEqual([
				'bun-1.1',
				'node-20.0',
				'node-22',
			]);
		});
	});

	it('uses the same query helpers as the operations', () => {
		expect(parse(Query.limit(100))).toEqual({ method: 'limit', values: [100] });
	});
});
