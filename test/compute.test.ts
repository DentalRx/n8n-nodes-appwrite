import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import type { BinaryFixture, Responder } from './helpers/mock-context';
import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

/**
 * The Function and Site resources: the read-modify-write behind their Update
 * operations, and the deployment, variable, log and specification requests
 * they share.
 */

const GZIP = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x01, 0x02]);

async function run(
	parameters: INodeParameters,
	respond?: Responder,
	binary?: Record<string, BinaryFixture>,
) {
	const { context, requests } = createExecuteContext({ parameters, respond, binary });
	const [output] = await node.execute.call(context);
	return { output, requests };
}

const parse = (query: unknown) => JSON.parse(query as string) as { method: string };

/** A connected, fully configured site as Appwrite returns it. */
const SITE: IDataObject = {
	$id: 'shop',
	name: 'Shop',
	framework: 'nextjs',
	enabled: false,
	live: true,
	logging: true,
	timeout: 20,
	installCommand: 'npm ci',
	buildCommand: 'npm run build',
	startCommand: '',
	outputDirectory: './.next',
	buildRuntime: 'node-22',
	adapter: 'ssr',
	fallbackFile: null,
	installationId: 'installation-1',
	providerRepositoryId: 'repository-1',
	providerBranch: 'main',
	providerSilentMode: true,
	providerRootDirectory: 'web',
	providerBranches: ['main', 'release/*'],
	providerPaths: [],
	buildSpecification: 's-1vcpu-1gb',
	runtimeSpecification: 's-2vcpu-2gb',
	deploymentRetention: 7,
	scopes: ['users.read'],
	deploymentId: 'deployment-1',
	vars: [],
};

/** A connected, fully configured function as Appwrite returns it. */
const FUNCTION: IDataObject = {
	$id: 'mailer',
	name: 'Mailer',
	runtime: 'node-22',
	execute: ['users'],
	events: ['users.*.create'],
	schedule: '0 * * * *',
	timeout: 30,
	enabled: true,
	logging: false,
	entrypoint: 'src/main.js',
	commands: 'npm install',
	scopes: ['users.read'],
	installationId: 'installation-1',
	providerRepositoryId: 'repository-1',
	providerBranch: 'main',
	providerBranches: [],
	providerPaths: ['functions/mailer/**'],
	providerSilentMode: false,
	providerRootDirectory: 'functions/mailer',
	runtimeSpecification: 's-1vcpu-512mb',
	buildSpecification: 's-1vcpu-1gb',
	deploymentRetention: 0,
};

/** Answers the read of an update with `current` and the write with an echo. */
const readThenWrite =
	(current: IDataObject): Responder =>
	(request) =>
		request.method === 'GET' ? current : { $id: current.$id };

describe('Site → Update', () => {
	it('reads the site first and resends every setting a rename leaves unchanged', async () => {
		const { requests } = await run(
			{ resource: 'site', operation: 'update', siteId: 'shop', name: 'Storefront' },
			readThenWrite(SITE),
		);

		expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
			`GET ${BASE_URL}/sites/shop`,
			`PUT ${BASE_URL}/sites/shop`,
		]);
		// PUT replaces the whole configuration, so anything missing here would
		// be reset: the repository link, the commands, the rendering, the sizes.
		// The empty start command and null fallback file are left out, which
		// Appwrite treats exactly like sending them empty.
		expect(requests[1].body).toEqual({
			name: 'Storefront',
			framework: 'nextjs',
			buildRuntime: 'node-22',
			enabled: false,
			logging: true,
			timeout: 20,
			installCommand: 'npm ci',
			buildCommand: 'npm run build',
			outputDirectory: './.next',
			adapter: 'ssr',
			scopes: ['users.read'],
			installationId: 'installation-1',
			providerRepositoryId: 'repository-1',
			providerBranch: 'main',
			providerBranches: ['main', 'release/*'],
			providerPaths: [],
			providerSilentMode: true,
			providerRootDirectory: 'web',
			runtimeSpecification: 's-2vcpu-2gb',
			buildSpecification: 's-1vcpu-1gb',
			deploymentRetention: 7,
		});
	});

	it('applies the options that were added and clears a text option left blank', async () => {
		const { requests } = await run(
			{
				resource: 'site',
				operation: 'update',
				siteId: 'shop',
				name: 'Shop',
				options: {
					siteFramework: 'astro',
					buildRuntime: 'node-20.0',
					siteAdapter: 'static',
					enabled: true,
					buildCommand: '',
					fallbackFile: 'index.html',
					scopes: 'databases.read, users.read',
					timeout: 15,
				},
			},
			readThenWrite(SITE),
		);

		expect(requests[1].body).toMatchObject({
			framework: 'astro',
			buildRuntime: 'node-20.0',
			adapter: 'static',
			enabled: true,
			buildCommand: '',
			fallbackFile: 'index.html',
			scopes: ['databases.read', 'users.read'],
			timeout: 15,
			installCommand: 'npm ci',
			providerRepositoryId: 'repository-1',
		});
	});

	it('keeps the framework and runtime when their options are added but left empty', async () => {
		const { requests } = await run(
			{
				resource: 'site',
				operation: 'update',
				siteId: 'shop',
				name: 'Shop',
				options: { siteFramework: '', buildRuntime: '' },
			},
			readThenWrite(SITE),
		);
		expect(requests[1].body).toMatchObject({ framework: 'nextjs', buildRuntime: 'node-22' });
	});

	it('leaves out an empty rendering and runtime, which Appwrite would reject', async () => {
		const { requests } = await run(
			{ resource: 'site', operation: 'update', siteId: 'shop', name: 'Shop' },
			readThenWrite({ ...SITE, adapter: '', buildRuntime: '', providerRepositoryId: '' }),
		);
		expect(requests[1].body).not.toHaveProperty('adapter');
		expect(requests[1].body).not.toHaveProperty('buildRuntime');
		expect(requests[1].body).not.toHaveProperty('providerRepositoryId');
	});
});

