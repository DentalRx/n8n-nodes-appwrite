import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import api from './fixtures/appwrite-api.json';
import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';
import type { SmokeCase } from './helpers/smoke-cases';
import {
	BINARY,
	casesFor,
	operationsOf,
	resources,
	universalResponse,
} from './helpers/smoke-cases';

/**
 * Checks every request the node can make against Appwrite's published API:
 * test/fixtures/appwrite-api.json is derived from the official OpenAPI
 * document (see scripts/generate-api-fixture.mjs). Each operation is run with
 * the same parameter sets as the smoke test, and every request it sends must
 * hit an endpoint Appwrite documents for server SDKs, pass only parameters that
 * endpoint accepts, with the JSON types it declares and only allowed enum
 * values, and include the parameters one of the endpoint's SDK methods
 * requires.
 */

interface ApiOperation {
	id: string;
	deprecated?: boolean;
	query: Record<string, unknown[] | null>;
	body: Record<string, unknown[] | null>;
	/** JSON type of each body parameter; a trailing `?` means null is allowed. */
	bodyTypes: Record<string, string>;
	variants: Array<{ name: string; required: string[] }>;
}

const operations = api.operations as Record<string, ApiOperation>;

/**
 * Endpoints the node calls that Appwrite still serves but no longer lists in
 * the server SDK spec. Each needs a reason; anything else unlisted fails.
 */
const UNLISTED: Array<{ method: string; path: RegExp; reason: string }> = [
	{
		method: 'GET',
		path: /^\/health(\/[a-z-]+(\/local)?)?$/,
		reason:
			'Appwrite 1.9 dropped the Health service from the SDKs, but the server still serves it to API keys with the health.read scope',
	},
	{
		method: 'PATCH',
		path: /^\/tablesdb\/[^/]+\/tables\/[^/]+\/columns\/[^/]+\/relationship$/,
		reason:
			'Appwrite 2.3 moved this route to .../columns/relationship/{key} and keeps the old path as an alias; the old path also works on Appwrite 1.8 to 2.2',
	},
];

/**
 * Deprecated endpoints the node still offers on purpose. Each needs a reason;
 * any other deprecated endpoint fails.
 */
const DEPRECATED_ALLOWED: Array<{ key: string; reason: string }> = [
	{
		key: 'POST /tablesdb/{databaseId}/tables/{tableId}/columns/string',
		reason:
			'String (Legacy) columns: deprecated since Appwrite 1.9, but the only text column type on Appwrite 1.8',
	},
	{
		key: 'PATCH /tablesdb/{databaseId}/tables/{tableId}/columns/string/{key}',
		reason: 'Updating String (Legacy) columns, as above',
	},
];

/**
 * Body parameters whose declared JSON type is wrong in the spec. Each needs a
 * reason; the node sends them as the corrected type.
 */
const TYPE_CORRECTIONS: Array<{ path: RegExp; name: string; type: string; reason: string }> = [
	{
		path: /^\/waf\/rules\//,
		name: 'conditions',
		type: 'array',
		reason:
			"Declared as a string, but described as an 'array of condition strings' of at most 100 entries, each 4096 characters long: the contract of queries, which are an array of JSON strings",
	},
	{
		path: /^\/oauth2\/[^/]+\/(authorize|device_authorization|par|token)$/,
		name: 'resource',
		type: 'array',
		reason:
			"Declared as a string defaulting to [], and described as a 'URI or URI list'; the Appwrite Console sends a list",
	},
];

interface Template {
	key: string;
	method: string;
	pattern: RegExp;
	literal: number;
}

