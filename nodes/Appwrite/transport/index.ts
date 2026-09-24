import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

export type AppwriteContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * The credential a request authenticates with: a project API key, or an
 * organization API key for the endpoints that act on a whole organization.
 */
export type AppwriteCredentialType = 'appwriteApi' | 'appwriteOrganizationApi';

/** Appwrite accepts files up to 5 MB in a single request; larger ones are chunked. */
const CHUNK_SIZE = 5 * 1024 * 1024;

export interface AppwriteRequestOptions {
	/** Query string parameters. Arrays are indexed (`queries[0]`) as Appwrite expects. */
	qs?: IDataObject;
	/** JSON request body. Keys with an `undefined` value are dropped. */
	body?: IDataObject;
	/** Extra headers to merge into the request. */
	headers?: IDataObject;
	/** The credential that authenticates the request. Defaults to the project's (`appwriteApi`). */
	credentialType?: AppwriteCredentialType;
}

/** The API base URL a credential names, without its trailing slash. */
function endpointOf(credentials: IDataObject): string {
	return (credentials.endpoint as string).replace(/\/+$/, '');
}

/**
 * Resolve the API base URL (without its trailing slash) and the project ID
 * from the credentials.
 */
export async function getProject(
	this: AppwriteContext,
): Promise<{ baseUrl: string; projectId: string; skipSslCertificateValidation: boolean }> {
	const credentials = await this.getCredentials('appwriteApi');
	return {
		baseUrl: endpointOf(credentials),
		projectId: credentials.projectId as string,
		skipSslCertificateValidation: credentials.ignoreSslIssues === true,
	};
}

/**
 * The endpoint to call, and whether the credential allows an endpoint whose
 * TLS certificate cannot be validated (e.g. a self-signed one).
 */
