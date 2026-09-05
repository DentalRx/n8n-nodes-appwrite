import type { IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	appwriteApiRequest,
	appwriteApiRequestBinary,
	appwriteFileUpload,
	flattenQueryParameters,
} from '../nodes/Appwrite/transport';
import { BASE_URL, createExecuteContext, testNode } from './helpers/mock-context';

const PARAMETERS = { resource: 'database', operation: 'getMany' };

describe('flattenQueryParameters', () => {
	it('indexes arrays and nests objects with bracket keys, dropping undefined values', () => {
		expect(
			flattenQueryParameters({
				queries: ['a', 'b'],
				search: 'x',
				skip: undefined,
				nested: { deep: [1] },
				zero: 0,
			}),
		).toEqual({
			'queries[0]': 'a',
			'queries[1]': 'b',
			search: 'x',
			'nested[deep][0]': 1,
			zero: 0,
		});
	});
});

describe('appwriteApiRequest', () => {
	it('builds the request against the normalised endpoint with JSON conventions', async () => {
		const { context, requests } = createExecuteContext({
			parameters: PARAMETERS,
			respond: () => ({ total: 0, databases: [] }),
		});

		const response = await appwriteApiRequest.call(context, 'GET', '/tablesdb', {
			qs: { queries: ['q1', 'q2'], search: undefined },
			body: { ignored: 'on GET' },
			headers: { 'x-extra': '1' },
		});

		expect(response).toEqual({ total: 0, databases: [] });
		expect(requests).toHaveLength(1);
		const [request] = requests;
		expect(request.method).toBe('GET');
		expect(request.url).toBe(`${BASE_URL}/tablesdb`);
		expect(request.headers).toEqual({ 'content-type': 'application/json', 'x-extra': '1' });
		expect(request.json).toBe(true);
		expect(request.qs).toEqual({ 'queries[0]': 'q1', 'queries[1]': 'q2' });
		expect(request.body).toBeUndefined();
	});

	it('sends a body without undefined keys on writes', async () => {
		const { context, requests } = createExecuteContext({ parameters: PARAMETERS });
		await appwriteApiRequest.call(context, 'POST', '/tablesdb', {
			body: { databaseId: 'x', name: 'Main', enabled: undefined, permissions: [] },
		});
		expect(requests[0].body).toEqual({ databaseId: 'x', name: 'Main', permissions: [] });
	});

	it('wraps an Appwrite error payload in a NodeApiError with its message', async () => {
		const { context } = createExecuteContext({
			parameters: PARAMETERS,
			respond: () => {
				throw {
					message: 'Request failed with status code 401',
					response: {
						body: {
							message: 'Missing scope: databases.read',
							code: 401,
							type: 'general_unauthorized_scope',
						},
					},
				};
			},
		});

		const failure = await appwriteApiRequest
			.call(context, 'GET', '/tablesdb', {}, 2)
			.catch((e) => e);
		expect(failure).toBeInstanceOf(NodeApiError);
		expect(`${failure.message} ${failure.description ?? ''}`).toContain(
			'Missing scope: databases.read',
		);
		expect(failure.context.itemIndex).toBe(2);
	});

	it('re-throws a pre-wrapped NodeApiError, tagging it with the item index', async () => {
		const wrapped = new NodeApiError(testNode, { message: 'Already wrapped' });
		const { context } = createExecuteContext({
			parameters: PARAMETERS,
			respond: () => {
				throw wrapped;
			},
		});

		const failure = await appwriteApiRequest
			.call(context, 'GET', '/tablesdb', {}, 4)
			.catch((e) => e);
		expect(failure).toBe(wrapped);
		expect(failure.context.itemIndex).toBe(4);
	});

	it('decodes an error body that arrived as bytes on a binary request', async () => {
		const wrapped = new NodeApiError(testNode, {
			message: 'Bad request - please check your parameters',
		});
		wrapped.context.data = Buffer.from(
			JSON.stringify({ message: 'File not found', code: 404, type: 'storage_file_not_found' }),
		);
		const { context } = createExecuteContext({
			parameters: PARAMETERS,
			respond: () => {
				throw wrapped;
			},
		});

		const failure = await appwriteApiRequestBinary
			.call(context, 'GET', '/storage/buckets/b/files/f/download', {}, 0)
			.catch((e) => e);
		expect(failure).toBeInstanceOf(NodeApiError);
		expect(failure).not.toBe(wrapped);
		expect(`${failure.message} ${failure.description ?? ''}`).toContain('File not found');
	});
});

