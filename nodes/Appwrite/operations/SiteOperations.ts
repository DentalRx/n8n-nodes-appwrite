import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';
import type { ComputeResource } from './compute';
import { EXECUTION_SIMPLIFY_FIELDS, executeComputeOperation } from './compute';

/** The site-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'framework',
	'enabled',
	'live',
	'deploymentId',
	'latestDeploymentId',
	'latestDeploymentStatus',
	'buildRuntime',
	'adapter',
];

/** How the deployment, variable and specification operations shared with Function find a site. */
const SITE_RESOURCE: ComputeResource = {
	path: '/sites',
	idParameter: 'siteId',
	kind: 'site',
	label: 'Site',
	uploadOptions: ['buildCommand', 'installCommand', 'outputDirectory'],
};

/**
 * A setting an existing site has, for update to resend. Empty and null values
 * are left out: Appwrite rejects an empty rendering or build runtime and a
 * null where it expects text, and leaving such a field out applies the same
 * empty default.
 */
function kept(current: IDataObject | undefined, key: string): IDataObject[string] {
	const value = current?.[key];
	return value === null || value === '' ? undefined : value;
}

interface SiteConfigOptions {
	buildCommand?: string;
	buildRuntime?: string;
	enabled?: boolean;
	fallbackFile?: string;
	installCommand?: string;
	logging?: boolean;
	outputDirectory?: string;
	scopes?: string;
	siteAdapter?: string;
	siteFramework?: string;
	startCommand?: string;
	timeout?: number;
}

export async function executeSiteOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: create and the list operations act on no existing site.
	const siteId = (): string => getResourceId.call(this, 'siteId', i, 'site', 'Site');
	const sitePath = (): string => `/sites/${encodeURIComponent(siteId())}`;
	const logPath = (): string => {
		const logId = this.getNodeParameter('logId', i) as string;
		return `${sitePath()}/logs/${encodeURIComponent(logId)}`;
	};
	const simplified = (data: IDataObject | IDataObject[], fields: string[]) =>
		(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data;

	const getConfigOptionArgs = (current?: IDataObject): IDataObject => {
		const options = this.getNodeParameter('options', i, {}) as SiteConfigOptions;
		// An option the user never added keeps whatever the site already has
		// (`current` is set on update only); an option added and left blank clears it.
		const text = (raw: string | undefined, key: string) =>
			raw === undefined ? kept(current, key) : raw;

		return {
			enabled: options.enabled ?? kept(current, 'enabled'),
			logging: options.logging ?? kept(current, 'logging'),
			timeout: options.timeout ?? kept(current, 'timeout'),
			installCommand: text(options.installCommand, 'installCommand'),
			buildCommand: text(options.buildCommand, 'buildCommand'),
			startCommand: text(options.startCommand, 'startCommand'),
			outputDirectory: text(options.outputDirectory, 'outputDirectory'),
			adapter: options.siteAdapter ?? kept(current, 'adapter'),
			fallbackFile: text(options.fallbackFile, 'fallbackFile'),
			scopes:
				options.scopes === undefined
					? kept(current, 'scopes')
					: parseStringList.call(this, options.scopes, 'Scopes', i),
		};
	};

	if (operation === 'create') {
		const newSiteId = resolveId(this.getNodeParameter('siteId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		// Framework and runtime keys are passed through as-is: Appwrite adds
		// both with its releases, and the node must not restrict them to a
		// fixed list.
		const framework = this.getNodeParameter('siteFramework', i) as string;
		const buildRuntime = this.getNodeParameter('buildRuntime', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/sites',
			{
				body: { siteId: newSiteId, name, framework, buildRuntime, ...getConfigOptionArgs() },
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(this, 'DELETE', sitePath(), {}, i);
		return toItems({ deleted: true, siteId: siteId() }, i);
	}

	if (operation === 'deleteLog') {
		const logId = this.getNodeParameter('logId', i) as string;
		await appwriteApiRequest.call(this, 'DELETE', logPath(), {}, i);
		return toItems({ deleted: true, siteId: siteId(), logId }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', sitePath(), {}, i);
		return toItems(simplified(response, SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getLog') {
		const response = await appwriteApiRequest.call(this, 'GET', logPath(), {}, i);
		return toItems(simplified(response, EXECUTION_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const sites = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/sites',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'sites',
				i,
			);
			return toItems(simplified(sites as IDataObject[], SIMPLIFY_FIELDS), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/sites',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(simplified(response.sites as IDataObject[], SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManyFrameworks') {
		const response = await appwriteApiRequest.call(this, 'GET', '/sites/frameworks', {}, i);
		return toItems((response.frameworks ?? []) as IDataObject[], i);
	}

	if (operation === 'getManyLogs') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		// A site log is an execution record, so the list comes back under `executions`.
		if (returnAll) {
			const logs = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						`${sitePath()}/logs`,
						{ qs: { queries: pageQueries } },
						i,
					),
				'executions',
				i,
			);
			return toItems(simplified(logs as IDataObject[], EXECUTION_SIMPLIFY_FIELDS), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${sitePath()}/logs`,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(simplified(response.executions as IDataObject[], EXECUTION_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'update') {
		const name = this.getNodeParameter('name', i) as string;
		const options = this.getNodeParameter('options', i, {}) as SiteConfigOptions;
		// PUT /sites/{id} is a full replace: any field left out of the body is
		// reset to the API's own default rather than kept, which would silently
		// clear the build commands, the rendering and the linked Git
		// repository. Read the site first and resend everything unchanged.
		const current = await appwriteApiRequest.call(this, 'GET', sitePath(), {}, i);
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			sitePath(),
			{
				body: {
					name,
					framework: options.siteFramework || kept(current, 'framework'),
					buildRuntime: options.buildRuntime || kept(current, 'buildRuntime'),
					...getConfigOptionArgs(current),
					// Not exposed by the node, but omitting them would disconnect the
					// site from its repository or reset its compute, build and
					// deployment-retention configuration.
					installationId: kept(current, 'installationId'),
					providerRepositoryId: kept(current, 'providerRepositoryId'),
					providerBranch: kept(current, 'providerBranch'),
					providerBranches: kept(current, 'providerBranches'),
					providerPaths: kept(current, 'providerPaths'),
					providerSilentMode: kept(current, 'providerSilentMode'),
					providerRootDirectory: kept(current, 'providerRootDirectory'),
					runtimeSpecification: kept(current, 'runtimeSpecification'),
					buildSpecification: kept(current, 'buildSpecification'),
					deploymentRetention: kept(current, 'deploymentRetention'),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	const computeResult = await executeComputeOperation.call(this, SITE_RESOURCE, operation, i);
	if (computeResult !== undefined) return computeResult;

	throw new NodeOperationError(this.getNode(), `Unknown site operation "${operation}"`, {
		itemIndex: i,
	});
}