async function getConnection(
	this: AppwriteContext,
	credentialType: AppwriteCredentialType = 'appwriteApi',
): Promise<{ baseUrl: string; skipSslCertificateValidation: boolean }> {
	const credentials = await this.getCredentials(credentialType);
	return {
		baseUrl: endpointOf(credentials),
		skipSslCertificateValidation: credentials.ignoreSslIssues === true,
	};
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
 * The URL of an Appwrite endpoint for the user's browser to open, for the
 * flows that start with a redirect meant for the browser rather than with a
 * request n8n can send. The query string is encoded as the Appwrite SDKs
 * encode it: with URLSearchParams, and array values under bracketed keys.
 */
export function browserUrl(baseUrl: string, path: string, qs: IDataObject): string {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(flattenQueryParameters(qs))) {
		query.append(key, String(value));
	}
	const search = query.toString();
	return search === '' ? `${baseUrl}${path}` : `${baseUrl}${path}?${search}`;
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
	// n8n's request helpers throw pre-wrapped NodeApiErrors, so this branch is
	// the one that handles essentially every real API failure. For a binary
	// request the arraybuffer encoding applies to the error response too:
	// Appwrite's JSON body is stranded on the wrapped error as raw bytes, and
	// must be decoded here or the user only sees n8n's generic status text.
	if (error instanceof NodeApiError) {
		const buffered = (error.context as { data?: unknown } | undefined)?.data;
		const decoded =
			buffered instanceof Buffer || buffered instanceof Uint8Array
				? parseErrorBuffer(Buffer.from(buffered))
				: undefined;
		if (decoded !== undefined) {
			// Building from the decoded payload constructs a fresh error; the
			// constructor's return-existing-instance shortcut only applies when the
			// errorResponse argument is itself a NodeApiError.
			throw new NodeApiError(context.getNode(), decoded, {
				message: (decoded as { message?: string }).message,
				itemIndex,
			});
		}
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
 * Refuse a request path with an empty segment. Every segment after the
 * service name is an ID, so an empty one means an ID field resolved to
 * nothing, typically an expression that found no value. Appwrite's router
 * drops empty segments, so `DELETE .../rows/` would otherwise reach the bulk
 * route `DELETE .../rows` and act on every row in the table.
 */
function assertPathHasNoEmptyId(context: AppwriteContext, path: string, itemIndex?: number): void {
	const pathname = path.split('?')[0];
	if (pathname.includes('//') || (pathname.length > 1 && pathname.endsWith('/'))) {
		throw new NodeOperationError(context.getNode(), 'An ID for this operation is empty', {
			description:
				'One of the ID fields resolved to an empty value, so the request was not sent. Check the IDs and any expressions in them, e.g. {{ $json.$id }} rather than {{ $json.id }}.',
			itemIndex,
		});
	}
}

/**
 * Shape a request the way every Appwrite call is sent: JSON in and out,
 * bracketed query parameters, and a body without undefined keys.
 */
function buildRequestOptions(
	baseUrl: string,
	method: IHttpRequestMethods,
	path: string,
	options: AppwriteRequestOptions,
	binary: boolean,
): IHttpRequestOptions {
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

	return requestOptions;
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
	assertPathHasNoEmptyId(context, path, itemIndex);
	const credentialType = options.credentialType ?? 'appwriteApi';
	const { baseUrl, skipSslCertificateValidation } = await getConnection.call(
		context,
		credentialType,
	);
	const requestOptions = buildRequestOptions(baseUrl, method, path, options, binary);
	if (skipSslCertificateValidation) requestOptions.skipSslCertificateValidation = true;

	try {
		return await context.helpers.httpRequestWithAuthentication.call(
			context,
			credentialType,
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
 * Who an Account request acts as. Appwrite identifies a signed-in user by a
 * JWT or a session secret; a caller with neither is a guest, which is enough
 * for the endpoints whose own parameters prove who is calling, such as
 * completing an email verification with the secret from the email.
 */
export type UserAuthentication =
	{ type: 'jwt'; jwt: string } | { type: 'session'; secret: string } | { type: 'guest' };

function userHeaders(authentication: UserAuthentication): IDataObject {
	if (authentication.type === 'jwt') return { 'X-Appwrite-JWT': authentication.jwt };
	if (authentication.type === 'session') return { 'X-Appwrite-Session': authentication.secret };
	return {};
}

/**
 * Make a request as an end user instead of with the API key, for the Account
 * endpoints that act on the signed-in user. It cannot go through the
 * credential: an API key replaces the user's scopes with the key's own, and no
 * API key can hold the `account` scope those endpoints need. So the request
 * carries the project ID and the user's JWT or session secret, and never the
 * API key; getProject reads the credential so that this function never holds
 * it.
 */
export async function appwriteUserRequest(
	this: AppwriteContext,
	method: IHttpRequestMethods,
	path: string,
	authentication: UserAuthentication,
	options: AppwriteRequestOptions = {},
	itemIndex?: number,
): Promise<IDataObject> {
	assertPathHasNoEmptyId(this, path, itemIndex);
	const { baseUrl, projectId, skipSslCertificateValidation } = await getProject.call(this);
	const requestOptions = buildRequestOptions(baseUrl, method, path, options, false);
	if (skipSslCertificateValidation) requestOptions.skipSslCertificateValidation = true;
	requestOptions.headers = {
		...requestOptions.headers,
		'X-Appwrite-Project': projectId,
		...userHeaders(authentication),
	};

	try {
		return (await this.helpers.httpRequest(requestOptions)) as IDataObject;
	} catch (error) {
		// httpRequestWithAuthentication wraps a failed response in a
		// NodeApiError, httpRequest hands over the HTTP client's own error.
		// Wrapping it the same way surfaces Appwrite's message exactly as it
		// does for API-key requests.
		const wrapped =
			error instanceof NodeApiError ? error : new NodeApiError(this.getNode(), error as JsonObject);
		// n8n titles a 401 "check your credentials", but the credential's API key
		// played no part here: Appwrite refused the user's JWT or session secret.
		if (authentication.type !== 'guest' && String(wrapped.httpCode) === '401') {
			const body = wrapped.context?.data;
			const payload = body !== null && typeof body === 'object' ? (body as JsonObject) : {};
			throw new NodeApiError(this.getNode(), payload, {
				message: "Appwrite did not accept the user's JWT or session secret",
				description: `A JWT expires after 15 minutes, and a session secret stops working when the session ends. Appwrite said: ${wrapped.description ?? wrapped.message}`,
				httpCode: '401',
				itemIndex,
			});
		}
		toNodeApiError(this, wrapped, itemIndex);
	}
}

/**
 * Request a route whose scope is `public`, such as the runtime and framework
 * lists. Appwrite grants an API key only the scopes chosen on it (plus
 * `global`, `health.read` and `graphql`), never `public`, so these go out
 * without the key, identified by the project alone.
 */
export async function appwritePublicRequest(
	this: AppwriteContext,
	method: IHttpRequestMethods,
	path: string,
	options: AppwriteRequestOptions = {},
	itemIndex?: number,
): Promise<IDataObject> {
	return await appwriteUserRequest.call(this, method, path, { type: 'guest' }, options, itemIndex);
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
		// A field value lands in the part's body, where a line break is only
		// content: forging a part would also take guessing the CSPRNG boundary.
		// Values are sent as they are, so multi-line build commands survive.
		parts.push(
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderParameter(
					name,
				)}"\r\n\r\n${value}\r\n`,
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
 *
 * Storage takes the file in the `file` form field; function and site
 * deployments take their code package in `code` with the same chunking, so
 * the field name can be set per upload.
 */
export async function appwriteFileUpload(
	this: IExecuteFunctions,
	path: string,
	file: { content: Buffer; filename: string; contentType: string; field?: string },
	fields: Array<[string, string]>,
	itemIndex: number,
): Promise<IDataObject> {
	assertPathHasNoEmptyId(this, path, itemIndex);
	const { baseUrl, skipSslCertificateValidation } = await getConnection.call(this);
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
			field: file.field ?? 'file',
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
				...(skipSslCertificateValidation ? { skipSslCertificateValidation } : {}),
			})) as IDataObject;
		} catch (error) {
			toNodeApiError(this, error, itemIndex);
		}

		if (typeof response === 'string') {
			try {
				response = JSON.parse(response) as IDataObject;
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					'Appwrite answered the file upload with an unexpected response',
					{
						description:
							'The upload endpoint returned a body that is not JSON. Check the Endpoint URL in the credential points at an Appwrite API (ending in /v1).',
						itemIndex,
					},
				);
			}
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