const templates: Template[] = Object.keys(operations).map((key) => {
	const [method, path] = key.split(' ');
	return {
		key,
		method,
		pattern: new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`),
		// Prefer the most literal template: /functions/runtimes over /functions/{id}.
		literal: path.replace(/\{[^}]+\}/g, '').length,
	};
});

function findOperation(method: string, path: string): string | undefined {
	return templates
		.filter((template) => template.method === method && template.pattern.test(path))
		.sort((a, b) => b.literal - a.literal)[0]?.key;
}

/** Query keys without their bracketed array index: `queries[0]` → `queries`. */
function queryKeys(request: IHttpRequestOptions): string[] {
	return [
		...new Set(Object.keys((request.qs ?? {}) as IDataObject).map((key) => key.split('[')[0])),
	];
}

function enumViolations(
	values: IDataObject,
	allowed: Record<string, unknown[] | null>,
	where: string,
): string[] {
	const problems: string[] = [];
	for (const [key, value] of Object.entries(values)) {
		const options = allowed[key.split('[')[0]];
		if (!options) continue;
		// Appwrite's non-strict whitelists lowercase their values, which is how
		// they appear in the spec, and match case-insensitively.
		const caseInsensitive = options.every(
			(option) => typeof option !== 'string' || option === option.toLowerCase(),
		);
		const isAllowed = (entry: unknown): boolean =>
			options.includes(entry) ||
			(caseInsensitive && typeof entry === 'string' && options.includes(entry.toLowerCase()));
		for (const entry of Array.isArray(value) ? value : [value]) {
			if (entry === null || entry === undefined) continue;
			if (!isAllowed(entry)) {
				problems.push(
					`${where} '${key}' = ${JSON.stringify(entry)} is not one of ${options.join(', ')}`,
				);
			}
		}
	}
	return problems;
}

const HAS_TYPE: Record<string, (value: unknown) => boolean> = {
	string: (value) => typeof value === 'string',
	integer: (value) => Number.isInteger(value),
	number: (value) => typeof value === 'number' && Number.isFinite(value),
	boolean: (value) => typeof value === 'boolean',
	array: (value) => Array.isArray(value),
	object: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
};

/**
 * Body values of the wrong JSON type. An expression resolves to its natural
 * type even in a text field, and Appwrite's validators reject the number 7
 * where they expect the text "7".
 */
function typeViolations(body: IDataObject, types: Record<string, string>): string[] {
	const problems: string[] = [];
	for (const [key, value] of Object.entries(body)) {
		const declared = types[key];
		if (declared === undefined) continue;
		const nullable = declared.endsWith('?');
		const type = declared.replace(/\?$/, '');
		if (value === null ? nullable : (HAS_TYPE[type]?.(value) ?? true)) continue;
		problems.push(
			`body '${key}' = ${JSON.stringify(value)} is not ${nullable ? 'null or ' : ''}${type}`,
		);
	}
	return problems;
}

/** Everything wrong with one request, as readable strings. */
function violations(request: IHttpRequestOptions, smokeCase: SmokeCase): string[] {
	const { filled } = smokeCase;
	// A number typed into a free-text field that only takes certain words is
	// the user's mistake for Appwrite to report; only its type is checked.
	const checkEnums = smokeCase.typed !== true;
	const method = request.method ?? 'GET';
	const path = request.url.slice(BASE_URL.length).split('?')[0];

	const key = findOperation(method, path);
	if (key === undefined) {
		if (UNLISTED.some((entry) => entry.method === method && entry.path.test(path))) return [];
		return [`${method} ${path} is not an Appwrite server API endpoint`];
	}

	const operation = operations[key];
	const problems: string[] = [];
	if (operation.deprecated && !DEPRECATED_ALLOWED.some((entry) => entry.key === key)) {
		problems.push(`${key} (${operation.id}) is deprecated`);
	}

	const query = queryKeys(request);
	for (const name of query) {
		if (!(name in operation.query)) problems.push(`${key} does not accept query '${name}'`);
	}
	if (checkEnums) {
		problems.push(...enumViolations((request.qs ?? {}) as IDataObject, operation.query, 'query'));
	}

	const body =
		request.body !== undefined && !Buffer.isBuffer(request.body) && typeof request.body === 'object'
			? (request.body as IDataObject)
			: undefined;
	if (body !== undefined) {
		for (const name of Object.keys(body)) {
			if (!(name in operation.body)) problems.push(`${key} does not accept body '${name}'`);
		}
		if (checkEnums) problems.push(...enumViolations(body, operation.body, 'body'));
		const types = { ...operation.bodyTypes };
		for (const correction of TYPE_CORRECTIONS) {
			if (correction.path.test(path)) types[correction.name] = correction.type;
		}
		problems.push(...typeViolations(body, types).map((problem) => `${key} ${problem}`));
	}

	// A multipart upload's fields live inside its Buffer body, so only
	// structured requests can be checked for completeness.
	if (filled && !Buffer.isBuffer(request.body)) {
		const sent = new Set([...query, ...Object.keys(body ?? {})]);
		const satisfied = operation.variants.some((variant) =>
			variant.required.every((name) => sent.has(name)),
		);
		if (!satisfied) {
			const missing = operation.variants
				.map(
					(variant) =>
						`${variant.name}: ${variant.required.filter((name) => !sent.has(name)).join(', ')}`,
				)
				.join('; ');
			problems.push(`${key} is missing required parameters (${missing})`);
		}
	}

	return problems.map((problem) => `${problem}`);
}

async function requestsOf(smokeCase: SmokeCase): Promise<IHttpRequestOptions[]> {
	const { context, requests } = createExecuteContext({
		parameters: smokeCase.parameters,
		respond: universalResponse,
		binary: BINARY,
	});
	// The smoke test owns whether an operation runs; here only the requests matter.
	await node.execute.call(context).catch(() => undefined);
	return requests;
}

describe('every request matches the Appwrite server API', () => {
	it('is checked against a current API description', () => {
		expect(api.version).toMatch(/^\d+\.\d+\.\d+$/);
		expect(Object.keys(operations).length).toBeGreaterThan(500);
	});

	describe.each(resources)('%s', (resource) => {
		const cases = operationsOf(resource)
			.flatMap((operation) => casesFor(resource, operation))
			.filter((smokeCase) => smokeCase.filled);

		it.each(cases)('$name', async (smokeCase) => {
			const requests = await requestsOf(smokeCase);
			const problems = requests.flatMap((request) => violations(request, smokeCase));
			expect(problems).toEqual([]);
		});
	});
});
