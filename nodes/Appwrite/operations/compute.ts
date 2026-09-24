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
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest, appwriteApiRequestBinary, appwriteFileUpload } from '../transport';

/**
 * Operations shared by the Function and Site resources. Both are Appwrite
 * compute resources whose deployments, environment variables and compute
 * specifications live under `/functions/{functionId}` and `/sites/{siteId}`
 * with the same shape, so one implementation serves both.
 */

/** The deployment-model fields most workflows read, for the Simplify toggle. */
const DEPLOYMENT_SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'type',
	'resourceId',
	'status',
	'activate',
	'totalSize',
	'buildDuration',
	'providerBranch',
	'providerCommitHash',
];

/**
 * The execution-model fields most workflows read, for the Simplify toggle of
 * function executions and site logs (a site log is an execution).
 */
export const EXECUTION_SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'deploymentId',
	'trigger',
	'status',
	'requestMethod',
	'requestPath',
	'responseStatusCode',
	'responseBody',
	'duration',
];

/** How the operations address one compute resource. */
export interface ComputeResource {
	/** The service's API path: `/functions` or `/sites`. */
	path: string;
	/** The resource locator parameter holding the record's ID, e.g. `functionId`. */
	idParameter: string;
	/** The Console URL kind, e.g. `function`. */
	kind: string;
	/** The locator's label for messages, e.g. `Function`. */
	label: string;
	/** Create Deployment options that Appwrite takes as form fields next to the code. */
	uploadOptions: string[];
}

/** Whether a buffer holds gzip data, going by the two bytes every gzip stream starts with. */
function isGzip(content: Buffer): boolean {
	return content.length >= 2 && content[0] === 0x1f && content[1] === 0x8b;
}

/**
 * Run a deployment, environment variable or specification operation of a
 * function or site. Returns undefined for any other operation, which the
 * calling resource handles itself.
 */
