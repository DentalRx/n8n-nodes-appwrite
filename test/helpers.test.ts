import { describe, expect, it } from 'vitest';

import { Query, extractId, resolveId, uniqueId } from '../nodes/Appwrite/helpers/appwrite';

describe('Query', () => {
	it('encodes filters in the wire format Appwrite expects', () => {
		expect(JSON.parse(Query.equal('status', 'active'))).toEqual({
			method: 'equal',
			attribute: 'status',
			values: ['active'],
		});
		expect(JSON.parse(Query.between('age', 18, 65))).toEqual({
			method: 'between',
			attribute: 'age',
			values: [18, 65],
		});
		expect(JSON.parse(Query.contains('tags', ['a', 'b']))).toEqual({
			method: 'contains',
			attribute: 'tags',
			values: ['a', 'b'],
		});
	});

	it('omits the attribute for queries that have none', () => {
		expect(JSON.parse(Query.limit(25))).toEqual({ method: 'limit', values: [25] });
		expect(JSON.parse(Query.offset(5))).toEqual({ method: 'offset', values: [5] });
		expect(JSON.parse(Query.cursorAfter('abc'))).toEqual({
			method: 'cursorAfter',
			values: ['abc'],
		});
		expect(JSON.parse(Query.select(['a', 'b']))).toEqual({ method: 'select', values: ['a', 'b'] });
	});

	it('omits the values for null checks and ordering', () => {
		expect(JSON.parse(Query.isNull('deletedAt'))).toEqual({
			method: 'isNull',
			attribute: 'deletedAt',
		});
		expect(JSON.parse(Query.orderDesc('$createdAt'))).toEqual({
			method: 'orderDesc',
			attribute: '$createdAt',
		});
	});
});

describe('uniqueId', () => {
	it('produces Appwrite-shaped IDs: 13 hex timestamp characters plus random padding', () => {
		const id = uniqueId();
		expect(id).toMatch(/^[0-9a-f]{20}$/);
		expect(uniqueId(3)).toMatch(/^[0-9a-f]{16}$/);
	});

	it('does not repeat', () => {
		const ids = new Set(Array.from({ length: 500 }, () => uniqueId()));
		expect(ids.size).toBe(500);
	});
});

describe('resolveId', () => {
	it('generates an ID for an empty value or the unique() marker', () => {
		expect(resolveId('')).toMatch(/^[0-9a-f]{20}$/);
		expect(resolveId('unique()')).toMatch(/^[0-9a-f]{20}$/);
	});

	it('passes any other value through untouched', () => {
		expect(resolveId('my-row')).toBe('my-row');
	});
});

describe('extractId', () => {
	it('returns a bare ID as is, trimmed', () => {
		expect(extractId('  orders ', 'table')).toBe('orders');
	});

	it('extracts the ID for the requested kind from a Console URL', () => {
		const url =
			'https://cloud.appwrite.io/console/project-nyc-proj1/databases/database-main/table-orders?tab=columns#x';
		expect(extractId(url, 'database')).toBe('main');
		expect(extractId(url, 'table')).toBe('orders');
		expect(extractId(url, 'project')).toBe('nyc-proj1');
	});

	it('returns the URL unchanged when it carries no segment of that kind', () => {
		const url = 'https://cloud.appwrite.io/console/project-p/databases/database-main';
		expect(extractId(url, 'bucket')).toBe(url);
	});
});
