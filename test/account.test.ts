import type { IHttpRequestOptions, INodeParameters, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import type { Responder } from './helpers/mock-context';
import {
	BASE_URL,
	CREDENTIALS,
	createExecuteContext,
	node,
	testNode,
} from './helpers/mock-context';

/**
 * The Account endpoints act as a signed-in user. Appwrite identifies that user
 * by a JWT or session secret, and a request that also carries the API key is
 * judged by the key's scopes instead, which never include `account`. So these
 * requests must bypass the credential and send only the project ID and the
 * user's own header, while sign-in operations keep using the API key.
 */

const JSON_HEADER = { 'content-type': 'application/json' };
const PROJECT_HEADER = { 'X-Appwrite-Project': CREDENTIALS.projectId };
const USER = { __rl: true, mode: 'id', value: 'user-1' };

async function run(parameters: INodeParameters, respond?: Responder) {
	const { context, requests, withApiKey } = createExecuteContext({
		parameters: { resource: 'account', ...parameters },
		respond,
	});
	const [output] = await node.execute.call(context);
	return { output, requests, withApiKey };
}

describe('Account operations that act as the signed-in user', () => {
	it('send the JWT and the project ID, and never the API key', async () => {
		const { output, requests, withApiKey } = await run(
			{ operation: 'get', accountAuthentication: 'jwt', accountJwt: 'user-jwt' },
			() => ({ $id: 'user-1', name: 'Ada' }),
		);

		expect(withApiKey).toEqual([false]);
		expect(requests[0].method).toBe('GET');
		expect(requests[0].url).toBe(`${BASE_URL}/account`);
		expect(requests[0].headers).toEqual({
			...JSON_HEADER,
			...PROJECT_HEADER,
			'X-Appwrite-JWT': 'user-jwt',
		});
		expect(output).toEqual([{ json: { $id: 'user-1', name: 'Ada' }, pairedItem: { item: 0 } }]);
	});

	it('send the session secret instead when chosen', async () => {
		const { requests, withApiKey } = await run({
			operation: 'updateName',
			accountAuthentication: 'session',
			accountSessionSecret: 'session-secret',
			name: 'Ada Lovelace',
		});

		expect(withApiKey).toEqual([false]);
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${BASE_URL}/account/name`);
		expect(requests[0].headers).toEqual({
			...JSON_HEADER,
			...PROJECT_HEADER,
			'X-Appwrite-Session': 'session-secret',
		});
		expect(requests[0].body).toEqual({ name: 'Ada Lovelace' });
	});

	it('take only a session secret where the MFA factor is recorded on the session', async () => {
		// A JWT names no current session, so these operations offer no JWT: the
		// Authentication and JWT values below are not displayed and never read.
		const { requests, withApiKey } = await run({
			operation: 'completeMfaChallenge',
			accountAuthentication: 'jwt',
			accountJwt: 'user-jwt',
			accountSessionSecret: 'session-secret',
			challengeId: 'challenge-1',
			accountOtp: '123456',
		});

		expect(withApiKey).toEqual([false]);
		expect(requests[0].method).toBe('PUT');
		expect(requests[0].url).toBe(`${BASE_URL}/account/mfa/challenges`);
		expect(requests[0].headers).toEqual({
			...JSON_HEADER,
			...PROJECT_HEADER,
			'X-Appwrite-Session': 'session-secret',
		});
		expect(requests[0].body).toEqual({ challengeId: 'challenge-1', otp: '123456' });
	});

	it('carry the user credential on every page of Return All', async () => {
		const page = (count: number, offset: number) => ({
			total: 101,
			identities: Array.from({ length: count }, (_, index) => ({ $id: `id-${offset + index}` })),
		});
		const { output, requests, withApiKey } = await run(
			{
				operation: 'getManyIdentities',
				accountAuthentication: 'jwt',
				accountJwt: 'user-jwt',
				returnAll: true,
			},
			(_request, index) => (index === 0 ? page(100, 0) : page(1, 100)),
		);

		expect(output).toHaveLength(101);
		expect(withApiKey).toEqual([false, false]);
		for (const request of requests) {
			expect(request.url).toBe(`${BASE_URL}/account/identities`);
			expect(request.headers).toMatchObject({ 'X-Appwrite-JWT': 'user-jwt' });
		}
		expect(Object.values(requests[1].qs ?? {})).toContain(
			JSON.stringify({ method: 'cursorAfter', values: ['id-99'] }),
		);
	});

	it('stop before sending anything when the JWT is empty', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'account', operation: 'get', accountAuthentication: 'jwt' },
		});

		const failure = await node.execute.call(context).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(NodeOperationError);
		expect((failure as NodeOperationError).message).toBe("The 'JWT' parameter is empty");
		expect(requests).toHaveLength(0);
	});

	it('refuse a blank session ID rather than address every session', async () => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'account',
				operation: 'deleteSession',
				accountAuthentication: 'session',
				accountSessionSecret: 'session-secret',
				sessionId: '  ',
			},
		});

		const failure = await node.execute.call(context).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(NodeOperationError);
		expect((failure as NodeOperationError).message).toBe("The 'Session ID' parameter is empty");
		expect(requests).toHaveLength(0);
	});
});

describe('Account operations that sign users in or email them secrets', () => {
	it('use the API key through the credential, with no user header', async () => {
		const { output, requests, withApiKey } = await run(
			{
				operation: 'createEmailPasswordSession',
				email: 'ada@example.com',
				password: 'correct-horse-battery-staple',
			},
			() => ({ $id: 'session-1', userId: 'user-1', secret: 'session-secret' }),
		);

		expect(withApiKey).toEqual([true]);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/account/sessions/email`);
		expect(requests[0].headers).toEqual(JSON_HEADER);
		expect(requests[0].body).toEqual({
			email: 'ada@example.com',
			password: 'correct-horse-battery-staple',
		});
		expect(output[0].json.secret).toBe('session-secret');
	});

	it.each([
		['link', '/account/recovery', { email: 'ada@example.com', url: 'https://example.com/reset' }],
		['code', '/account/recovery/otp', { email: 'ada@example.com', phrase: true }],
	])('send a password recovery %s to its own endpoint', async (method, path, body) => {
		const { requests, withApiKey } = await run({
			operation: 'createRecovery',
			accountEmailMethod: method,
			email: 'ada@example.com',
			url: 'https://example.com/reset',
			options: { phrase: true },
		});

		expect(withApiKey).toEqual([true]);
		expect(requests[0].url).toBe(`${BASE_URL}${path}`);
		expect(requests[0].body).toEqual(body);
	});

	it('let an ID token sign-in link the identity to a signed-in user instead', async () => {
		const withKey = await run({
			operation: 'createIdTokenSession',
			accountIdToken: 'id-token',
		});
		expect(withKey.withApiKey).toEqual([true]);
		expect(withKey.requests[0].body).toEqual({ provider: 'google', idToken: 'id-token' });

		const asUser = await run({
			operation: 'createIdTokenSession',
			accountAuthentication: 'jwt',
			accountJwt: 'user-jwt',
			accountIdTokenProvider: 'apple',
			accountIdToken: 'id-token',
			options: { nonce: 'raw-nonce' },
		});
		expect(asUser.withApiKey).toEqual([false]);
		expect(asUser.requests[0].url).toBe(`${BASE_URL}/account/sessions/id-token`);
		expect(asUser.requests[0].headers).toMatchObject({
			...PROJECT_HEADER,
			'X-Appwrite-JWT': 'user-jwt',
		});
		expect(asUser.requests[0].body).toEqual({
			provider: 'apple',
			idToken: 'id-token',
			nonce: 'raw-nonce',
		});
	});
});

