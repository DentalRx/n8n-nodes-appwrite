import type {
	IDataObject,
	IHttpRequestOptions,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeHelpers, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	BASE_URL,
	createExecuteContext,
	description,
	node,
	resolveParameters,
	testNode,
} from './helpers/mock-context';

/**
 * Every operation of every resource is executed against a mocked Appwrite API,
 * first with the defaults n8n would store for a freshly added node, then with
 * every displayed field filled in, and then once per alternative value of each
 * displayed dropdown and toggle. The run must complete without throwing, make
 * at least one request, and produce well-formed requests and output items.
 *
 * This catches the class of defect the linter cannot see: an operation that
 * reads a parameter not defined for it, builds a URL from a missing ID, or
 * returns something other than n8n items.
 */

const { properties } = description;

const resources = (
	(properties.find((property) => property.name === 'resource')?.options ??
		[]) as INodePropertyOptions[]
).map((option) => option.value as string);

const operationsOf = (resource: string): string[] => {
	const property = properties.find(
		(candidate) =>
			candidate.name === 'operation' &&
			(candidate.displayOptions?.show?.resource as string[] | undefined)?.includes(resource),
	);
	return ((property?.options ?? []) as INodePropertyOptions[]).map(
		(option) => option.value as string,
	);
};

const LIST_KEYS = [
	'buckets',
	'columns',
	'continents',
	'countries',
	'currencies',
	'databases',
	'deployments',
	'executions',
	'files',
	'functions',
	'identities',
	'indexes',
	'languages',
	'localeCodes',
	'locales',
	'logs',
	'memberships',
	'messages',
	'operations',
	'phones',
	'rows',
	'runtimes',
	'sessions',
	'subscribers',
	'tables',
	'targets',
	'teams',
	'tokens',
	'topics',
	'transactions',
	'users',
	'variables',
];

/** One plausible Appwrite answer for any endpoint: a model with every list key populated. */
function universalResponse(request: IHttpRequestOptions): unknown {
	if (request.encoding === 'arraybuffer') return Buffer.from('binary-content');
	if (request.json === false) return JSON.stringify({ $id: 'uploaded-file' });

	const model: IDataObject = {
		$id: 'model-id',
		$createdAt: '2026-01-01T00:00:00.000+00:00',
		$updatedAt: '2026-01-01T00:00:00.000+00:00',
		name: 'Model',
		key: 'model-key',
		mimeType: 'text/plain',
		status: 'available',
		enabled: true,
		total: 1,
	};
	for (const key of LIST_KEYS) {
		model[key] = [{ $id: `${key}-1`, name: key, key: `${key}-key` }];
	}
	return model;
}

/** Column default values that pass the node's own validation for each column type. */
const COLUMN_DEFAULTS: Record<string, string> = {
	integer: '1',
	bigint: '1',
	float: '1.5',
	boolean: 'true',
	datetime: '2030-01-01T00:00:00.000+00:00',
	point: '[1, 2]',
	line: '[[1, 2], [3, 4]]',
	polygon: '[[[0, 0], [1, 0], [1, 1], [0, 0]]]',
};

/**
 * A realistic non-empty value for a property, or its default when `filled` is
 * off. `context` holds the top-level values chosen so far, for the few fields
 * whose valid values depend on a sibling.
 */
function valueFor(property: INodeProperties, filled: boolean, context: INodeParameters): unknown {
	const { name } = property;
	switch (property.type) {
		case 'string': {
			if (!filled || name.endsWith('Json')) return property.default;
			if (name === 'defaultValue') return COLUMN_DEFAULTS[String(context.columnType)] ?? 'default';
			if (name === 'orders') return 'asc';
			if (name === 'lengths') return '255';
			if (name === 'inputBinaryField' || name === 'outputBinaryField') return 'data';
			if (name === 'permissions') return 'read("any")\nupdate("users")';
			if (name === 'email') return 'user@example.com';
			if (name === 'phone') return '+15555550100';
			if (name === 'password' || name === 'secret') return 'correct-horse-battery-staple';
			if (name === 'url' || name === 'redirectUrl') return 'https://example.com/path';
			if (name === 'domain') return 'example.com';
			if (name === 'countryCode') return 'us';
			if (/expire|scheduledAt|date/i.test(name)) return '2030-01-01T00:00:00.000+00:00';
			return `${name}-value`;
		}
		case 'options': {
			if (property.typeOptions?.loadOptionsMethod !== undefined) {
				return filled ? `${name}-id` : property.default;
			}
			if (property.default !== '' && property.default !== undefined) return property.default;
			return (property.options as INodePropertyOptions[] | undefined)?.[0]?.value ?? '';
		}
		case 'multiOptions': {
			if (!filled) return property.default;
			return (property.options as INodePropertyOptions[]).slice(0, 2).map((option) => option.value);
		}
		case 'color':
			return filled ? '#ff8800' : property.default;
		case 'dateTime':
			return filled ? '2030-01-01T00:00:00.000Z' : property.default;
		case 'collection': {
			if (!filled) return {};
			const collection: IDataObject = {};
			for (const option of property.options as INodeProperties[]) {
				const value = valueFor(option, true, context);
				if (value !== undefined) collection[option.name] = value as IDataObject[string];
			}
			return collection;
		}
		case 'fixedCollection': {
			if (!filled) return {};
			const collection: IDataObject = {};
			for (const group of property.options as INodePropertyCollection[]) {
				const entry: IDataObject = {};
				for (const field of group.values) {
					const value = valueFor(field, true, context);
					if (value !== undefined) entry[field.name] = value as IDataObject[string];
				}
				collection[group.name] = property.typeOptions?.multipleValues ? [entry] : entry;
			}
			return collection;
		}
		case 'notice':
			return undefined;
		default:
			return property.default;
	}
}

