import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { WafRuleSetting, WafRuleType } from '../descriptions/WafRuleDescription';
import {
	WAF_COMMON_OPTIONS,
	WAF_COMMON_UPDATE_FIELDS,
	WAF_MULTI_VALUE_OPERATORS,
	WAF_RANGE_OPERATORS,
	WAF_RULE_TYPES,
	WAF_VALUELESS_OPERATORS,
} from '../descriptions/WafRuleDescription';
import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getResourceId,
	getStringParameter,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The firewall-rule fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'description',
	'action',
	'enabled',
	'priority',
	'resourceType',
	'resourceId',
	'conditions',
	'config',
];

/** Attributes that compare one named header or query parameter, sent as `<attribute>.<name>`. */
const NAMED_ATTRIBUTES: Record<string, string> = { headers: 'Header', query: 'Query Parameter' };

interface ConditionEntry {
	wafConditionAttribute?: string;
	wafConditionKey?: string;
	wafConditionOperator?: string;
	wafConditionValue?: unknown;
}

/**
 * Turn the Conditions builder into Appwrite's condition strings: each one is a
 * JSON-encoded `{ method, attribute, values }` object, as queries are. Returns
 * undefined when there are none, so an update keeps the current conditions.
 */
function buildWafConditions(
	this: IExecuteFunctions,
	raw: { conditionValues?: ConditionEntry[] } | undefined,
	itemIndex: number,
): string[] | undefined {
	const entries = raw?.conditionValues ?? [];
	if (entries.length === 0) return undefined;

	return entries.map((entry) => {
		let attribute = entry.wafConditionAttribute ?? 'path';
		const label = NAMED_ATTRIBUTES[attribute];
		if (label !== undefined) {
			// Appwrite stores header and parameter names in lowercase and never
			// matches a condition written otherwise; the Console lowercases them too.
			const name = String(entry.wafConditionKey ?? '')
				.trim()
				.toLowerCase();
			if (name === '') {
				throw new NodeOperationError(this.getNode(), `A ${label} condition has no name`, {
					description: `Enter the name of the ${label.toLowerCase()} to compare, e.g. x-api-client.`,
					itemIndex,
				});
			}
			attribute = `${attribute}.${name}`;
		}

		const method = entry.wafConditionOperator ?? 'equal';
		return JSON.stringify({
			method,
			attribute,
			values: conditionValues.call(this, method, entry.wafConditionValue, itemIndex),
		});
	});
}

/**
 * The values a condition compares with: one per line, as many as its operator
 * takes. Operators that compare with no value still take an empty list.
 */
function conditionValues(
	this: IExecuteFunctions,
	method: string,
	raw: unknown,
	itemIndex: number,
): string[] {
	if (WAF_VALUELESS_OPERATORS.includes(method)) return [];
	const values = String(raw ?? '')
		.split(/\r?\n/)
		.map((value) => value.trim())
		.filter((value) => value !== '');
	const fail = (message: string, description: string): never => {
		throw new NodeOperationError(this.getNode(), message, { description, itemIndex });
	};
	if (values.length === 0) {
		fail(
			'A condition has no value',
			'Enter the value to compare with, or choose Is Empty or Is Not Empty.',
		);
	}
	if (WAF_RANGE_OPERATORS.includes(method)) {
		if (values.length !== 2) {
			fail(
				'A range condition needs exactly two values',
				'Enter the lower bound and the upper bound on two lines.',
			);
		}
	} else if (!WAF_MULTI_VALUE_OPERATORS.includes(method) && values.length > 1) {
		fail(
			'This condition compares with a single value',
			'Only Equals, Not Equal, Contains and Does Not Contain take several values, one per line.',
		);
	}
	return values;
}

/** Copy the settings present in a collection onto a request body, under their body keys. */
function applySettings(body: IDataObject, values: IDataObject, settings: WafRuleSetting[]): void {
	for (const { key, property } of settings) {
		if (values[property.name] !== undefined) body[key] = values[property.name];
	}
}

export async function executeWafRuleOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const ruleId = (): string => getResourceId.call(this, 'wafRuleId', i, 'rule', 'Firewall Rule');
	const simplified = (data: IDataObject | IDataObject[]) =>
		this.getNodeParameter('simplify', i, false) ? simplifyItems(data, SIMPLIFY_FIELDS) : data;

	const ruleType = (): WafRuleType => {
		const value = getStringParameter.call(this, 'wafRuleType', i);
		const type = WAF_RULE_TYPES.find((candidate) => candidate.option.value === value);
		if (type === undefined) {
			throw new NodeOperationError(this.getNode(), `Unknown firewall rule action "${value}"`, {
				description: `Expected one of: ${WAF_RULE_TYPES.map((candidate) => candidate.option.value).join(', ')}.`,
				itemIndex: i,
			});
		}
		return type;
	};

	if (operation === 'create') {
		const type = ruleType();
		const resourceType = getStringParameter.call(this, 'wafResourceType', i);
		let resourceId: string | undefined;
		if (resourceType === 'functions') {
			resourceId = getResourceId.call(this, 'functionId', i, 'function', 'Function');
		} else if (resourceType === 'sites') {
			resourceId = getStringParameter.call(this, 'wafRuleSiteId', i);
		}

		const body: IDataObject = {
			ruleId: resolveId(getStringParameter.call(this, 'wafRuleId', i, '')),
			name: getStringParameter.call(this, 'name', i),
			resourceType,
			resourceId,
			conditions: buildWafConditions.call(
				this,
				getCollectionParameter.call(this, 'wafConditionsUi', i) as {
					conditionValues?: ConditionEntry[];
				},
				i,
			),
		};
		for (const { key, property } of type.required) {
			body[key] =
				property.type === 'string'
					? getStringParameter.call(this, property.name, i)
					: (this.getNodeParameter(property.name, i) as IDataObject[string]);
		}
		applySettings(body, getCollectionParameter.call(this, 'options', i), [
			...WAF_COMMON_OPTIONS,
			...type.createOptions,
		]);

		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`/waf/rules/${type.path}`,
			{ body },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const id = ruleId();
		await appwriteApiRequest.call(this, 'DELETE', `/waf/rules/${encodeURIComponent(id)}`, {}, i);
		return toItems({ deleted: true, ruleId: id }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/waf/rules/${encodeURIComponent(ruleId())}`,
			{},
			i,
		);
		return toItems(simplified(response), i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search =
			(getCollectionParameter.call(this, 'options', i) as { search?: string }).search ?? '';
		const searchArg = search === '' ? undefined : search;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const rules = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/waf/rules',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'rules',
				i,
			);
			return toItems(simplified(rules as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/waf/rules',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(simplified(response.rules as IDataObject[]), i);
	}

	if (operation === 'update') {
		const type = ruleType();
		const path = `/waf/rules/${type.path}/${encodeURIComponent(ruleId())}`;
		const fields = getCollectionParameter.call(this, 'updateFields', i);
		const body: IDataObject = {
			conditions: buildWafConditions.call(
				this,
				fields.wafConditionsUi as { conditionValues?: ConditionEntry[] } | undefined,
				i,
			),
		};
		applySettings(body, fields, [
			...WAF_COMMON_OPTIONS,
			...WAF_COMMON_UPDATE_FIELDS,
			...type.updateFields,
		]);

		const response = await appwriteApiRequest.call(this, 'PATCH', path, { body }, i);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown firewall rule operation "${operation}"`, {
		itemIndex: i,
	});
}
