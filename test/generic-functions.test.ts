import type { INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	buildQueries,
	fetchAllPages,
	fetchAllPagesByOffset,
	getPermissions,
	getRowData,
	getSortQueries,
	getStringListParameter,
	lookupEnum,
	parseJsonArrayParameter,
	parseJsonParameter,
	parseStringList,
	simplifyItems,
	smartParseValue,
	stripHexHash,
	toItems,
	withLimit,
} from '../nodes/Appwrite/GenericFunctions';
import { Query } from '../nodes/Appwrite/helpers/appwrite';
import { createExecuteContext } from './helpers/mock-context';

const parse = (query: string) => JSON.parse(query) as { method: string; values?: unknown[] };

describe('toItems', () => {
	it('wraps one or many results and pairs them with the input item', () => {
		expect(toItems({ a: 1 }, 3)).toEqual([{ json: { a: 1 }, pairedItem: { item: 3 } }]);
		expect(toItems([{ a: 1 }, { a: 2 }], 0)).toEqual([
			{ json: { a: 1 }, pairedItem: { item: 0 } },
			{ json: { a: 2 }, pairedItem: { item: 0 } },
		]);
	});
});

describe('stripHexHash', () => {
	it('drops a leading # and leaves empty values undefined', () => {
		expect(stripHexHash('#fd366e')).toBe('fd366e');
		expect(stripHexHash('fd366e')).toBe('fd366e');
		expect(stripHexHash('')).toBeUndefined();
		expect(stripHexHash(undefined)).toBeUndefined();
	});
});

describe('lookupEnum', () => {
	const { context } = createExecuteContext({ parameters: { resource: 'row', operation: 'get' } });

	it('maps a UI value to its API value', () => {
		expect(lookupEnum(context, { a: 'A' }, 'a', 'thing', 0)).toBe('A');
	});

	it('fails loudly for an unknown key instead of sending undefined', () => {
		expect(() => lookupEnum(context, { b: 1, a: 2 }, 'c', 'thing', 0)).toThrow(/Unknown thing "c"/);
	});
});

describe('smartParseValue', () => {
	it('parses numbers, booleans, null and JSON structures', () => {
		expect(smartParseValue('42', false)).toBe(42);
		expect(smartParseValue('-1.5', false)).toBe(-1.5);
		expect(smartParseValue('true', false)).toBe(true);
		expect(smartParseValue('null', false)).toBeNull();
		expect(smartParseValue('[1, "a"]', false)).toEqual([1, 'a']);
		expect(smartParseValue('{"k": 1}', false)).toEqual({ k: 1 });
		expect(smartParseValue('"quoted"', false)).toBe('quoted');
	});

	it('keeps everything else as a string', () => {
		expect(smartParseValue('hello', false)).toBe('hello');
		expect(smartParseValue('', false)).toBe('');
		expect(smartParseValue('[not json', false)).toBe('[not json');
		expect(smartParseValue('2024-01-01', false)).toBe('2024-01-01');
	});

	it('never corrupts integers a double cannot hold', () => {
		expect(smartParseValue('9007199254740993', false)).toBe('9007199254740993');
		expect(smartParseValue('9007199254740993.0', false)).toBe('9007199254740993.0');
		expect(smartParseValue('1e400', false)).toBe('1e400');
		expect(smartParseValue('9007199254740991', false)).toBe(9007199254740991);
	});

	it('leaves the value alone when asked to treat it as a string', () => {
		expect(smartParseValue('42', true)).toBe('42');
		expect(smartParseValue('true', true)).toBe('true');
	});
});

describe('parseStringList', () => {
	const { context } = createExecuteContext({ parameters: { resource: 'row', operation: 'get' } });

	it('accepts comma-separated strings, JSON arrays and real arrays', () => {
		expect(parseStringList.call(context, 'pdf, docx ,, png', 'Extensions', 0)).toEqual([
			'pdf',
			'docx',
			'png',
		]);
		expect(parseStringList.call(context, '["a", 2]', 'Extensions', 0)).toEqual(['a', '2']);
		expect(parseStringList.call(context, ['x', 'y'], 'Extensions', 0)).toEqual(['x', 'y']);
	});

	it('treats blank input as an empty list', () => {
		expect(parseStringList.call(context, '', 'Extensions', 0)).toEqual([]);
		expect(parseStringList.call(context, '   ', 'Extensions', 0)).toEqual([]);
		expect(parseStringList.call(context, undefined, 'Extensions', 0)).toEqual([]);
	});

	it('rejects a JSON value that is not an array', () => {
		expect(() => parseStringList.call(context, '[1', 'Extensions', 0)).toThrow(NodeOperationError);
	});

	it('reads a node parameter through the same rules', () => {
		const { context: withList } = createExecuteContext({
			parameters: {
				resource: 'index',
				operation: 'create',
				columns: 'title, status',
			},
		});
		expect(getStringListParameter.call(withList, 'columns', 0)).toEqual(['title', 'status']);
	});
});