describe('Site → Create', () => {
	it('sends the framework, runtime and only the options that were added', async () => {
		const { requests } = await run(
			{
				resource: 'site',
				operation: 'create',
				siteId: 'shop',
				name: 'Shop',
				siteFramework: 'nextjs',
				buildRuntime: 'node-22',
				options: { siteAdapter: 'ssr', fallbackFile: 'index.html', scopes: '["users.read"]' },
			},
			() => ({ $id: 'shop' }),
		);

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/sites`);
		expect(requests[0].body).toEqual({
			siteId: 'shop',
			name: 'Shop',
			framework: 'nextjs',
			buildRuntime: 'node-22',
			adapter: 'ssr',
			fallbackFile: 'index.html',
			scopes: ['users.read'],
		});
	});
});

describe('Function → Update', () => {
	it('reads the function first and resends every setting a rename leaves unchanged', async () => {
		const { requests } = await run(
			{ resource: 'function', operation: 'update', functionId: 'mailer', name: 'Mail Sender' },
			readThenWrite(FUNCTION),
		);

		expect(requests.map((request) => request.method)).toEqual(['GET', 'PUT']);
		expect(requests[1].url).toBe(`${BASE_URL}/functions/mailer`);
		const { $id, ...settings } = FUNCTION;
		expect($id).toBe('mailer');
		expect(requests[1].body).toEqual({ ...settings, name: 'Mail Sender' });
	});

	it('applies the options that were added and clears a list option left blank', async () => {
		const { requests } = await run(
			{
				resource: 'function',
				operation: 'update',
				functionId: 'mailer',
				name: 'Mailer',
				options: { runtime: 'python-3.12', events: '', timeout: 60 },
			},
			readThenWrite(FUNCTION),
		);
		expect(requests[1].body).toMatchObject({
			runtime: 'python-3.12',
			events: [],
			timeout: 60,
			schedule: '0 * * * *',
			providerRepositoryId: 'repository-1',
		});
	});
});

describe('Create Deployment', () => {
	const deployed: Responder = () => JSON.stringify({ $id: 'deployment-2', status: 'waiting' });

	it('uploads the package as the code field with the activation flag and the options set', async () => {
		const { output, requests } = await run(
			{
				resource: 'function',
				operation: 'createDeployment',
				functionId: 'mailer',
				inputBinaryField: 'package',
				activate: true,
				options: { entrypoint: 'src/main.js', commands: '' },
			},
			deployed,
			{ package: { buffer: GZIP, fileName: 'main', mimeType: 'application/octet-stream' } },
		);

		expect(output.map((item) => item.json)).toEqual([{ $id: 'deployment-2', status: 'waiting' }]);
		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/functions/mailer/deployments`);
		const body = (requests[0].body as Buffer).toString('latin1');
		expect(body).toContain('name="activate"\r\n\r\ntrue\r\n');
		expect(body).toContain('name="entrypoint"\r\n\r\nsrc/main.js\r\n');
		// A blank option leaves the setting to the function.
		expect(body).not.toContain('name="commands"');
		// Appwrite accepts the package by a .gz name only, whatever the input was called.
		expect(body).toContain(
			'name="code"; filename="code.tar.gz"\r\nContent-Type: application/gzip\r\n\r\n',
		);
	});

	it("sends a site's build settings as form fields", async () => {
		const { requests } = await run(
			{
				resource: 'site',
				operation: 'createDeployment',
				siteId: 'shop',
				options: {
					installCommand: 'npm ci',
					buildCommand: 'npm run build',
					outputDirectory: 'out',
				},
			},
			deployed,
			{ data: { buffer: GZIP } },
		);

		expect(requests[0].url).toBe(`${BASE_URL}/sites/shop/deployments`);
		const body = (requests[0].body as Buffer).toString('latin1');
		expect(body).toContain('name="activate"\r\n\r\nfalse\r\n');
		expect(body).toContain('name="installCommand"\r\n\r\nnpm ci\r\n');
		expect(body).toContain('name="buildCommand"\r\n\r\nnpm run build\r\n');
		expect(body).toContain('name="outputDirectory"\r\n\r\nout\r\n');
	});

	it('stops before uploading anything that is not gzip-compressed', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'site', operation: 'createDeployment', siteId: 'shop' },
			binary: { data: { buffer: Buffer.from('PK\u0003\u0004 a zip archive') } },
		});

		const failure = await node.execute.call(context).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(NodeOperationError);
		expect((failure as Error).message).toMatch(/not a gzip-compressed archive/);
		expect(requests).toHaveLength(0);
	});
});

