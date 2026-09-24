import type {
	IDataObject,
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import api from './fixtures/appwrite-api.json';
import { BASE_URL, createExecuteContext, description, node } from './helpers/mock-context';

const operations = api.operations as Record<string, { body: Record<string, unknown> }>;

/** Each action's endpoint segment, as the Appwrite API names it. */
const ACTIONS: Record<string, string> = {
	bypass: 'bypass',
	challenge: 'challenge',
	deny: 'deny',
	rateLimit: 'rate-limit',
	redirect: 'redirect',
};

/**
 * The challenge endpoints take a challenge type whose only value is the
 * default, so the node deliberately does not send it.
 */
const NOT_OFFERED = ['challengeType'];

/** The body keys Appwrite documents for an endpoint, minus the ones the node does not offer. */
function specBodyKeys(key: string): string[] {
	return Object.keys(operations[key].body)
		.filter((name) => !NOT_OFFERED.includes(name))
		.sort();
}

/** The collection (Options or Update Fields) the node shows for an action. */
function collectionFor(name: string, operation: string, action: string): INodeProperties {
	const property = description.properties.find(
		(candidate) =>
			candidate.name === name &&
			candidate.displayOptions?.show?.resource?.includes('wafRule') &&
			candidate.displayOptions?.show?.operation?.includes(operation) &&
			candidate.displayOptions?.show?.wafRuleType?.includes(action),
	);
	if (property === undefined) throw new Error(`No ${name} for ${operation} ${action}`);
	return property;
}

/** A value for every field of a collection, the way a user who adds all of them would fill it. */
function fillCollection(collection: INodeProperties): INodeParameters {
	const values: INodeParameters = {};
	for (const option of collection.options as INodeProperties[]) {
		if (option.type === 'fixedCollection') {
			values[option.name] = {
				conditionValues: [
					{
						wafConditionAttribute: 'country',
						wafConditionOperator: 'equal',
						wafConditionValue: 'US',
					},
				],
			};
		} else if (option.type === 'options') {
			values[option.name] = (option.options as INodePropertyOptions[])[0].value;
		} else if (option.type === 'number') {
			values[option.name] = 5;
		} else if (option.type === 'boolean') {
			values[option.name] = false;
		} else {
			values[option.name] = `${option.name}-value`;
		}
	}
	return values;
}

const functionLocator = { __rl: true, mode: 'id', value: 'fn1' };
const ruleLocator = { __rl: true, mode: 'id', value: 'rule1' };

async function run(parameters: INodeParameters) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'wafRule', ...parameters },
		respond: () => ({ $id: 'rule1' }),
	});
	const [output] = await node.execute.call(context);
	return { output, requests, body: requests[0]?.body as IDataObject };
}

