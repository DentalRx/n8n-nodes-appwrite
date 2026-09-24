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
import { NodeHelpers, NodeOperationError } from 'n8n-workflow';

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

/** The Appwrite Organization API credential, for the organization-level resources. */
export const ORGANIZATION_CREDENTIALS: IDataObject = {
	endpoint: 'https://cloud.appwrite.io/v1/',
	organizationId: 'test-organization',
	apiKey: 'organization_test-key',
};

const CREDENTIALS_BY_TYPE: Record<string, IDataObject> = {
	appwriteApi: CREDENTIALS,
	appwriteOrganizationApi: ORGANIZATION_CREDENTIALS,
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

/**
 * Resolve a resource locator value the way n8n's `extractValue` option does:
 * By URL mode runs the mode's extraction regex (and fails when it does not
 * match), every other mode yields the bare value.
 */
export function extractLocatorValue(
	name: string,
	value: unknown,
	parameters: INodeParameters,
): unknown {
	if (value === null || typeof value !== 'object' || !('mode' in value) || !('value' in value)) {
		return value;
	}
	const locator = value as { mode: string; value: unknown };
	const property = description.properties.find(
		(candidate) =>
			candidate.name === name &&
			candidate.type === 'resourceLocator' &&
			NodeHelpers.displayParameter(parameters, candidate, testNode, description),
	);
	const mode = property?.modes?.find((candidate) => candidate.name === locator.mode);
	if (mode?.extractValue?.type !== 'regex') return locator.value;
	const match = new RegExp(mode.extractValue.regex).exec(String(locator.value));
	if (match === null) {
		throw new Error(`${property?.displayName ?? name} parameter's value is invalid`);
	}
	return match[1];
}

/**
 * The credential of a type, as n8n hands it over: only when the node declares
 * the type and shows it for the node's parameters (n8n refuses a credential
 * whose displayOptions hide it). A plain Error rather than n8n's
 * NodeOperationError, so that no test can mistake it for a validation message.
 */
function credentialFor(
	type: string,
	parameters: INodeParameters,
	overrides: Record<string, IDataObject> = {},
): IDataObject {
	const declared = description.credentials?.find((credential) => credential.name === type);
	const data = overrides[type] ?? CREDENTIALS_BY_TYPE[type];
	if (
		declared === undefined ||
		data === undefined ||
		!NodeHelpers.displayParameter(parameters, declared, testNode, description)
	) {
		throw new Error(`The node cannot use a "${type}" credential with these parameters`);
	}
	return { ...data };
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
	/** Credential data to use instead of the defaults above, keyed by credential type. */
	credentials?: Record<string, IDataObject>;
	/** The workflow's time zone, UTC by default. */
	timezone?: string;
}

export interface ExecuteContext {
	context: IExecuteFunctions;
	/** Every request the node handed to n8n's HTTP helpers, in order. */
	requests: IHttpRequestOptions[];
	/**
	 * For each entry of `requests`, whether it went through
	 * httpRequestWithAuthentication, which adds the credential's API key,
	 * rather than httpRequest, which sends only the headers the node set.
	 */
	withApiKey: boolean[];
	/**
	 * For each entry of `requests`, the credential type it authenticated with,
	 * or undefined for a request sent without one.
	 */
	credentialTypes: Array<string | undefined>;
	/** The credential types the node read, in order. */
	credentialReads: string[];
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
	const withApiKey: boolean[] = [];
	const credentialTypes: Array<string | undefined> = [];
	const credentialReads: string[] = [];
	const respond: Responder = options.respond ?? (() => ({}));
	const items = options.items ?? [{ json: {} }];
	const binary = options.binary ?? {};

	const send = async (request: IHttpRequestOptions, credentialType?: string): Promise<unknown> => {
		if (credentialType !== undefined) credentialFor(credentialType, resolved, options.credentials);
		requests.push(request);
		withApiKey.push(credentialType !== undefined);
		credentialTypes.push(credentialType);
		return await respond(request, requests.length - 1);
	};

	const binaryFixture = (propertyName: string): BinaryFixture => {
		const fixture = binary[propertyName];
		if (fixture === undefined) {
			// n8n's assertBinaryData reports a missing property as a NodeOperationError.
			throw new NodeOperationError(
				testNode,
				`This operation expects binary data in the "${propertyName}" property`,
			);
		}
		return fixture;
	};

	const context = {
		getNode: () => testNode,
		getTimezone: () => options.timezone ?? 'UTC',
		getInputData: () => items,
		continueOnFail: () => options.continueOnFail ?? false,
		getCredentials: async (type: string) => {
			credentialReads.push(type);
			return credentialFor(type, resolved, options.credentials);
		},
		getNodeParameter: (
			name: string,
			_itemIndex: number,
			fallback?: unknown,
			parameterOptions?: { extractValue?: boolean },
		) => {
			const value = getByPath(resolved, name);
			if (value !== undefined) {
				return parameterOptions?.extractValue ? extractLocatorValue(name, value, resolved) : value;
			}
			if (fallback !== undefined) return fallback;
			throw new Error(`Could not get parameter "${name}"`);
		},
		helpers: {
			httpRequestWithAuthentication: async (credentialType: string, request: IHttpRequestOptions) =>
				await send(request, credentialType),
			httpRequest: async (request: IHttpRequestOptions) => await send(request),
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

	return {
		context: context as unknown as IExecuteFunctions,
		requests,
		withApiKey,
		credentialTypes,
		credentialReads,
	};
}

export interface LoadOptionsContextOptions {
	/** Values of the sibling parameters a dependent picker reads. */
	current?: INodeParameters;
	respond?: Responder;
	/** Credential data to use instead of the defaults above, keyed by credential type. */
	credentials?: Record<string, IDataObject>;
}

export interface LoadOptionsContext {
	context: ILoadOptionsFunctions;
	requests: IHttpRequestOptions[];
	/** Whether each request went out with the API key, in order. */
	withApiKey: boolean[];
	/** For each entry of `requests`, the credential type it authenticated with, if any. */
	credentialTypes: Array<string | undefined>;
}

export function createLoadOptionsContext(
	options: LoadOptionsContextOptions = {},
): LoadOptionsContext {
	const requests: IHttpRequestOptions[] = [];
	const withApiKey: boolean[] = [];
	const credentialTypes: Array<string | undefined> = [];
	const respond: Responder = options.respond ?? (() => ({}));
	const current = options.current ?? {};
	const send = async (request: IHttpRequestOptions, credentialType?: string): Promise<unknown> => {
		requests.push(request);
		withApiKey.push(credentialType !== undefined);
		credentialTypes.push(credentialType);
		return await respond(request, requests.length - 1);
	};

	const context = {
		getNode: () => testNode,
		getCredentials: async (type: string) => credentialFor(type, current, options.credentials),
		getCurrentNodeParameter: (name: string, parameterOptions?: { extractValue?: boolean }) =>
			parameterOptions?.extractValue
				? extractLocatorValue(name, current[name], current)
				: current[name],
		helpers: {
			httpRequestWithAuthentication: async (
				credentialType: string,
				request: IHttpRequestOptions,
			) => {
				credentialFor(credentialType, current, options.credentials);
				return await send(request, credentialType);
			},
			httpRequest: async (request: IHttpRequestOptions) => await send(request),
		},
	};

	return {
		context: context as unknown as ILoadOptionsFunctions,
		requests,
		withApiKey,
		credentialTypes,
	};
}