describe('parseJsonParameter', () => {
	const { context } = createExecuteContext({ parameters: { resource: 'row', operation: 'get' } });

	it('accepts JSON text and already-parsed objects', () => {
		expect(parseJsonParameter.call(context, '{"a": 1}', 'Data', 0)).toEqual({ a: 1 });
		expect(parseJsonParameter.call(context, { a: 1 }, 'Data', 0)).toEqual({ a: 1 });
		expect(parseJsonParameter.call(context, '', 'Data', 0)).toEqual({});
	});

	it('rejects arrays, scalars and invalid JSON with a node error', () => {
		expect(() => parseJsonParameter.call(context, '[1]', 'Data', 0)).toThrow(
			/must be a JSON object/,
		);
		expect(() => parseJsonParameter.call(context, [1], 'Data', 0)).toThrow(/must be a JSON object/);
		expect(() => parseJsonParameter.call(context, '"x"', 'Data', 0)).toThrow(
			/must be a JSON object/,
		);
		expect(() => parseJsonParameter.call(context, '{oops', 'Data', 0)).toThrow(/not valid JSON/);
	});

	it('has an array counterpart with matching rules', () => {
		expect(parseJsonArrayParameter.call(context, '[1, 2]', 'Rows', 0)).toEqual([1, 2]);
		expect(parseJsonArrayParameter.call(context, [1], 'Rows', 0)).toEqual([1]);
		expect(parseJsonArrayParameter.call(context, '', 'Rows', 0)).toEqual([]);
		expect(() => parseJsonArrayParameter.call(context, '{}', 'Rows', 0)).toThrow(
			/must be a JSON array/,
		);
		expect(() => parseJsonArrayParameter.call(context, 5, 'Rows', 0)).toThrow(/must be an array/);
	});
});

describe('withLimit', () => {
	it('appends the Limit field unless the user already set a Limit query', () => {
		expect(withLimit([], 25).map(parse)).toEqual([{ method: 'limit', values: [25] }]);
		const own = Query.limit(3);
		expect(withLimit([own, 'not json'], 25)).toEqual([own, 'not json']);
	});
});

