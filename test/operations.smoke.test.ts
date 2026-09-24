import type { IDataObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

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
 * Every operation of every resource is executed against a mocked Appwrite API,
 * first with the defaults n8n would store for a freshly added node, then with
 * every displayed field filled in, and then once per alternative value of each
 * displayed dropdown and toggle. The run must complete without throwing, make
 * at least one request (none for the operations that only build a browser
 * URL), and produce well-formed requests and output items.
 *
 * This catches the class of defect the linter cannot see: an operation that
 * reads a parameter not defined for it, builds a URL from a missing ID, or
 * returns something other than n8n items.
 */

/**
 * Operations that build a URL for the user's browser to open instead of
 * calling Appwrite, whose answer there is a redirect only a browser can
 * follow. They must send nothing, and output the URL instead.
 */
const BROWSER_URL_OPERATIONS: Record<string, string[]> = {
	account: ['getOAuth2LoginUrl'],
	oauth2Server: ['getAuthorizationUrl'],
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
	// A number where a text field expects text may be refused, but only with a
	// node or API error that names the problem, never a crash such as a
	// TypeError from calling a string method on it.
	if (
		smokeCase.typed &&
		(outcome.error instanceof NodeOperationError || outcome.error instanceof NodeApiError)
	) {
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

	const { resource, operation } = smokeCase.parameters as { resource: string; operation: string };
	if (BROWSER_URL_OPERATIONS[resource]?.includes(operation)) {
		expect(requests).toEqual([]);
		const url = String(output[0][0].json.url);
		expect(url.startsWith(`${BASE_URL}/`)).toBe(true);
		expect(url).not.toMatch(/undefined|\[object Object\]/);
		return;
	}

	expect(requests.length).toBeGreaterThan(0);
	if (smokeCase.expectInPath !== undefined) {
		const carried = requests.some(
			(request) =>
				request.url.includes(`/${smokeCase.expectInPath}`) ||
				JSON.stringify(request.body ?? {}).includes(`"${smokeCase.expectInPath}"`) ||
				Object.values((request.qs ?? {}) as IDataObject).includes(smokeCase.expectInPath),
		);
		expect(carried, `the ID extracted from the URL reaches the request`).toBe(true);
	}
	for (const request of requests) {
		expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(request.method);
		expect(request.url.startsWith(`${BASE_URL}/`)).toBe(true);
		const path = request.url.slice(BASE_URL.length);
		expect(path).not.toMatch(/undefined|null|\[object Object\]/);
		// An empty path segment is an empty ID; the transport must refuse it.
		expect(path).not.toMatch(/\/\/|\/$/);

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
