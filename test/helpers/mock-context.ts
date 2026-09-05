import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { Appwrite } from '../../nodes/Appwrite/Appwrite.node';

/**
 * The credential every mocked request resolves. The trailing slash on the
 * endpoint checks that the transport normalises it away.
 */
export const CREDENTIALS: IDataObject = {
	endpoint: 'https://cloud.appwrite.io/v1/',
	projectId: 'test-project',
	apiKey: 'test-api-key',
};

/** The endpoint above, as every request URL must start with it. */
export const BASE_URL = 'https://cloud.appwrite.io/v1';

export const node = new Appwrite();

export const description: INodeTypeDescription = node.description;

export const testNode: INode = {
	id: 'test-node',
	name: 'Appwrite',
	type: 'n8n-nodes-appwrite.appwrite',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/** Produces the response for one mocked HTTP request. */
export type Responder = (request: IHttpRequestOptions, index: number) => unknown;

/**
 * Resolve the parameters n8n stores for a node configured with `values`: the
 * default of every displayed property is filled in and hidden properties are
 * dropped, exactly as the workflow loader does before execution.
 */
export function resolveParameters(values: INodeParameters): INodeParameters {
	return (
		NodeHelpers.getNodeParameters(
			description.properties,
			values,
			true,
			false,
			testNode,
			description,
		) ?? {}
	);
}

function getByPath(source: unknown, path: string): unknown {
	let current: unknown = source;
	for (const segment of path.split('.')) {
		if (current === null || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

export interface BinaryFixture {
	buffer: Buffer;
	mimeType?: string;
	fileName?: string;
}

export interface ExecuteContextOptions {
	/** Raw node parameters, as the editor would store them. */
	parameters: INodeParameters;
	respond?: Responder;
	items?: INodeExecutionData[];
	continueOnFail?: boolean;
	/** Binary properties available on every input item, keyed by property name. */
	binary?: Record<string, BinaryFixture>;
}

export interface ExecuteContext {
	context: IExecuteFunctions;
	/** Every request the node handed to n8n's HTTP helper, in order. */
	requests: IHttpRequestOptions[];
}

/**
 * A minimal IExecuteFunctions that behaves like n8n for everything this node
 * touches: parameters resolve through n8n's own display logic (so reading a
 * parameter that is not shown for the selected operation fails, as it does at
 * runtime), and HTTP requests are recorded and answered by `respond`.
 */
export function createExecuteContext(options: ExecuteContextOptions): ExecuteContext {
	const resolved = resolveParameters(options.parameters);
	const requests: IHttpRequestOptions[] = [];
	const respond: Responder = options.respond ?? (() => ({}));
	const items = options.items ?? [{ json: {} }];
	const binary = options.binary ?? {};

	const binaryFixture = (propertyName: string): BinaryFixture => {
		const fixture = binary[propertyName];
		if (fixture === undefined) {
			throw new Error(`This operation expects binary data in the "${propertyName}" property`);
		}
		return fixture;
	};

	const context = {
		getNode: () => testNode,
		getInputData: () => items,
		continueOnFail: () => options.continueOnFail ?? false,
		getCredentials: async () => ({ ...CREDENTIALS }),
		getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) => {
			const value = getByPath(resolved, name);
			if (value !== undefined) return value;
			if (fallback !== undefined) return fallback;
			throw new Error(`Could not get parameter "${name}"`);
		},
		helpers: {
			httpRequestWithAuthentication: async (
				_credentialType: string,
				request: IHttpRequestOptions,
			) => {
				requests.push(request);
				return await respond(request, requests.length - 1);
			},
			prepareBinaryData: async (
				buffer: Buffer,
				fileName?: string,
				mimeType?: string,
			): Promise<IBinaryData> => ({
				data: buffer.toString('base64'),
				fileName,
				mimeType: mimeType ?? 'application/octet-stream',
			}),
			assertBinaryData: (_itemIndex: number, propertyName: string): IBinaryData => {
				const fixture = binaryFixture(propertyName);
				return {
					data: '',
					mimeType: fixture.mimeType ?? 'application/octet-stream',
					fileName: fixture.fileName,
				};
			},
			getBinaryDataBuffer: async (_itemIndex: number, propertyName: string) =>
				binaryFixture(propertyName).buffer,
		},
	};

	return { context: context as unknown as IExecuteFunctions, requests };
}

export interface LoadOptionsContextOptions {
	/** Values of the sibling parameters a dependent picker reads. */
	current?: INodeParameters;
	respond?: Responder;
}

export interface LoadOptionsContext {
	context: ILoadOptionsFunctions;
	requests: IHttpRequestOptions[];
}

export function createLoadOptionsContext(
	options: LoadOptionsContextOptions = {},
): LoadOptionsContext {
	const requests: IHttpRequestOptions[] = [];
	const respond: Responder = options.respond ?? (() => ({}));
	const current = options.current ?? {};

	const context = {
		getNode: () => testNode,
		getCredentials: async () => ({ ...CREDENTIALS }),
		getCurrentNodeParameter: (name: string) => current[name],
		helpers: {
			httpRequestWithAuthentication: async (
				_credentialType: string,
				request: IHttpRequestOptions,
			) => {
				requests.push(request);
				return await respond(request, requests.length - 1);
			},
		},
	};

	return { context: context as unknown as ILoadOptionsFunctions, requests };
}