describe('deployments', () => {
	it('downloads the chosen content as a named .tar.gz file', async () => {
		const { output, requests } = await run(
			{
				resource: 'site',
				operation: 'downloadDeployment',
				siteId: 'shop',
				deploymentId: 'deployment-1',
				options: { deploymentContent: 'output' },
			},
			() => GZIP,
		);

		expect(requests[0].url).toBe(`${BASE_URL}/sites/shop/deployments/deployment-1/download`);
		expect(requests[0].qs).toEqual({ type: 'output' });
		expect(requests[0].encoding).toBe('arraybuffer');
		expect(output[0].json).toEqual({
			siteId: 'shop',
			deploymentId: 'deployment-1',
			type: 'output',
		});
		expect(output[0].binary?.data).toMatchObject({
			fileName: 'deployment-1-output.tar.gz',
			mimeType: 'application/gzip',
		});
	});

	it('downloads the source by default and gives a file that is not gzip no extension', async () => {
		const { output, requests } = await run(
			{
				resource: 'function',
				operation: 'downloadDeployment',
				functionId: 'mailer',
				deploymentId: 'deployment-1',
			},
			() => Buffer.from('plain tar'),
		);

		expect(requests[0].qs).toEqual({ type: 'source' });
		expect(output[0].binary?.data).toMatchObject({
			fileName: 'deployment-1-source',
			mimeType: 'application/octet-stream',
		});
	});

	it('creates template and VCS deployments from a Git reference', async () => {
		const template = await run({
			resource: 'function',
			operation: 'createTemplateDeployment',
			functionId: 'mailer',
			templateOwner: 'appwrite',
			templateRepository: 'templates',
			templateRootDirectory: 'node/starter',
			gitReferenceType: 'tag',
			gitReference: '0.4.0',
			activate: true,
		});
		expect(template.requests[0].url).toBe(`${BASE_URL}/functions/mailer/deployments/template`);
		expect(template.requests[0].body).toEqual({
			owner: 'appwrite',
			repository: 'templates',
			rootDirectory: 'node/starter',
			type: 'tag',
			reference: '0.4.0',
			activate: true,
		});

		const vcs = await run({
			resource: 'site',
			operation: 'createVcsDeployment',
			siteId: 'shop',
			gitReferenceType: 'commit',
			gitReference: 'a1b2c3d',
		});
		expect(vcs.requests[0].url).toBe(`${BASE_URL}/sites/shop/deployments/vcs`);
		expect(vcs.requests[0].body).toEqual({ type: 'commit', reference: 'a1b2c3d', activate: false });
	});

	it('activates, cancels, rebuilds and deletes deployments at their own paths', async () => {
		const target = { resource: 'site', siteId: 'shop', deploymentId: 'deployment-1' };

		const activated = await run({ ...target, operation: 'activateDeployment' });
		expect(activated.requests[0].method).toBe('PATCH');
		expect(activated.requests[0].url).toBe(`${BASE_URL}/sites/shop/deployment`);
		expect(activated.requests[0].body).toEqual({ deploymentId: 'deployment-1' });

		const canceled = await run({ ...target, operation: 'cancelDeployment' });
		expect(canceled.requests[0].method).toBe('PATCH');
		expect(canceled.requests[0].url).toBe(`${BASE_URL}/sites/shop/deployments/deployment-1/status`);
		expect(canceled.requests[0].body).toBeUndefined();

		const rebuilt = await run({ ...target, operation: 'createDuplicateDeployment' });
		expect(rebuilt.requests[0].url).toBe(`${BASE_URL}/sites/shop/deployments/duplicate`);
		expect(rebuilt.requests[0].body).toEqual({ deploymentId: 'deployment-1' });

		const deleted = await run({ ...target, operation: 'deleteDeployment' });
		expect(deleted.requests[0].method).toBe('DELETE');
		expect(deleted.output[0].json).toEqual({
			deleted: true,
			siteId: 'shop',
			deploymentId: 'deployment-1',
		});
	});

	it('simplifies deployments down to the fields workflows read', async () => {
		const { output } = await run(
			{
				resource: 'function',
				operation: 'getDeployment',
				functionId: 'mailer',
				deploymentId: 'deployment-1',
				simplify: true,
			},
			() => ({ $id: 'deployment-1', status: 'ready', buildLogs: 'a very long log' }),
		);
		expect(output[0].json).toEqual({ $id: 'deployment-1', status: 'ready' });
	});
});