describe('buildQueries', () => {
	const builder = (queryValues: INodeParameters[]) =>
		createExecuteContext({
			parameters: {
				resource: 'row',
				operation: 'getMany',
				queriesMode: 'builder',
				queriesUi: { queryValues },
			},
		}).context;

	it('translates every builder query type', () => {
		const context = builder([
			{ type: 'equal', column: 'status', value: 'active' },
			{ type: 'notEqual', column: 'n', value: '5' },
			{ type: 'between', column: 'age', value: '18', value2: '65' },
			{ type: 'isNull', column: 'deletedAt' },
			{ type: 'startsWith', column: 'name', value: '42' },
			{ type: 'search', column: 'body', value: 'hello world' },
			{ type: 'select', value: 'a, b' },
			{ type: 'orderDesc', column: '$createdAt' },
			{ type: 'limit', value: '10' },
			{ type: 'offset', value: '20' },
			{ type: 'cursorAfter', value: 'row1' },
			{ type: 'contains', column: 'tags', value: '["x","y"]' },
		]);
		expect(buildQueries.call(context, 0).map(parse)).toEqual([
			{ method: 'equal', attribute: 'status', values: ['active'] },
			{ method: 'notEqual', attribute: 'n', values: [5] },
			{ method: 'between', attribute: 'age', values: [18, 65] },
			{ method: 'isNull', attribute: 'deletedAt' },
			{ method: 'startsWith', attribute: 'name', values: ['42'] },
			{ method: 'search', attribute: 'body', values: ['hello world'] },
			{ method: 'select', values: ['a', 'b'] },
			{ method: 'orderDesc', attribute: '$createdAt' },
			{ method: 'limit', values: [10] },
			{ method: 'offset', values: [20] },
			{ method: 'cursorAfter', values: ['row1'] },
			{ method: 'contains', attribute: 'tags', values: ['x', 'y'] },
		]);
	});

	it('honours Treat Value as String', () => {
		const context = builder([
			{ type: 'equal', column: 'zip', value: '01234', treatValueAsString: true },
		]);
		expect(parse(buildQueries.call(context, 0)[0]).values).toEqual(['01234']);
	});

	it('rejects an empty or non-numeric Limit or Offset', () => {
		expect(() => buildQueries.call(builder([{ type: 'limit', value: '' }]), 0)).toThrow(
			/needs a value/,
		);
		expect(() => buildQueries.call(builder([{ type: 'offset', value: 'ten' }]), 0)).toThrow(
			/numeric value/,
		);
	});

	it('passes raw JSON queries through, serialising objects', () => {
		const { context } = createExecuteContext({
			parameters: {
				resource: 'row',
				operation: 'getMany',
				queriesMode: 'json',
				queriesJson: JSON.stringify([Query.equal('a', 1), { method: 'limit', values: [2] }]),
			},
		});
		expect(buildQueries.call(context, 0).map(parse)).toEqual([
			{ method: 'equal', attribute: 'a', values: [1] },
			{ method: 'limit', values: [2] },
		]);
	});

	it('returns no queries when nothing was configured', () => {
		const { context } = createExecuteContext({
			parameters: { resource: 'row', operation: 'getMany' },
		});
		expect(buildQueries.call(context, 0)).toEqual([]);
	});
});

describe('getSortQueries', () => {
	it('turns sort rules into order queries and skips rules without a column', () => {
		const { context } = createExecuteContext({
			parameters: {
				resource: 'row',
				operation: 'getMany',
				sortUi: {
					sortValues: [
						{ column: 'name', direction: 'asc' },
						{ column: '', direction: 'desc' },
						{ column: '$createdAt', direction: 'desc' },
					],
				},
			},
		});
		expect(getSortQueries.call(context, 0).map(parse)).toEqual([
			{ method: 'orderAsc', attribute: 'name' },
			{ method: 'orderDesc', attribute: '$createdAt' },
		]);
	});
});

describe('getPermissions', () => {
	const withPermissions = (permissions: string) =>
		createExecuteContext({ parameters: { resource: 'row', operation: 'create', permissions } })
			.context;

	it('reads one permission per line, ignoring blank lines', () => {
		expect(getPermissions.call(withPermissions(' read("any") \n\nupdate("users")\n'), 0)).toEqual([
			'read("any")',
			'update("users")',
		]);
	});

	it('accepts a JSON array, including an empty one to clear permissions', () => {
		expect(getPermissions.call(withPermissions('["read(\\"any\\")"]'), 0)).toEqual(['read("any")']);
		expect(getPermissions.call(withPermissions('[]'), 0)).toEqual([]);
	});

	it('returns undefined for a blank field so Appwrite keeps the existing permissions', () => {
		expect(getPermissions.call(withPermissions(''), 0)).toBeUndefined();
		expect(getPermissions.call(withPermissions('  \n '), 0)).toBeUndefined();
	});
});

describe('getRowData', () => {
	it('builds the row from individual fields with smart typing', () => {
		const { context } = createExecuteContext({
			parameters: {
				resource: 'row',
				operation: 'create',
				dataMode: 'fields',
				dataFieldsUi: {
					fieldValues: [
						{ fieldName: 'count', fieldValue: '5' },
						{ fieldName: 'zip', fieldValue: '01234', treatValueAsString: true },
						{ fieldName: 'tags', fieldValue: '["a"]' },
						{ fieldName: '', fieldValue: 'ignored' },
					],
				},
			},
		});
		expect(getRowData.call(context, 0)).toEqual({ count: 5, zip: '01234', tags: ['a'] });
	});

	it('parses the JSON mode', () => {
		const { context } = createExecuteContext({
			parameters: {
				resource: 'row',
				operation: 'create',
				dataMode: 'json',
				dataJson: '{"title": "Hello"}',
			},
		});
		expect(getRowData.call(context, 0)).toEqual({ title: 'Hello' });
	});
});

