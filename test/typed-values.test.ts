import { describe, expect, it } from 'vitest';

import { parseStringList, smartParseValue, stripHexHash } from '../nodes/Appwrite/GenericFunctions';
import { extractId, resolveId } from '../nodes/Appwrite/helpers/appwrite';
import { createExecuteContext } from './helpers/mock-context';

/**
 * n8n evaluates an expression to its natural type even when the parameter is
 * a text field: `{{ $json.count }}` arrives as the number 3, not "3". Every
 * helper that reads user input must cope with that instead of crashing.
 */
describe('typed values from expressions', () => {
	const { context } = createExecuteContext({ parameters: { resource: 'row', operation: 'get' } });

	it('keeps typed values when smart-parsing, stringifying them only on request', () => {
		expect(smartParseValue(3, false)).toBe(3);
		expect(smartParseValue(true, false)).toBe(true);
		expect(smartParseValue({ a: 1 }, false)).toEqual({ a: 1 });
		expect(smartParseValue(3, true)).toBe('3');
		expect(smartParseValue({ a: 1 }, true)).toBe('{"a":1}');
		expect(smartParseValue(null, true)).toBeNull();
	});

	it('reads a number as a one-entry list and refuses an object', () => {
		expect(parseStringList.call(context, 42, 'Labels', 0)).toEqual(['42']);
		expect(parseStringList.call(context, ['a', 2], 'Labels', 0)).toEqual(['a', '2']);
		expect(() => parseStringList.call(context, { a: 1 }, 'Labels', 0)).toThrow(
			"Parameter 'Labels' must be a list",
		);
	});

	it('turns numeric IDs into the strings Appwrite expects', () => {
		expect(resolveId(12345)).toBe('12345');
		expect(resolveId('')).toMatch(/^[0-9a-f]{20}$/);
		expect(extractId(12345, 'row')).toBe('12345');
		expect(extractId(undefined, 'row')).toBe('');
	});

	it('reads a numeric colour', () => {
		expect(stripHexHash(123456)).toBe('123456');
		expect(stripHexHash('')).toBeUndefined();
	});
});