describe('variables, logs and specifications', () => {
	it('asks for the Limit when listing variables, as Appwrite otherwise returns 25', async () => {
		const { output, requests } = await run(
			{ resource: 'site', operation: 'getManyVariables', siteId: 'shop' },
			() => ({ total: 1, variables: [{ $id: 'v1', key: 'API_URL' }] }),
		);
		expect(requests[0].url).toBe(`${BASE_URL}/sites/shop/variables`);
		expect(parse((requests[0].qs as IDataObject)['queries[0]'])).toEqual({
			method: 'limit',
			values: [50],
		});
		expect(output.map((item) => item.json)).toEqual([{ $id: 'v1', key: 'API_URL' }]);
	});

	it('returns all variables once from an Appwrite that ignores the paging queries', async () => {
		// Appwrite before 1.9 answers every page with the whole list.
		const variables = Array.from({ length: 120 }, (_, index) => ({ $id: `v${index}` }));
		const { output, requests } = await run(
			{
				resource: 'function',
				operation: 'getManyVariables',
				functionId: 'mailer',
				returnAll: true,
			},
			() => ({ total: 120, variables }),
		);
		expect(requests).toHaveLength(2);
		expect(output).toHaveLength(120);
	});

	it('reads site logs from the executions list and simplifies them', async () => {
		const { output, requests } = await run(
			{ resource: 'site', operation: 'getManyLogs', siteId: 'shop', simplify: true },
			() => ({
				total: 1,
				executions: [{ $id: 'log-1', requestPath: '/', responseStatusCode: 200, logs: 'x' }],
			}),
		);
		expect(requests[0].url).toBe(`${BASE_URL}/sites/shop/logs`);
		expect(output.map((item) => item.json)).toEqual([
			{ $id: 'log-1', requestPath: '/', responseStatusCode: 200 },
		]);
	});

	it('deletes a site log and reports what was deleted', async () => {
		const { output, requests } = await run({
			resource: 'site',
			operation: 'deleteLog',
			siteId: 'shop',
			logId: 'log-1',
		});
		expect(requests[0].method).toBe('DELETE');
		expect(requests[0].url).toBe(`${BASE_URL}/sites/shop/logs/log-1`);
		expect(output[0].json).toEqual({ deleted: true, siteId: 'shop', logId: 'log-1' });
	});

	it('lists the specifications of the chosen type', async () => {
		const builds = await run(
			{
				resource: 'function',
				operation: 'getManySpecifications',
				options: { specificationType: 'builds' },
			},
			() => ({ total: 1, specifications: [{ slug: 's-1vcpu-512mb', cpus: 1, memory: 512 }] }),
		);
		expect(builds.requests[0].url).toBe(`${BASE_URL}/functions/specifications`);
		expect(builds.requests[0].qs).toEqual({ type: 'builds' });
		expect(builds.output[0].json).toEqual({ slug: 's-1vcpu-512mb', cpus: 1, memory: 512 });

		const runtimes = await run({ resource: 'site', operation: 'getManySpecifications' });
		expect(runtimes.requests[0].url).toBe(`${BASE_URL}/sites/specifications`);
		expect(runtimes.requests[0].qs).toEqual({});
	});
});
