import type { INodeProperties, INodePropertyModeTypeOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { databaseLocator, resourceLocator } from '../nodes/Appwrite/descriptions/locators';
import { getOptionalResourceId, getResourceId } from '../nodes/Appwrite/GenericFunctions';
import { createExecuteContext } from './helpers/mock-context';

type Mode = NonNullable<INodeProperties['modes']>[number] & {
	typeOptions?: INodePropertyModeTypeOptions;
};

const modeOf = (property: INodeProperties, name: string): Mode => {
	const mode = property.modes?.find((candidate) => candidate.name === name);
	if (mode === undefined) throw new Error(`no ${name} mode`);
	return mode as Mode;
};

/** The validation regex of a mode, as n8n applies it to the typed value. */
const validates = (mode: Mode, value: string): boolean => {
	const rule = mode.validation?.[0] as { properties: { regex: string } } | undefined;
	return new RegExp(rule?.properties.regex ?? '').test(value);
};

/** What n8n's extractValue yields for a By URL value (it requires exactly one group). */
const extract = (mode: Mode, value: string): string | undefined => {
	const match = new RegExp(String(mode.extractValue?.regex)).exec(value);
	expect(match?.length ?? 2).toBe(2);
	return match?.[1];
};

describe('resource locators', () => {
	const database = databaseLocator({ resource: ['database'] });

	it('offer From List (default), By URL and ID, in that order', () => {
		expect(database.type).toBe('resourceLocator');
		expect(database.default).toEqual({ mode: 'list', value: '' });
		expect(database.modes?.map((mode) => mode.name)).toEqual(['list', 'url', 'id']);
		expect(modeOf(database, 'list').typeOptions).toEqual({
			searchListMethod: 'searchDatabases',
			searchable: true,
		});
	});

	it('pull the ID out of Appwrite Console URLs', () => {
		const url = modeOf(database, 'url');
		for (const [link, id] of [
			['https://cloud.appwrite.io/console/project-fra-p1/databases/database-main', 'main'],
			['https://cloud.appwrite.io/console/project-p1/databases/database-main/table-orders', 'main'],
			[
				'https://appwrite.example.com/console/project-p1/databases/database-my_db.v2?tab=x',
				'my_db.v2',
			],
			['https://cloud.appwrite.io/console/project-p1/databases/database-main#settings', 'main'],
		]) {
			expect(validates(url, link), link).toBe(true);
			expect(extract(url, link), link).toBe(id);
		}
	});

	it('reject URLs that carry no ID of their kind', () => {
		const url = modeOf(database, 'url');
		expect(validates(url, 'https://cloud.appwrite.io/console/project-p1/storage/bucket-x')).toBe(
			false,
		);
		expect(validates(url, 'database-main')).toBe(false);
	});

	it('accept only valid Appwrite IDs in ID mode', () => {
		const id = modeOf(database, 'id');
		expect(validates(id, 'main')).toBe(true);
		expect(validates(id, 'a'.repeat(36))).toBe(true);
		expect(validates(id, 'a'.repeat(37))).toBe(false);
		expect(validates(id, '_main')).toBe(false);
		expect(validates(id, 'has space')).toBe(false);
	});

	it('depend on their parent locator value when they have one', () => {
		const table = resourceLocator(
			{
				name: 'tableId',
				displayName: 'Table',
				kind: 'table',
				searchListMethod: 'searchTables',
				placeholder: 'e.g. orders',
				urlPlaceholder:
					'e.g. https://cloud.appwrite.io/console/project-p/databases/database-main/table-orders',
				dependsOn: ['databaseId.value'],
			},
			{ resource: ['table'] },
		);
		expect(table.typeOptions?.loadOptionsDependsOn).toEqual(['databaseId.value']);
		expect(table.displayOptions).toEqual({ show: { resource: ['table'] } });
		expect(table.required).toBe(true);
	});
});

describe('getResourceId', () => {
	const run = (databaseId: unknown) =>
		createExecuteContext({
			parameters: { resource: 'database', operation: 'get', databaseId: databaseId as string },
		}).context;

	it('reads each locator mode', () => {
		expect(
			getResourceId.call(
				run({ __rl: true, mode: 'list', value: 'main' }),
				'databaseId',
				0,
				'database',
				'Database',
			),
		).toBe('main');
		expect(
			getResourceId.call(
				run({ __rl: true, mode: 'id', value: 'main' }),
				'databaseId',
				0,
				'database',
				'Database',
			),
		).toBe('main');
		expect(
			getResourceId.call(
				run({
					__rl: true,
					mode: 'url',
					value: 'https://cloud.appwrite.io/console/project-p/databases/database-main',
				}),
				'databaseId',
				0,
				'database',
				'Database',
			),
		).toBe('main');
	});

	it('accepts a Console URL typed into ID mode or produced by an expression', () => {
		const context = run({
			__rl: true,
			mode: 'id',
			value: 'https://cloud.appwrite.io/console/project-p/databases/database-main/table-t',
		});
		expect(getResourceId.call(context, 'databaseId', 0, 'database', 'Database')).toBe('main');
	});

	it('stops an empty value with a message naming the field', () => {
		const context = run({ __rl: true, mode: 'list', value: '' });
		expect(() => getResourceId.call(context, 'databaseId', 0, 'database', 'Database')).toThrow(
			NodeOperationError,
		);
		expect(() => getResourceId.call(context, 'databaseId', 0, 'database', 'Database')).toThrow(
			"The 'Database' parameter is empty",
		);
		expect(getOptionalResourceId.call(context, 'databaseId', 0, 'database')).toBe('');
	});
});
