import { describe, expect, it } from 'vitest';

import {
	dateTimeInZone,
	parseStringList,
	smartParseValue,
	stripHexHash,
} from '../nodes/Appwrite/GenericFunctions';
import { extractId, resolveId } from '../nodes/Appwrite/helpers/appwrite';
import type { IDataObject } from 'n8n-workflow';

import { createExecuteContext, node } from './helpers/mock-context';

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

	it('sends numbers and booleans from text fields, in collections too, as text', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'webhook',
				operation: 'create',
				name: 42,
				url: 'https://example.com/hook',
				webhookEvents: 'users.*.create',
				options: { authUsername: 1001, authPassword: true, tls: false, enabled: true },
			},
		});
		await node.execute.call(context);
		const body = requests[0].body as IDataObject;
		expect(body.name).toBe('42');
		expect(body.authUsername).toBe('1001');
		expect(body.authPassword).toBe('true');
		// Toggles are not text fields and keep their type.
		expect(body.tls).toBe(false);
		expect(body.enabled).toBe(true);
	});
});

describe('dates and times', () => {
	it("reads the date picker's wall-clock time in the workflow's time zone", () => {
		// New York is UTC-5 in winter and UTC-4 in summer.
		expect(dateTimeInZone('2030-01-15T09:30:00', 'America/New_York')).toBe(
			'2030-01-15T14:30:00.000Z',
		);
		expect(dateTimeInZone('2030-07-15T09:30:00', 'America/New_York')).toBe(
			'2030-07-15T13:30:00.000Z',
		);
		expect(dateTimeInZone('2030-07-15 09:30', 'Asia/Kolkata')).toBe('2030-07-15T04:00:00.000Z');
		expect(dateTimeInZone('2030-07-15', 'UTC')).toBe('2030-07-15T00:00:00.000Z');
	});

	it('keeps a value that already states its offset, and converts date objects', () => {
		expect(dateTimeInZone('2030-01-15T09:30:00+02:00', 'America/New_York')).toBe(
			'2030-01-15T09:30:00+02:00',
		);
		expect(dateTimeInZone('2030-01-15T09:30:00.000Z', 'America/New_York')).toBe(
			'2030-01-15T09:30:00.000Z',
		);
		expect(dateTimeInZone(new Date('2030-01-15T09:30:00Z'), 'Asia/Tokyo')).toBe(
			'2030-01-15T09:30:00.000Z',
		);
		expect(dateTimeInZone({ toISO: () => '2030-01-15T09:30:00.000-05:00' }, 'UTC')).toBe(
			'2030-01-15T09:30:00.000-05:00',
		);
		expect(dateTimeInZone('next tuesday', 'UTC')).toBe('next tuesday');
	});

	it('sends top-level and collection dates to Appwrite in UTC', async () => {
		const tokenRun = createExecuteContext({
			parameters: {
				resource: 'token',
				operation: 'create',
				bucketId: { __rl: true, mode: 'id', value: 'photos' },
				fileId: { __rl: true, mode: 'id', value: 'cat' },
				expire: '2030-01-15T09:30:00',
			},
			timezone: 'Europe/Berlin',
		});
		await node.execute.call(tokenRun.context);
		expect((tokenRun.requests[0].body as IDataObject).expire).toBe('2030-01-15T08:30:00.000Z');

		const executionRun = createExecuteContext({
			parameters: {
				resource: 'execution',
				operation: 'create',
				functionId: { __rl: true, mode: 'id', value: 'fn' },
				async: true,
				options: { scheduledAt: '2030-07-15T09:30:00' },
			},
			timezone: 'Europe/Berlin',
		});
		await node.execute.call(executionRun.context);
		expect((executionRun.requests[0].body as IDataObject).scheduledAt).toBe(
			'2030-07-15T07:30:00.000Z',
		);
	});
});