describe('Firewall Rule', () => {
	describe.each(Object.entries(ACTIONS))('the %s action', (action, path) => {
		it('creates with exactly the settings its endpoint documents', async () => {
			const { requests, body } = await run({
				operation: 'create',
				wafRuleType: action,
				name: 'Rule',
				wafRuleId: 'rule1',
				wafResourceType: 'functions',
				functionId: functionLocator,
				wafConditionsUi: {
					conditionValues: [
						{
							wafConditionAttribute: 'path',
							wafConditionOperator: 'startsWith',
							wafConditionValue: '/v1',
						},
					],
				},
				// The fields the action requires, on the node's face.
				wafRequestLimit: 10,
				wafInterval: 60,
				wafRedirectLocation: '/maintenance',
				wafRedirectStatusCode: 307,
				options: fillCollection(collectionFor('options', 'create', action)),
			});

			expect(requests[0].method).toBe('POST');
			expect(requests[0].url).toBe(`${BASE_URL}/waf/rules/${path}`);
			expect(Object.keys(body).sort()).toEqual(specBodyKeys(`POST /waf/rules/${path}`));
			expect(body).toMatchObject({ ruleId: 'rule1', resourceType: 'functions', resourceId: 'fn1' });
		});

		it('updates with exactly the settings its endpoint documents', async () => {
			const { requests, body } = await run({
				operation: 'update',
				wafRuleType: action,
				wafRuleId: ruleLocator,
				updateFields: fillCollection(collectionFor('updateFields', 'update', action)),
			});

			expect(requests[0].method).toBe('PATCH');
			expect(requests[0].url).toBe(`${BASE_URL}/waf/rules/${path}/rule1`);
			expect(Object.keys(body).sort()).toEqual(specBodyKeys(`PATCH /waf/rules/${path}/{ruleId}`));
		});
	});

	it('sends the settings each action requires from the node face', async () => {
		const { body } = await run({
			operation: 'create',
			wafRuleType: 'rateLimit',
			name: 'Rate limit sign-in',
			wafRequestLimit: 10,
			wafInterval: 60,
		});
		expect(body).toMatchObject({ limit: 10, interval: 60, resourceType: 'api' });
		// An API rule has no resource ID, and no conditions means every request.
		expect(body).not.toHaveProperty('resourceId');
		expect(body).not.toHaveProperty('conditions');
	});

	it("never sends another action's settings left behind in Options", async () => {
		const { body } = await run({
			operation: 'create',
			wafRuleType: 'deny',
			name: 'Deny',
			options: { wafChallengeDifficulty: 5, wafRateLimitStrategy: 'tokenBucket', wafPriority: 10 },
		});
		expect(body).toMatchObject({ priority: 10 });
		expect(body).not.toHaveProperty('difficulty');
		expect(body).not.toHaveProperty('strategy');
	});

	it('names a site by its ID', async () => {
		const { body } = await run({
			operation: 'create',
			wafRuleType: 'challenge',
			name: 'Challenge sign-up',
			wafResourceType: 'sites',
			wafRuleSiteId: 'marketing',
		});
		expect(body).toMatchObject({ resourceType: 'sites', resourceId: 'marketing' });
	});

	describe('conditions', () => {
		const sentConditions = async (conditionValues: INodeParameters[]) =>
			(
				await run({
					operation: 'create',
					wafRuleType: 'deny',
					name: 'Deny',
					wafConditionsUi: { conditionValues },
				})
			).body.conditions as unknown[];
		const conditionsOf = async (conditionValues: INodeParameters[]) =>
			(await sentConditions(conditionValues)).map((condition) => JSON.parse(String(condition)));

		const failureOf = async (conditionValues: INodeParameters[]) => {
			const { context, requests } = createExecuteContext({
				parameters: {
					resource: 'wafRule',
					operation: 'create',
					wafRuleType: 'deny',
					name: 'Deny',
					wafConditionsUi: { conditionValues },
				},
			});
			const error = await node.execute.call(context).then(
				() => undefined,
				(caught: unknown) => caught,
			);
			expect(requests).toHaveLength(0);
			expect(error).toBeInstanceOf(NodeOperationError);
			return (error as NodeOperationError).message;
		};

		it('are sent as condition strings, each a JSON-encoded condition, as queries are', async () => {
			expect(
				await sentConditions([
					{ wafConditionAttribute: 'path', wafConditionOperator: 'equal', wafConditionValue: '/a' },
				]),
			).toEqual(['{"method":"equal","attribute":"path","values":["/a"]}']);
		});

		it('become Appwrite conditions', async () => {
			expect(
				await conditionsOf([
					{
						wafConditionAttribute: 'country',
						wafConditionOperator: 'equal',
						wafConditionValue: 'RU',
					},
					{
						wafConditionAttribute: 'path',
						wafConditionOperator: 'startsWith',
						wafConditionValue: '/v1',
					},
				]),
			).toEqual([
				{ method: 'equal', attribute: 'country', values: ['RU'] },
				{ method: 'startsWith', attribute: 'path', values: ['/v1'] },
			]);
		});

		it('name a header or query parameter in lowercase, as Appwrite only matches that', async () => {
			expect(
				await conditionsOf([
					{
						wafConditionAttribute: 'headers',
						wafConditionKey: ' X-Api-Client ',
						wafConditionOperator: 'equal',
						wafConditionValue: 'mobile',
					},
					{
						wafConditionAttribute: 'query',
						wafConditionKey: 'Token',
						wafConditionOperator: 'contains',
						wafConditionValue: 'abc',
					},
				]),
			).toEqual([
				{ method: 'equal', attribute: 'headers.x-api-client', values: ['mobile'] },
				{ method: 'contains', attribute: 'query.token', values: ['abc'] },
			]);
		});

		it('ignore a name given for an attribute that takes none', async () => {
			expect(
				await conditionsOf([
					{
						wafConditionAttribute: 'ip',
						wafConditionKey: 'leftover',
						wafConditionOperator: 'equal',
						wafConditionValue: '10.0.0.0/8',
					},
				]),
			).toEqual([{ method: 'equal', attribute: 'ip', values: ['10.0.0.0/8'] }]);
		});

		it('send an empty value list for operators that compare with no value', async () => {
			expect(
				await conditionsOf([
					{
						wafConditionAttribute: 'headers',
						wafConditionKey: 'x-api-client',
						wafConditionOperator: 'isNull',
						wafConditionValue: 'ignored',
					},
				]),
			).toEqual([{ method: 'isNull', attribute: 'headers.x-api-client', values: [] }]);
		});

		it('stop the item before any request when a header condition has no name', async () => {
			const { context, requests } = createExecuteContext({
				parameters: {
					resource: 'wafRule',
					operation: 'create',
					wafRuleType: 'deny',
					name: 'Deny',
					wafConditionsUi: {
						conditionValues: [{ wafConditionAttribute: 'headers', wafConditionValue: 'x' }],
					},
				},
			});
			await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
			await expect(node.execute.call(context)).rejects.toThrow('A Header condition has no name');
			expect(requests).toHaveLength(0);
		});

		it('match any of several values given one per line', async () => {
			expect(
				await conditionsOf([
					{
						wafConditionAttribute: 'country',
						wafConditionOperator: 'equal',
						wafConditionValue: 'NL\n DE \n\n',
					},
				]),
			).toEqual([{ method: 'equal', attribute: 'country', values: ['NL', 'DE'] }]);
		});

		it('take the two bounds of a range on two lines', async () => {
			expect(
				await conditionsOf([
					{
						wafConditionAttribute: 'latitude',
						wafConditionOperator: 'between',
						wafConditionValue: '10\r\n20',
					},
				]),
			).toEqual([{ method: 'between', attribute: 'latitude', values: ['10', '20'] }]);
		});

		it('send a value an expression resolved to a number as text', async () => {
			expect(
				await conditionsOf([
					{
						wafConditionAttribute: 'autonomousSystemNumber',
						wafConditionOperator: 'equal',
						wafConditionValue: 13335,
					},
				]),
			).toEqual([{ method: 'equal', attribute: 'autonomousSystemNumber', values: ['13335'] }]);
		});

		it('stop the item before any request when a condition has the wrong number of values', async () => {
			expect(
				await failureOf([
					{ wafConditionAttribute: 'path', wafConditionOperator: 'equal', wafConditionValue: ' ' },
				]),
			).toBe('A condition has no value');
			expect(
				await failureOf([
					{
						wafConditionAttribute: 'path',
						wafConditionOperator: 'startsWith',
						wafConditionValue: '/a\n/b',
					},
				]),
			).toBe('This condition compares with a single value');
			expect(
				await failureOf([
					{
						wafConditionAttribute: 'latitude',
						wafConditionOperator: 'notBetween',
						wafConditionValue: '10',
					},
				]),
			).toBe('A range condition needs exactly two values');
		});

		it('are left out of an update that does not change them, keeping the current ones', async () => {
			const { body } = await run({
				operation: 'update',
				wafRuleType: 'deny',
				wafRuleId: ruleLocator,
				updateFields: { wafPriority: 5, wafConditionsUi: {} },
			});
			expect(body).toEqual({ priority: 5 });
		});
	});

	it('deletes a rule and confirms it', async () => {
		const { output, requests } = await run({ operation: 'delete', wafRuleId: ruleLocator });
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].url).toBe(`${BASE_URL}/waf/rules/rule1`);
		expect(output.map((item) => item.json)).toEqual([{ deleted: true, ruleId: 'rule1' }]);
	});
});
