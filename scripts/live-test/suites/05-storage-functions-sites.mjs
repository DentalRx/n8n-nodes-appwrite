import { id, ref, payload } from '../common.mjs';

const PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FN_B64 = payload('fn.b64');
const SITE_B64 = payload('site.b64');
/** A Set node holding base64 data and a Convert to File node turning it into binary `data`. */
const file = (label, b64, fileName, mimeType) => [
	{
		name: `${label} (base64)`,
		raw: {
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			parameters: {
				mode: 'manual',
				assignments: { assignments: [{ id: 'b64', name: 'b64', value: b64, type: 'string' }] },
				options: {},
			},
		},
	},
	{
		name: `${label} (file)`,
		raw: {
			type: 'n8n-nodes-base.convertToFile',
			typeVersion: 1.1,
			parameters: { operation: 'toBinary', sourceProperty: 'b64', options: { fileName, mimeType } },
		},
	},
];
const B = id('bkt');
const F = id('f1');
const FN = id('fn');
const SITE = id('site');

export default [
	{
		key: 'Storage',
		title: 'Storage: buckets, files, file tokens',
		steps: [
			{
				name: 'Create Bucket',
				op: 'bucket.create',
				set: {
					bucketId: B,
					name: 'Test Bucket',
					permissions: 'read("any")',
					options: {
						maximumFileSize: 10485760,
						allowedFileExtensions: 'png,jpg,txt',
						compression: 'gzip',
						transformations: true,
					},
				},
			},
			{ name: 'Get Bucket', op: 'bucket.get', set: { bucketId: B } },
			{ name: 'Get Many Buckets', op: 'bucket.getMany', set: { limit: 5 } },
			{
				name: 'Update Bucket',
				op: 'bucket.update',
				set: { bucketId: B, name: 'Test Bucket (renamed)', options: { fileSecurity: true } },
			},
			...file('PNG', PNG, 'pixel.png', 'image/png'),
			{
				name: 'Upload File',
				op: 'file.upload',
				set: { bucketId: B, fileId: F, inputBinaryField: 'data', fileName: 'pixel.png' },
			},
			{ name: 'Get File', op: 'file.get', set: { bucketId: B, fileId: F } },
			{ name: 'Get Many Files', op: 'file.getMany', set: { bucketId: B } },
			{
				name: 'Update File',
				op: 'file.update',
				set: { bucketId: B, fileId: F, fileName: 'renamed.png' },
			},
			{ name: 'Download File', op: 'file.download', set: { bucketId: B, fileId: F } },
			{
				name: 'Get File Preview',
				op: 'file.getPreview',
				set: { bucketId: B, fileId: F, options: { width: 16, height: 16, output: 'png' } },
			},
			{ name: 'Get File View', op: 'file.getView', set: { bucketId: B, fileId: F } },
			{
				name: 'Create File Token',
				op: 'token.create',
				set: { bucketId: B, fileId: F, expire: '={{ $now.plus({ days: 1 }).toISO() }}' },
			},
			{
				name: 'Get File Token',
				op: 'token.get',
				set: { tokenId: ref('Storage: Create File Token') },
			},
			{ name: 'Get Many File Tokens', op: 'token.getMany', set: { bucketId: B, fileId: F } },
			{
				name: 'Update File Token',
				op: 'token.update',
				set: {
					tokenId: ref('Storage: Create File Token'),
					expire: '={{ $now.plus({ days: 2 }).toISO() }}',
				},
			},
			{
				name: 'Delete File Token',
				op: 'token.delete',
				set: { tokenId: ref('Storage: Create File Token') },
			},
			{ name: 'Delete File', op: 'file.delete', set: { bucketId: B, fileId: F } },
			{ name: 'Delete Bucket', op: 'bucket.delete', set: { bucketId: B } },
		],
	},
	{
		key: 'Fn',
		title: 'Functions: deployments, variables, executions',
		steps: [
			{ name: 'Get Many Runtimes', op: 'function.getManyRuntimes' },
			{ name: 'Get Many Specifications', op: 'function.getManySpecifications' },
			{
				name: 'Create Function',
				op: 'function.create',
				set: {
					functionId: FN,
					name: 'Live Test Function',
					runtime: 'node-22',
					options: { entrypoint: 'index.js', execute: 'any', timeout: 15, logging: true },
				},
			},
			{ name: 'Get Function', op: 'function.get', set: { functionId: FN } },
			{ name: 'Get Many Functions', op: 'function.getMany', set: { limit: 5 } },
			{
				name: 'Update Function',
				op: 'function.update',
				set: { functionId: FN, name: 'Live Test Function (renamed)', options: { timeout: 20 } },
			},
			{
				name: 'Create Variable',
				op: 'function.createVariable',
				set: { functionId: FN, key: 'GREETING', value: 'hello', secret: false },
			},
			{
				name: 'Get Variable',
				op: 'function.getVariable',
				set: { functionId: FN, variableId: ref('Fn: Create Variable') },
			},
			{ name: 'Get Many Variables', op: 'function.getManyVariables', set: { functionId: FN } },
			{
				name: 'Update Variable',
				op: 'function.updateVariable',
				set: { functionId: FN, variableId: ref('Fn: Create Variable'), value: 'hi there' },
			},
			...file('Code', FN_B64, 'code.tar.gz', 'application/gzip'),
			{
				name: 'Create Deployment',
				op: 'function.createDeployment',
				set: {
					functionId: FN,
					inputBinaryField: 'data',
					activate: true,
					options: { entrypoint: 'index.js' },
				},
			},
			{ name: 'Wait For Build', wait: 60 },
			{
				name: 'Get Deployment',
				op: 'function.getDeployment',
				set: { functionId: FN, deploymentId: ref('Fn: Create Deployment') },
			},
			{ name: 'Get Many Deployments', op: 'function.getManyDeployments', set: { functionId: FN } },
			{
				name: 'Activate Deployment',
				op: 'function.activateDeployment',
				set: { functionId: FN, deploymentId: ref('Fn: Create Deployment') },
			},
			{
				name: 'Create Execution (sync)',
				op: 'execution.create',
				set: {
					functionId: FN,
					body: '{"hello":"world"}',
					options: { method: 'POST', xpath: '/', headers: '{"content-type":"application/json"}' },
				},
			},
			{
				name: 'Create Execution (async)',
				op: 'execution.create',
				set: { functionId: FN, body: 'async body', async: true },
			},
			{
				name: 'Get Execution',
				op: 'execution.get',
				set: { functionId: FN, executionId: ref('Fn: Create Execution (sync)') },
			},
			{ name: 'Get Many Executions', op: 'execution.getMany', set: { functionId: FN } },
			{
				name: 'Delete Execution',
				op: 'execution.delete',
				set: { functionId: FN, executionId: ref('Fn: Create Execution (sync)') },
			},
			{
				name: 'Duplicate Deployment',
				op: 'function.createDuplicateDeployment',
				set: { functionId: FN, deploymentId: ref('Fn: Create Deployment') },
			},
			{
				name: 'Template Deployment',
				op: 'function.createTemplateDeployment',
				set: {
					functionId: FN,
					templateOwner: 'appwrite',
					templateRepository: 'templates',
					templateRootDirectory: 'node/starter',
					gitReferenceType: 'branch',
					gitReference: 'main',
				},
			},
			{
				name: 'Cancel Deployment',
				op: 'function.cancelDeployment',
				set: { functionId: FN, deploymentId: ref('Fn: Template Deployment') },
			},
			{
				name: 'VCS Deployment (no repository)',
				op: 'function.createVcsDeployment',
				set: { functionId: FN, gitReferenceType: 'branch', gitReference: 'main' },
			},
			{
				name: 'Download Deployment',
				op: 'function.downloadDeployment',
				set: { functionId: FN, deploymentId: ref('Fn: Create Deployment') },
			},
			{
				name: 'Delete Deployment',
				op: 'function.deleteDeployment',
				set: { functionId: FN, deploymentId: ref('Fn: Duplicate Deployment') },
			},
			{
				name: 'Delete Variable',
				op: 'function.deleteVariable',
				set: { functionId: FN, variableId: ref('Fn: Create Variable') },
			},
			{ name: 'Delete Function', op: 'function.delete', set: { functionId: FN } },
		],
	},
	{
		key: 'Site',
		title: 'Sites: deployments, variables, logs',
		steps: [
			{ name: 'Get Many Frameworks', op: 'site.getManyFrameworks' },
			{ name: 'Get Many Specifications', op: 'site.getManySpecifications' },
			{
				name: 'Create Site',
				op: 'site.create',
				set: {
					siteId: SITE,
					name: 'Live Test Site',
					siteFramework: 'other',
					buildRuntime: 'node-22',
					options: { siteAdapter: 'static', outputDirectory: './' },
				},
			},
			{ name: 'Get Site', op: 'site.get', set: { siteId: SITE } },
			{ name: 'Get Many Sites', op: 'site.getMany', set: { limit: 5 } },
			{
				name: 'Update Site',
				op: 'site.update',
				set: { siteId: SITE, name: 'Live Test Site (renamed)', options: { timeout: 30 } },
			},
			{
				name: 'Create Variable',
				op: 'site.createVariable',
				set: { siteId: SITE, key: 'GREETING', value: 'hello', secret: false },
			},
			{
				name: 'Get Variable',
				op: 'site.getVariable',
				set: { siteId: SITE, variableId: ref('Site: Create Variable') },
			},
			{ name: 'Get Many Variables', op: 'site.getManyVariables', set: { siteId: SITE } },
			{
				name: 'Update Variable',
				op: 'site.updateVariable',
				set: { siteId: SITE, variableId: ref('Site: Create Variable'), value: 'hi there' },
			},
			...file('Site Files', SITE_B64, 'site.tar.gz', 'application/gzip'),
			{
				name: 'Create Deployment',
				op: 'site.createDeployment',
				set: {
					siteId: SITE,
					inputBinaryField: 'data',
					activate: true,
					options: { outputDirectory: './' },
				},
			},
			{ name: 'Wait For Build', wait: 45 },
			{
				name: 'Get Deployment',
				op: 'site.getDeployment',
				set: { siteId: SITE, deploymentId: ref('Site: Create Deployment') },
			},
			{ name: 'Get Many Deployments', op: 'site.getManyDeployments', set: { siteId: SITE } },
			{
				name: 'Activate Deployment',
				op: 'site.activateDeployment',
				set: { siteId: SITE, deploymentId: ref('Site: Create Deployment') },
			},
			{
				name: 'Duplicate Deployment',
				op: 'site.createDuplicateDeployment',
				set: { siteId: SITE, deploymentId: ref('Site: Create Deployment') },
			},
			{
				name: 'Template Deployment',
				op: 'site.createTemplateDeployment',
				set: {
					siteId: SITE,
					templateOwner: 'appwrite',
					templateRepository: 'templates-for-sites',
					templateRootDirectory: 'vite/starter',
					gitReferenceType: 'branch',
					gitReference: 'main',
				},
			},
			{
				name: 'Cancel Deployment',
				op: 'site.cancelDeployment',
				set: { siteId: SITE, deploymentId: ref('Site: Template Deployment') },
			},
			{
				name: 'VCS Deployment (no repository)',
				op: 'site.createVcsDeployment',
				set: { siteId: SITE, gitReferenceType: 'branch', gitReference: 'main' },
			},
			{
				name: 'Download Deployment',
				op: 'site.downloadDeployment',
				set: { siteId: SITE, deploymentId: ref('Site: Create Deployment') },
			},
			{ name: 'Get Many Logs', op: 'site.getManyLogs', set: { siteId: SITE } },
			{
				name: 'Get Log (unknown ID)',
				op: 'site.getLog',
				set: { siteId: SITE, logId: 'no-such-log' },
			},
			{
				name: 'Delete Log (unknown ID)',
				op: 'site.deleteLog',
				set: { siteId: SITE, logId: 'no-such-log' },
			},
			{
				name: 'Delete Deployment',
				op: 'site.deleteDeployment',
				set: { siteId: SITE, deploymentId: ref('Site: Duplicate Deployment') },
			},
			{
				name: 'Delete Variable',
				op: 'site.deleteVariable',
				set: { siteId: SITE, variableId: ref('Site: Create Variable') },
			},
			{ name: 'Delete Site', op: 'site.delete', set: { siteId: SITE } },
		],
	},
];