describe('simplifyItems', () => {
	it('keeps only the requested fields that exist', () => {
		expect(simplifyItems({ a: 1, b: 2, c: 3 }, ['a', 'c', 'z'])).toEqual({ a: 1, c: 3 });
		expect(simplifyItems([{ a: 1, b: 2 }], ['b'])).toEqual([{ b: 2 }]);
	});
});

describe('fetchAllPages', () => {
	const { context } = createExecuteContext({
		parameters: { resource: 'row', operation: 'getMany' },
	});
	const rows = (from: number, count: number) =>
		Array.from({ length: count }, (_, index) => ({ $id: `row-${from + index}` }));

	it('follows cursors in pages of 100 until a short page arrives', async () => {
		const calls: string[][] = [];
		const result = await fetchAllPages.call(
			context,
			[Query.equal('a', 1), Query.limit(5)],
			async (queries) => {
				calls.push(queries);
				return calls.length === 1 ? { rows: rows(0, 100) } : { rows: rows(100, 30) };
			},
			'rows',
			0,
		);

		expect(result).toHaveLength(130);
		expect(calls).toHaveLength(2);
		expect(calls[0].map(parse)).toEqual([
			{ method: 'equal', attribute: 'a', values: [1] },
			{ method: 'limit', values: [100] },
		]);
		expect(calls[1].map(parse)).toEqual([
			{ method: 'equal', attribute: 'a', values: [1] },
			{ method: 'limit', values: [100] },
			{ method: 'cursorAfter', values: ['row-99'] },
		]);
	});

	it('starts from a user-supplied cursor or offset and falls back to offsets without IDs', async () => {
		const calls: string[][] = [];
		const result = await fetchAllPages.call(
			context,
			[Query.offset(10)],
			async (queries) => {
				calls.push(queries);
				return calls.length === 1
					? { columns: Array.from({ length: 100 }, (_, i) => ({ key: `c${i}` })) }
					: { columns: [{ key: 'last' }] };
			},
			'columns',
			0,
		);

		expect(result).toHaveLength(101);
		expect(calls[0].map(parse)).toEqual([
			{ method: 'limit', values: [100] },
			{ method: 'offset', values: [10] },
		]);
		expect(calls[1].map(parse)).toEqual([
			{ method: 'limit', values: [100] },
			{ method: 'offset', values: [110] },
		]);
	});

	it('refuses Cursor Before, which cannot page forward', async () => {
		await expect(
			fetchAllPages.call(context, [Query.cursorBefore('x')], async () => ({ rows: [] }), 'rows', 0),
		).rejects.toThrow(/Cursor Before/);
	});

	it('handles a missing list key as an empty page', async () => {
		const result = await fetchAllPages.call(context, [], async () => ({ total: 0 }), 'rows', 0);
		expect(result).toEqual([]);
	});
});

describe('fetchAllPagesByOffset', () => {
	const { context } = createExecuteContext({
		parameters: { resource: 'user', operation: 'getMany' },
	});

	it('pages by offset, honouring the user offset and dropping Limit', async () => {
		const calls: string[][] = [];
		const result = await fetchAllPagesByOffset.call(
			context,
			[Query.limit(1), Query.offset(5), Query.equal('event', 'login')],
			async (queries) => {
				calls.push(queries);
				return calls.length === 1
					? { logs: Array.from({ length: 100 }, (_, i) => ({ i })) }
					: { logs: [{ i: 100 }, { i: 101 }] };
			},
			'logs',
			0,
		);

		expect(result).toHaveLength(102);
		expect(calls[0].map(parse)).toEqual([
			{ method: 'equal', attribute: 'event', values: ['login'] },
			{ method: 'limit', values: [100] },
			{ method: 'offset', values: [5] },
		]);
		expect(calls[1].map(parse)).toEqual([
			{ method: 'equal', attribute: 'event', values: ['login'] },
			{ method: 'limit', values: [100] },
			{ method: 'offset', values: [105] },
		]);
	});

	it('rejects cursor queries the endpoint cannot honour', async () => {
		await expect(
			fetchAllPagesByOffset.call(
				context,
				[Query.cursorAfter('x')],
				async () => ({ logs: [] }),
				'logs',
				0,
			),
		).rejects.toThrow(/Cursor queries are not supported/);
	});
});
