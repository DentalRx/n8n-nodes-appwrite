import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export type AppwriteContext = IExecuteFunctions | ILoadOptionsFunctions;

/** Appwrite accepts files up to 5 MB in a single request; larger ones are chunked. */
const CHUNK_SIZE = 5 * 1024 * 1024;

interface AppwriteRequestOptions {
	/** Query string parameters. Arrays are indexed (`queries[0]`) as Appwrite expects. */
	qs?: IDataObject;
	/** JSON request body. Keys with an `undefined` value are dropped. */
	body?: IDataObject;
	/** Extra headers to merge into the request. */
	headers?: IDataObject;
}

/**
 * Resolve the API base URL from the credentials, without its trailing slash.
 */
async function getBaseUrl(this: AppwriteContext): Promise<string> {
	const credentials = await this.getCredentials('appwriteApi');
	return (credentials.endpoint as string).replace(/\/+$/, '');
}

/**
 * Flatten a parameter object into the bracketed keys Appwrite expects, so that
 * `{ queries: ['a', 'b'] }` becomes `{ 'queries[0]': 'a', 'queries[1]': 'b' }`.
 * Values that are `undefined` are dropped.
 */
export function flattenQueryParameters(data: IDataObject, prefix = ''): IDataObject {
	const output: IDataObject = {};

	for (const [key, value] of Object.entries(data)) {
		if (value === undefined) continue;
		const finalKey = prefix ? `${prefix}[${key}]` : key;

		if (Array.isArray(value)) {
			Object.assign(output, flattenQueryParameters({ ...value } as IDataObject, finalKey));
		} else if (value !== null && typeof value === 'object') {
			Object.assign(output, flattenQueryParameters(value as IDataObject, finalKey));
		} else {
			output[finalKey] = value;
		}
	}

	return output;
}

/**
 * Drop keys whose value is `undefined` so optional parameters are omitted from
 * the request body rather than sent as null.
 */
function compact(body: IDataObject): IDataObject {
	const output: IDataObject = {};
	for (const [key, value] of Object.entries(body)) {
		if (value !== undefined) output[key] = value;
	}
	return output;
}

/**
 * Turn an Appwrite error response into an n8n error, keeping the human-readable
 * message in the title and the rest of the payload in the details.
 */
function toNodeApiError(context: AppwriteContext, error: unknown, itemIndex?: number): never {
	const candidate = error as {
		message?: string;
		error?: { message?: string; code?: number; type?: string };
		response?: { body?: { message?: string; code?: number; type?: string } };
		cause?: { error?: { message?: string; code?: number; type?: string } };
		httpCode?: string | number;
	};

	const payload =
		candidate.response?.body ?? candidate.cause?.error ?? candidate.error ?? (error as JsonObject);

	throw new NodeApiError(context.getNode(), payload as JsonObject, {
		message: (payload as { message?: string })?.message ?? candidate.message,
		itemIndex,
	});
}

/**
 * Make an authenticated request against the Appwrite REST API.
 *
 * The node talks to Appwrite over HTTP through n8n's request helpers rather
 * than through the Appwrite SDK, because n8n community nodes must ship without
 * runtime dependencies.
 */
async function request(
	context: AppwriteContext,
	method: IHttpRequestMethods,
	path: string,
	options: AppwriteRequestOptions,
	binary: boolean,
	itemIndex?: number,
): Promise<unknown> {
	const baseUrl = await getBaseUrl.call(context);

	const requestOptions: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		headers: {
			'content-type': 'application/json',
			...(options.headers ?? {}),
		},
		json: true,
	};

	if (options.qs !== undefined) {
		requestOptions.qs = flattenQueryParameters(options.qs);
	}

	if (options.body !== undefined && method !== 'GET') {
		requestOptions.body = compact(options.body);
	}

	if (binary) {
		requestOptions.encoding = 'arraybuffer';
		requestOptions.json = false;
	}

	try {
		return await context.helpers.httpRequestWithAuthentication.call(
			context,
			'appwriteApi',
			requestOptions,
		);
	} catch (error) {
		toNodeApiError(context, error, itemIndex);
	}
}

