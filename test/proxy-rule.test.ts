import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { searchProxyRules } from '../nodes/Appwrite/methods/listSearch';
import {
	BASE_URL,
	createExecuteContext,
	createLoadOptionsContext,
	node,
} from './helpers/mock-context';

const functionLocator = { __rl: true, mode: 'id', value: 'fn1' };
const ruleLocator = { __rl: true, mode: 'id', value: 'rule1' };

async function run(parameters: INodeParameters, response: IDataObject = { $id: 'rule1' }) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'proxyRule', ...parameters },
		respond: () => response,
	});
	const [output] = await node.execute.call(context);
	return { output, request: requests[0], body: requests[0].body as IDataObject };
}

describe('Proxy Rule', () => {
	describe('Create sends each rule type to its own endpoint, with only its fields', () => {
		it('API', async () => {
			const { request, body } = await run({
				operation: 'create',
				proxyRuleType: 'api',
				domain: 'api.example.com',
			});
			expect(request.url).toBe(`${BASE_URL}/proxy/rules/api`);
			expect(body).toEqual({ domain: 'api.example.com' });
		});

		it('Function, following a Git branch', async () => {
			const { request, body } = await run({
				operation: 'create',
				proxyRuleType: 'function',
				domain: 'hooks.example.com',
				functionId: functionLocator,
				options: { proxyRuleBranch: 'staging' },
			});
			expect(request.url).toBe(`${BASE_URL}/proxy/rules/function`);
			expect(body).toEqual({ domain: 'hooks.example.com', functionId: 'fn1', branch: 'staging' });
		});

		it('Site, serving the active deployment', async () => {
			const { request, body } = await run({
				operation: 'create',
				proxyRuleType: 'site',
				domain: 'www.example.com',
				proxyRuleSiteId: 'marketing',
			});
			expect(request.url).toBe(`${BASE_URL}/proxy/rules/site`);
			expect(body).toEqual({ domain: 'www.example.com', siteId: 'marketing' });
		});

		it('Redirect belonging to a site', async () => {
			const { request, body } = await run({
				operation: 'create',
				proxyRuleType: 'redirect',
				domain: 'example.com',
				url: 'https://www.example.com',
				proxyRedirectStatusCode: '308',
				proxyRuleResourceType: 'site',
				proxyRuleSiteId: 'marketing',
			});
			expect(request.url).toBe(`${BASE_URL}/proxy/rules/redirect`);
			expect(body).toEqual({
				domain: 'example.com',
				url: 'https://www.example.com',
				statusCode: '308',
				resourceType: 'site',
				resourceId: 'marketing',
			});
		});

		it('Redirect belonging to a function', async () => {
			const { body } = await run({
				operation: 'create',
				proxyRuleType: 'redirect',
				domain: 'old.example.com',
				url: 'https://new.example.com',
				proxyRuleResourceType: 'function',
				functionId: functionLocator,
			});
			expect(body).toMatchObject({
				resourceType: 'function',
				resourceId: 'fn1',
				statusCode: '301',
			});
		});
	});

	describe('Purge Cache', () => {
		it('purges everything without naming a tag or path', async () => {
			const { request, body } = await run({
				operation: 'purgeCache',
				domain: 'www.example.com',
			});
			expect(request.method).toBe('POST');
			expect(request.url).toBe(`${BASE_URL}/proxy/invalidations`);
			expect(body).toEqual({ domain: 'www.example.com', type: 'all' });
		});

		it('purges one path', async () => {
			const { body } = await run({
				operation: 'purgeCache',
				domain: 'www.example.com',
				proxyPurgeType: 'path',
				proxyPurgeReference: '/products/42',
			});
			expect(body).toEqual({ domain: 'www.example.com', type: 'path', reference: '/products/42' });
		});
	});

	it('Verify Domain retries verification of the chosen rule', async () => {
		const { request } = await run({ operation: 'verifyDomain', proxyRuleId: ruleLocator });
		expect(request.method).toBe('PATCH');
		expect(request.url).toBe(`${BASE_URL}/proxy/rules/rule1/status`);
		expect(request.body).toBeUndefined();
	});

	it('Get simplifies the rule to its most useful fields', async () => {
		const rule = {
			$id: 'rule1',
			$createdAt: '2026-01-01T00:00:00.000+00:00',
			domain: 'www.example.com',
			type: 'deployment',
			status: 'verified',
			renewAt: '2026-04-01T00:00:00.000+00:00',
		};
		const { output } = await run(
			{ operation: 'get', proxyRuleId: ruleLocator, simplify: true },
			rule,
		);
		expect(output[0].json).toEqual({
			$id: 'rule1',
			domain: 'www.example.com',
			type: 'deployment',
			status: 'verified',
		});
	});

	it('lists rules by domain, filtering them here since the endpoint has no search', async () => {
		const { context, requests } = createLoadOptionsContext({
			respond: () => ({
				rules: [
					{ $id: 'r1', domain: 'www.example.com' },
					{ $id: 'r2', domain: 'api.example.com' },
				],
			}),
		});

		expect(await searchProxyRules.call(context, 'API.')).toEqual({
			results: [{ name: 'api.example.com', value: 'r2' }],
			paginationToken: undefined,
		});
		expect(requests[0].url).toBe(`${BASE_URL}/proxy/rules`);
		expect((requests[0].qs as IDataObject).search).toBeUndefined();
	});

	it('pages on past a full page without a match instead of showing an empty list', async () => {
		const miss = Array.from({ length: 100 }, (_, i) => ({ $id: `r${i}`, domain: `site${i}.test` }));
		const { context, requests } = createLoadOptionsContext({
			respond: (_request, index) => ({
				rules: index === 0 ? miss : [{ $id: 'hit', domain: 'api.example.com' }],
			}),
		});

		expect(await searchProxyRules.call(context, 'example')).toEqual({
			results: [{ name: 'api.example.com', value: 'hit' }],
			paginationToken: undefined,
		});
		expect(requests).toHaveLength(2);
		expect(JSON.parse((requests[1].qs as Record<string, string>)['queries[1]'])).toEqual({
			method: 'cursorAfter',
			values: ['r99'],
		});
	});
});
