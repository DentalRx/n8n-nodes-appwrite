import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

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
import { appwriteApiRequest } from '../transport';

/** The proxy-rule fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'domain',
	'type',
	'trigger',
	'status',
	'logs',
	'redirectUrl',
	'redirectStatusCode',
	'deploymentResourceType',
	'deploymentResourceId',
];

export async function executeProxyRuleOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const ruleId = (): string => getResourceId.call(this, 'proxyRuleId', i, 'rule', 'Proxy Rule');
	const simplified = (data: IDataObject | IDataObject[]) =>
		this.getNodeParameter('simplify', i, false) ? simplifyItems(data, SIMPLIFY_FIELDS) : data;

	if (operation === 'create') {
		const type = getStringParameter.call(this, 'proxyRuleType', i);
		const domain = getStringParameter.call(this, 'domain', i);
		const functionId = () => getResourceId.call(this, 'functionId', i, 'function', 'Function');
		const siteId = () => getStringParameter.call(this, 'proxyRuleSiteId', i);
		const branch = () =>
			(getCollectionParameter.call(this, 'options', i) as { proxyRuleBranch?: string })
				.proxyRuleBranch || undefined;

		// Each rule type has its own endpoint, taking the domain plus what it routes to.
		let body: IDataObject;
		if (type === 'api') {
			body = { domain };
		} else if (type === 'function') {
			body = { domain, functionId: functionId(), branch: branch() };
		} else if (type === 'site') {
			body = { domain, siteId: siteId(), branch: branch() };
		} else if (type === 'redirect') {
			const resourceType = getStringParameter.call(this, 'proxyRuleResourceType', i);
			body = {
				domain,
				url: getStringParameter.call(this, 'url', i),
				statusCode: getStringParameter.call(this, 'proxyRedirectStatusCode', i),
				resourceType,
				resourceId: resourceType === 'function' ? functionId() : siteId(),
			};
		} else {
			throw new NodeOperationError(this.getNode(), `Unknown proxy rule type "${type}"`, {
				description: 'Choose API, Function, Redirect, or Site.',
				itemIndex: i,
			});
		}

		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`/proxy/rules/${type}`,
			{ body },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const id = ruleId();
		await appwriteApiRequest.call(this, 'DELETE', `/proxy/rules/${encodeURIComponent(id)}`, {}, i);
		return toItems({ deleted: true, ruleId: id }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/proxy/rules/${encodeURIComponent(ruleId())}`,
			{},
			i,
		);
		return toItems(simplified(response), i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const rules = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/proxy/rules',
						{ qs: { queries: pageQueries } },
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
			'/proxy/rules',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(simplified(response.rules as IDataObject[]), i);
	}

	if (operation === 'purgeCache') {
		const type = getStringParameter.call(this, 'proxyPurgeType', i);
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/proxy/invalidations',
			{
				body: {
					domain: getStringParameter.call(this, 'domain', i),
					type,
					// Purging everything names no tag or path.
					reference:
						type === 'all' ? undefined : getStringParameter.call(this, 'proxyPurgeReference', i),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'verifyDomain') {
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/proxy/rules/${encodeURIComponent(ruleId())}/status`,
			{},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown proxy rule operation "${operation}"`, {
		itemIndex: i,
	});
}