export async function executeComputeOperation(
	this: IExecuteFunctions,
	resource: ComputeResource,
	operation: string,
	i: number,
): Promise<INodeExecutionData[] | undefined> {
	// Resolved on first use: Get Many Specifications acts on no existing record.
	const recordId = (): string =>
		getResourceId.call(this, resource.idParameter, i, resource.kind, resource.label);
	const recordPath = (): string => `${resource.path}/${encodeURIComponent(recordId())}`;
	const deploymentPath = (): string => {
		const deploymentId = getStringParameter.call(this, 'deploymentId', i);
		return `${recordPath()}/deployments/${encodeURIComponent(deploymentId)}`;
	};
	const variablePath = (): string => {
		const variableId = getStringParameter.call(this, 'variableId', i);
		return `${recordPath()}/variables/${encodeURIComponent(variableId)}`;
	};
	const simplified = (data: IDataObject | IDataObject[]): IDataObject | IDataObject[] =>
		(this.getNodeParameter('simplify', i, false) as boolean)
			? simplifyItems(data, DEPLOYMENT_SIMPLIFY_FIELDS)
			: data;

	if (operation === 'activateDeployment') {
		const deploymentId = getStringParameter.call(this, 'deploymentId', i);
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${recordPath()}/deployment`,
			{ body: { deploymentId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'cancelDeployment') {
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${deploymentPath()}/status`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createDeployment') {
		const binaryPropertyName = getStringParameter.call(this, 'inputBinaryField', i);
		this.helpers.assertBinaryData(i, binaryPropertyName);
		const content = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		// Appwrite checks the package only by its file name, which is replaced
		// below, so check the content itself: a ZIP (such as a repository
		// downloaded as a zipball) would otherwise upload and fail to build.
		if (!isGzip(content)) {
			throw new NodeOperationError(
				this.getNode(),
				'The code package is not a gzip-compressed archive',
				{
					description: `Appwrite deploys ${resource.kind} code from a .tar.gz archive. Check that the '${binaryPropertyName}' input field holds one; to deploy a GitHub repository, download it as a tarball rather than a ZIP.`,
					itemIndex: i,
				},
			);
		}

		const activate = this.getNodeParameter('activate', i, false) as boolean;
		const options = getCollectionParameter.call(this, 'options', i);
		const fields: Array<[string, string]> = [['activate', String(activate)]];
		for (const name of resource.uploadOptions) {
			// A blank option leaves the setting to the function or site, as an
			// option never added does.
			const value = options[name];
			if (typeof value === 'string' && value !== '') fields.push([name, value]);
		}

		const response = await appwriteFileUpload.call(
			this,
			`${recordPath()}/deployments`,
			{
				content,
				// Appwrite requires a .gz name and stores the package under the new
				// deployment's ID. Binary data from a download often has no
				// extension, so send the name the Appwrite CLI uses.
				filename: 'code.tar.gz',
				contentType: 'application/gzip',
				field: 'code',
			},
			fields,
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createDuplicateDeployment') {
		const deploymentId = getStringParameter.call(this, 'deploymentId', i);
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${recordPath()}/deployments/duplicate`,
			{ body: { deploymentId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createTemplateDeployment') {
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${recordPath()}/deployments/template`,
			{
				body: {
					owner: getStringParameter.call(this, 'templateOwner', i),
					repository: getStringParameter.call(this, 'templateRepository', i),
					rootDirectory: getStringParameter.call(this, 'templateRootDirectory', i),
					type: getStringParameter.call(this, 'gitReferenceType', i),
					reference: getStringParameter.call(this, 'gitReference', i),
					activate: this.getNodeParameter('activate', i, false) as boolean,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createVcsDeployment') {
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${recordPath()}/deployments/vcs`,
			{
				body: {
					type: getStringParameter.call(this, 'gitReferenceType', i),
					reference: getStringParameter.call(this, 'gitReference', i),
					activate: this.getNodeParameter('activate', i, false) as boolean,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'deleteDeployment') {
		const deploymentId = getStringParameter.call(this, 'deploymentId', i);
		await appwriteApiRequest.call(this, 'DELETE', deploymentPath(), {}, i);
		return toItems({ deleted: true, [resource.idParameter]: recordId(), deploymentId }, i);
	}

	if (operation === 'downloadDeployment') {
		const deploymentId = getStringParameter.call(this, 'deploymentId', i);
		const options = getCollectionParameter.call(this, 'options', i) as {
			deploymentContent?: string;
		};
		const type = options.deploymentContent ?? 'source';
		const content = await appwriteApiRequestBinary.call(
			this,
			'GET',
			`${deploymentPath()}/download`,
			{ qs: { type } },
			i,
		);
		// The source is the uploaded .tar.gz. The build output is one too,
		// unless the instance is configured to store builds in another format.
		const gzip = isGzip(content);
		const binary = await this.helpers.prepareBinaryData(
			content,
			`${deploymentId}-${type}${gzip ? '.tar.gz' : ''}`,
			gzip ? 'application/gzip' : 'application/octet-stream',
		);
		const outputBinaryField = getStringParameter.call(this, 'outputBinaryField', i, 'data');
		return [
			{
				json: { [resource.idParameter]: recordId(), deploymentId, type },
				binary: { [outputBinaryField]: binary },
				pairedItem: { item: i },
			},
		];
	}

	if (operation === 'getDeployment') {
		const response = await appwriteApiRequest.call(this, 'GET', deploymentPath(), {}, i);
		return toItems(simplified(response), i);
	}

	if (operation === 'getManyDeployments') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search =
			(getCollectionParameter.call(this, 'options', i) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const deployments = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						`${recordPath()}/deployments`,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'deployments',
				i,
			);
			return toItems(simplified(deployments as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${recordPath()}/deployments`,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(simplified(response.deployments as IDataObject[]), i);
	}

	if (operation === 'getManySpecifications') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			specificationType?: string;
		};
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${resource.path}/specifications`,
			{ qs: { type: options.specificationType } },
			i,
		);
		return toItems((response.specifications ?? []) as IDataObject[], i);
	}

	if (operation === 'createVariable') {
		const variableId = resolveId(getStringParameter.call(this, 'variableId', i, ''));
		const key = getStringParameter.call(this, 'key', i);
		const value = getStringParameter.call(this, 'value', i);
		const secret = this.getNodeParameter('secret', i, true) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${recordPath()}/variables`,
			{ body: { variableId, key, value, secret } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'deleteVariable') {
		const variableId = getStringParameter.call(this, 'variableId', i);
		await appwriteApiRequest.call(this, 'DELETE', variablePath(), {}, i);
		return toItems({ deleted: true, [resource.idParameter]: recordId(), variableId }, i);
	}

	if (operation === 'getManyVariables') {
		// Since 1.9 Appwrite pages this list and returns only 25 variables when
		// the request sets no Limit. Older versions ignore the queries and return
		// every variable at once.
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			// Ignored queries would answer each page with the same full list, and
			// a list of 100 or more would then be fetched forever: stop as soon as
			// a page ends where the previous one did.
			let previousLastId: unknown;
			const variables = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) => {
					const page = await appwriteApiRequest.call(
						this,
						'GET',
						`${recordPath()}/variables`,
						{ qs: { queries: pageQueries } },
						i,
					);
					const list = (page.variables ?? []) as IDataObject[];
					const lastId = list[list.length - 1]?.$id;
					if (lastId !== undefined && lastId === previousLastId) return { variables: [] };
					previousLastId = lastId;
					return page;
				},
				'variables',
				i,
			);
			return toItems(variables as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${recordPath()}/variables`,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.variables as IDataObject[], i);
	}

	if (operation === 'getVariable') {
		const response = await appwriteApiRequest.call(this, 'GET', variablePath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'updateVariable') {
		const key = String(this.getNodeParameter('key', i, '') ?? '');
		const value = getStringParameter.call(this, 'value', i, '');
		const secret = this.getNodeParameter('secret', i, false) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			variablePath(),
			{
				body: {
					key: key === '' ? undefined : key,
					value: value === '' ? undefined : value,
					// `secret` is one-way in Appwrite: once set it cannot be turned back
					// off, and omitting it keeps the variable's current setting - which
					// is what an untouched toggle promises in the UI.
					secret: secret ? true : undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	return undefined;
}