describe('appwriteApiRequestBinary', () => {
	it('asks for raw bytes instead of parsed JSON', async () => {
		const bytes = Buffer.from('PNG');
		const { context, requests } = createExecuteContext({
			parameters: PARAMETERS,
			respond: () => bytes,
		});

		const response = await appwriteApiRequestBinary.call(context, 'GET', '/avatars/favicon', {
			qs: { url: 'https://example.com' },
		});

		expect(response).toBe(bytes);
		expect(requests[0].encoding).toBe('arraybuffer');
		expect(requests[0].json).toBe(false);
		expect(requests[0].qs).toEqual({ url: 'https://example.com' });
	});
});

describe('appwriteFileUpload', () => {
	const CHUNK = 5 * 1024 * 1024;
	const upload = async (
		content: Buffer,
		filename = 'report.pdf',
		respond?: (request: IHttpRequestOptions, index: number) => unknown,
	) => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'file', operation: 'upload' },
			respond: respond ?? ((_request, index) => JSON.stringify({ $id: `upload-${index}` })),
		});
		const response = await appwriteFileUpload.call(
			context,
			'/storage/buckets/b1/files',
			{ content, filename, contentType: 'application/pdf' },
			[
				['fileId', 'f1'],
				['permissions[]', 'read("any")'],
			],
			0,
		);
		return { response, requests };
	};

	it('sends a small file as one hand-built multipart request', async () => {
		const { response, requests } = await upload(Buffer.from('%PDF-1.7 hello'));

		expect(response).toEqual({ $id: 'upload-0' });
		expect(requests).toHaveLength(1);
		const [request] = requests;
		expect(request.method).toBe('POST');
		expect(request.url).toBe(`${BASE_URL}/storage/buckets/b1/files`);
		expect(request.json).toBe(false);
		const contentType = (request.headers as Record<string, string>)['content-type'];
		expect(contentType).toMatch(
			/^multipart\/form-data; boundary=----n8nAppwriteBoundary[0-9a-f]{32}$/,
		);
		expect(request.headers).not.toHaveProperty('content-range');
		expect(request.headers).not.toHaveProperty('x-appwrite-id');

		const boundary = contentType.split('boundary=')[1];
		const body = (request.body as Buffer).toString('latin1');
		expect(body).toContain(
			`--${boundary}\r\nContent-Disposition: form-data; name="fileId"\r\n\r\nf1\r\n`,
		);
		expect(body).toContain('name="permissions[]"\r\n\r\nread("any")\r\n');
		expect(body).toContain(
			'Content-Disposition: form-data; name="file"; filename="report.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7 hello\r\n',
		);
		expect(body.endsWith(`--${boundary}--\r\n`)).toBe(true);
	});

	it('neutralises quotes and line breaks in the filename so headers cannot be forged', async () => {
		const { requests } = await upload(Buffer.from('x'), 'evil"\r\nContent-Type: text/html\r\n.txt');
		const body = (requests[0].body as Buffer).toString('latin1');
		expect(body).toContain('filename="evil%22Content-Type: text/html.txt"');
		expect(body).not.toContain('\r\nContent-Type: text/html\r\n');
	});

	it('splits large files into 5 MB chunks that share the upload ID', async () => {
		const content = Buffer.alloc(CHUNK + 1, 'a');
		const { response, requests } = await upload(content);

		expect(requests).toHaveLength(2);
		expect(requests[0].headers).toMatchObject({
			'content-range': `bytes 0-${CHUNK - 1}/${CHUNK + 1}`,
		});
		expect(requests[0].headers).not.toHaveProperty('x-appwrite-id');
		expect(requests[1].headers).toMatchObject({
			'content-range': `bytes ${CHUNK}-${CHUNK}/${CHUNK + 1}`,
			'x-appwrite-id': 'upload-0',
		});
		expect(response).toEqual({ $id: 'upload-1' });

		const lastBody = (requests[1].body as Buffer).toString('latin1');
		expect(lastBody).toContain('Content-Type: application/pdf\r\n\r\na\r\n');
	});

	it('still uploads an empty file once', async () => {
		const { requests } = await upload(Buffer.alloc(0));
		expect(requests).toHaveLength(1);
	});

	it('accepts an already-parsed response and rejects a non-JSON one', async () => {
		const parsed = await upload(Buffer.from('x'), 'a.pdf', () => ({ $id: 'obj' }));
		expect(parsed.response).toEqual({ $id: 'obj' });

		await expect(upload(Buffer.from('x'), 'a.pdf', () => '<html>')).rejects.toThrow(
			NodeOperationError,
		);
	});
});