/**
 * Make an authenticated request that returns a JSON object.
 */
export async function appwriteApiRequest(
	this: AppwriteContext,
	method: IHttpRequestMethods,
	path: string,
	options: AppwriteRequestOptions = {},
	itemIndex?: number,
): Promise<IDataObject> {
	return (await request(this, method, path, options, false, itemIndex)) as IDataObject;
}

/**
 * Make an authenticated request that returns the raw response body, for the
 * endpoints that serve files and images.
 */
export async function appwriteApiRequestBinary(
	this: AppwriteContext,
	method: IHttpRequestMethods,
	path: string,
	options: AppwriteRequestOptions = {},
	itemIndex?: number,
): Promise<Buffer> {
	return (await request(this, method, path, options, true, itemIndex)) as Buffer;
}

/**
 * Build a `multipart/form-data` body by hand. n8n community nodes can't depend
 * on a form-data library, and Appwrite's upload endpoint needs precise control
 * over the file part and its filename.
 */
function buildMultipartBody(
	boundary: string,
	fields: Array<[string, string]>,
	file: { field: string; filename: string; content: Buffer; contentType: string },
): Buffer {
	const parts: Buffer[] = [];

	for (const [name, value] of fields) {
		parts.push(
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
			),
		);
	}

	parts.push(
		Buffer.from(
			`--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\n` +
				`Content-Type: ${file.contentType}\r\n\r\n`,
		),
		file.content,
		Buffer.from('\r\n'),
	);

	parts.push(Buffer.from(`--${boundary}--\r\n`));

	return Buffer.concat(parts);
}

/**
 * Upload a file to Appwrite, splitting it into 5 MB chunks when needed. Every
 * chunk after the first carries the ID Appwrite assigned to the upload.
 */
export async function appwriteFileUpload(
	this: IExecuteFunctions,
	path: string,
	file: { content: Buffer; filename: string; contentType: string },
	fields: Array<[string, string]>,
	itemIndex: number,
): Promise<IDataObject> {
	const baseUrl = await getBaseUrl.call(this);
	const url = `${baseUrl}${path}`;
	const total = file.content.length;

	let response: IDataObject | undefined;
	let uploadId: string | undefined;

	for (let start = 0; start < total || total === 0; start += CHUNK_SIZE) {
		const end = Math.min(start + CHUNK_SIZE, total);
		const boundary = `----n8nAppwriteBoundary${uniqueBoundarySuffix()}`;

		const headers: IDataObject = {
			'content-type': `multipart/form-data; boundary=${boundary}`,
		};

		if (total > CHUNK_SIZE) {
			headers['content-range'] = `bytes ${start}-${end - 1}/${total}`;
			if (uploadId !== undefined) headers['x-appwrite-id'] = uploadId;
		}

		const body = buildMultipartBody(boundary, fields, {
			field: 'file',
			filename: file.filename,
			content: file.content.subarray(start, end),
			contentType: file.contentType,
		});

		try {
			response = (await this.helpers.httpRequestWithAuthentication.call(this, 'appwriteApi', {
				method: 'POST',
				url,
				headers,
				body,
				json: false,
				returnFullResponse: false,
			})) as IDataObject;
		} catch (error) {
			toNodeApiError(this, error, itemIndex);
		}

		if (typeof response === 'string') {
			response = JSON.parse(response) as IDataObject;
		}

		uploadId = (response?.$id as string | undefined) ?? uploadId;

		if (total === 0) break;
	}

	return response as IDataObject;
}

let boundaryCounter = 0;

/** A per-request boundary suffix that can never collide within one execution. */
function uniqueBoundarySuffix(): string {
	boundaryCounter += 1;
	return `${boundaryCounter}${Math.floor(Math.random() * 1e9).toString(16)}`;
}