const isDisplayed = (values: INodeParameters, property: INodeProperties): boolean =>
	NodeHelpers.displayParameter(values, property, testNode, description);

/**
 * Fill every displayed top-level property, repeating until no newly displayed
 * property appears (a filled dropdown can reveal dependent fields).
 */
function fillDisplayed(base: INodeParameters, filled: boolean): INodeParameters {
	const values: INodeParameters = { ...base };
	for (let pass = 0; pass < 4; pass++) {
		const resolved = resolveParameters(values);
		let changed = false;
		for (const property of properties) {
			if (property.name in values) continue;
			if (!isDisplayed(resolved, property)) continue;
			const value = valueFor(property, filled, values);
			if (value === undefined) continue;
			values[property.name] = value as NodeParameterValueType;
			changed = true;
		}
		if (!changed) break;
	}
	return values;
}

interface SmokeCase {
	name: string;
	filled: boolean;
	parameters: INodeParameters;
}

function casesFor(resource: string, operation: string): SmokeCase[] {
	const base: INodeParameters = { resource, operation };
	const cases: SmokeCase[] = [
		{ name: `${resource} › ${operation} (defaults)`, filled: false, parameters: base },
		{
			name: `${resource} › ${operation} (all fields)`,
			filled: true,
			parameters: fillDisplayed(base, true),
		},
	];

	const resolved = resolveParameters(fillDisplayed(base, true));
	for (const property of properties) {
		if (property.name === 'resource' || property.name === 'operation') continue;
		if (!isDisplayed(resolved, property)) continue;

		if (property.type === 'options' && property.typeOptions?.loadOptionsMethod === undefined) {
			for (const option of property.options as INodePropertyOptions[]) {
				if (option.value === resolved[property.name]) continue;
				cases.push({
					name: `${resource} › ${operation} (${property.name}=${String(option.value)})`,
					filled: true,
					parameters: fillDisplayed({ ...base, [property.name]: option.value }, true),
				});
			}
		}

		if (property.type === 'boolean') {
			const flipped = !(resolved[property.name] as boolean);
			cases.push({
				name: `${resource} › ${operation} (${property.name}=${String(flipped)})`,
				filled: true,
				parameters: fillDisplayed({ ...base, [property.name]: flipped }, true),
			});
		}
	}

	return cases;
}

const BINARY = {
	data: { buffer: Buffer.from('hello world'), mimeType: 'text/plain', fileName: 'hello.txt' },
};

async function runCase(smokeCase: SmokeCase): Promise<void> {
	const { context, requests } = createExecuteContext({
		parameters: smokeCase.parameters,
		respond: universalResponse,
		binary: BINARY,
	});

	const outcome = await node.execute.call(context).then(
		(output) => ({ output, error: undefined }),
		(error: unknown) => ({ output: undefined, error }),
	);

	// A blank node may legitimately refuse to run: the outcome must then be a
	// friendly validation error raised before anything was sent.
	if (!smokeCase.filled && outcome.error instanceof NodeOperationError && requests.length === 0) {
		expect(outcome.error.message).toMatch(/\S/);
		return;
	}
	if (outcome.error !== undefined) throw outcome.error;
	const output = outcome.output ?? [];

	expect(output).toHaveLength(1);
	expect(output[0].length).toBeGreaterThan(0);
	for (const item of output[0]) {
		expect(item.json).toBeTypeOf('object');
		expect(item.json).not.toBeNull();
		expect(item.pairedItem).toEqual({ item: 0 });
	}

	expect(requests.length).toBeGreaterThan(0);
	for (const request of requests) {
		expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(request.method);
		expect(request.url.startsWith(`${BASE_URL}/`)).toBe(true);
		const path = request.url.slice(BASE_URL.length);
		expect(path).not.toMatch(/undefined|null|\[object Object\]/);
		if (smokeCase.filled) expect(path).not.toMatch(/\/\/|\/$/);

		for (const [key, value] of Object.entries((request.qs ?? {}) as IDataObject)) {
			expect(value, `query parameter ${key}`).not.toBeUndefined();
			expect(String(value), `query parameter ${key}`).not.toMatch(/undefined|\[object Object\]/);
		}

		if (request.method === 'GET') {
			expect(request.body).toBeUndefined();
		} else if (request.body !== undefined && !Buffer.isBuffer(request.body)) {
			expect(request.body).toBeTypeOf('object');
			for (const [key, value] of Object.entries(request.body as IDataObject)) {
				expect(value, `body field ${key}`).not.toBeUndefined();
			}
		}
	}
}

describe.each(resources)('%s', (resource) => {
	const cases = operationsOf(resource).flatMap((operation) => casesFor(resource, operation));

	it.each(cases)('$name', async (smokeCase) => {
		await runCase(smokeCase);
	});
});