describe('Account operations that complete a verification', () => {
	it.each([
		['link', '/account/verifications/email'],
		['code', '/account/verifications/email/otp'],
	])('send a %s secret as a guest: the project ID only, no API key', async (method, path) => {
		const { requests, withApiKey } = await run({
			operation: 'completeEmailVerification',
			accountEmailMethod: method,
			userId: USER,
			accountSecret: 'verification-secret',
		});

		expect(withApiKey).toEqual([false]);
		expect(requests[0].method).toBe('PUT');
		expect(requests[0].url).toBe(`${BASE_URL}${path}`);
		expect(requests[0].headers).toEqual({ ...JSON_HEADER, ...PROJECT_HEADER });
		expect(requests[0].body).toEqual({ userId: 'user-1', secret: 'verification-secret' });
	});
});

describe('Account request failures', () => {
	/** The shape of the HTTP client's error that n8n's request helpers receive. */
	class AxiosError extends Error {
		readonly isAxiosError = true;

		constructor(readonly response: { status: number; data: JsonObject }) {
			super(`Request failed with status code ${response.status}`);
		}
	}

	const unauthorized = (): AxiosError =>
		new AxiosError({
			status: 401,
			data: {
				message: 'The current user is not authorized to perform the requested action.',
				code: 401,
				type: 'user_unauthorized',
			},
		});

	// httpRequestWithAuthentication hands the node a NodeApiError built from the
	// HTTP client's error; httpRequest hands over the raw error. Requests the
	// node authenticates itself carry the project header.
	const fail: Responder = (request: IHttpRequestOptions) => {
		const error = unauthorized();
		const signedByNode = (request.headers as Record<string, unknown>)['X-Appwrite-Project'];
		throw signedByNode === undefined
			? new NodeApiError(testNode, error as unknown as JsonObject)
			: error;
	};

	it("surface Appwrite's message the same way for user and API-key requests", async () => {
		const errorItem = async (parameters: INodeParameters) => {
			const { context } = createExecuteContext({
				parameters: { resource: 'account', ...parameters },
				continueOnFail: true,
				respond: fail,
			});
			const [output] = await node.execute.call(context);
			return output[0].json;
		};

		const asUser = await errorItem({
			operation: 'get',
			accountAuthentication: 'jwt',
			accountJwt: 'user-jwt',
		});
		const withApiKey = await errorItem({ operation: 'createAnonymousSession' });

		expect(asUser.description).toBe(
			'The current user is not authorized to perform the requested action.',
		);
		expect(asUser.httpCode).toBe('401');
		expect(asUser).toEqual(withApiKey);
	});

	it('tag a failed user request with its item index', async () => {
		const { context } = createExecuteContext({
			parameters: {
				resource: 'account',
				operation: 'get',
				accountAuthentication: 'jwt',
				accountJwt: 'user-jwt',
			},
			items: [{ json: {} }, { json: {} }],
			respond: (request, index) => {
				if (index === 0) return { $id: 'user-1' };
				return fail(request, index);
			},
		});

		const failure = await node.execute.call(context).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(NodeApiError);
		expect((failure as NodeApiError).context.itemIndex).toBe(1);
	});
});
