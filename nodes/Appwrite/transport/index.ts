import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

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
	// NodeApiError's constructor hands back an existing NodeApiError untouched,
	// so re-wrapping one would silently drop the message and item index we pass.
	if (error instanceof NodeApiError) {
		if (itemIndex !== undefined) error.context.itemIndex = itemIndex;
		throw error;
	}

	const candidate = error as {
		message?: string;
		error?: { message?: string; code?: number; type?: string };
		response?: { body?: { message?: string; code?: number; type?: string } };
		cause?: { error?: { message?: string; code?: number; type?: string } };
		context?: { data?: unknown };
		httpCode?: string | number;
	};

	// A binary request asks for an arraybuffer, which applies to the error
	// response too: Appwrite's JSON body arrives as raw bytes and its message
	// would be lost unless we decode it back.
	const buffered = candidate.context?.data;
	const decoded =
		buffered instanceof Buffer || buffered instanceof Uint8Array
			? parseErrorBuffer(Buffer.from(buffered))
			: undefined;

	const payload =
		decoded ??
		candidate.response?.body ??
		candidate.cause?.error ??
		candidate.error ??
		(error as JsonObject);

	throw new NodeApiError(context.getNode(), payload as JsonObject, {
		message: (payload as { message?: string })?.message ?? candidate.message,
		itemIndex,
	});
}

/** Decode an Appwrite JSON error body that came back as bytes, if it is one. */
function parseErrorBuffer(buffer: Buffer): JsonObject | undefined {
	try {
		const parsed: unknown = JSON.parse(buffer.toString('utf8'));
		if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as JsonObject;
		}
	} catch {
		// Not JSON - fall back to whatever the error itself carried.
	}
	return undefined;
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
function escapeHeaderParameter(value: string): string {
	// A filename or field name reaching this unescaped would let a caller close
	// the quoted string or start a new header line, and so forge multipart
	// headers. Percent-encode the quote and drop anything that ends a line.
	return value.replace(/[\r\n]/g, '').replace(/"/g, '%22');
}

function buildMultipartBody(
	boundary: string,
	fields: Array<[string, string]>,
	file: { field: string; filename: string; content: Buffer; contentType: string },
): Buffer {
	const parts: Buffer[] = [];

	for (const [name, value] of fields) {
		// A field value lands in the part's body, where a CRLF is only content
		// and could not forge a part without also guessing the boundary. Strip
		// it anyway: none of these values (IDs, permission strings) may span
		// lines, so there is nothing to lose and one less thing to reason about.
		parts.push(
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderParameter(
					name,
				)}"\r\n\r\n${value.replace(/[\r\n]/g, '')}\r\n`,
			),
		);
	}

	parts.push(
		Buffer.from(
			`--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderParameter(
				file.field,
			)}"; filename="${escapeHeaderParameter(file.filename)}"\r\n` +
				`Content-Type: ${escapeHeaderParameter(file.contentType)}\r\n\r\n`,
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

/**
 * A boundary suffix drawn from a CSPRNG. A predictable boundary would let
 * someone who controls part of an uploaded file guess it and inject extra
 * multipart parts, which is what made the equivalent form-data flaw critical.
 */
function uniqueBoundarySuffix(): string {
	return randomBytes(16).toString('hex');
}
