import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

const USER = { __rl: true, mode: 'id', value: 'u1' };

async function run(parameters: IDataObject, respond: () => unknown = () => ({ $id: 'x' })) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'user', ...parameters },
		respond,
	});
	const [output] = await node.execute.call(context);
	return { output, requests };
}

describe('User › Create with Password Hash', () => {
	const base = {
		operation: 'createWithPasswordHash',
		userId: 'imported',
		email: 'name@email.com',
		passwordHash: 'hashed-secret',
	};

	it('posts a bcrypt hash with only the common fields', async () => {
		const { requests } = await run({ ...base, passwordHashAlgorithm: 'bcrypt' });

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/users/bcrypt`);
		expect(requests[0].body).toEqual({
			userId: 'imported',
			email: 'name@email.com',
			password: 'hashed-secret',
		});
	});

	it('sends the Scrypt cost parameters to the Scrypt endpoint', async () => {
		const { requests } = await run({
			...base,
			passwordHashAlgorithm: 'scrypt',
			passwordSalt: 'salt',
			passwordCpu: 16384,
			passwordMemory: 8,
			options: { name: 'Ada' },
		});

		expect(requests[0].url).toBe(`${BASE_URL}/users/scrypt`);
		expect(requests[0].body).toEqual({
			userId: 'imported',
			email: 'name@email.com',
			password: 'hashed-secret',
			name: 'Ada',
			passwordSalt: 'salt',
			passwordCpu: 16384,
			passwordMemory: 8,
			passwordParallel: 1,
			passwordLength: 64,
		});
	});

	it('sends the Firebase key material to the Scrypt Modified endpoint', async () => {
		const { requests } = await run({
			...base,
			passwordHashAlgorithm: 'scryptModified',
			passwordSalt: 'c2FsdA==',
			passwordSaltSeparator: 'Bw==',
			passwordSignerKey: 'a2V5',
		});

		expect(requests[0].url).toBe(`${BASE_URL}/users/scrypt-modified`);
		expect(requests[0].body).toMatchObject({
			passwordSalt: 'c2FsdA==',
			passwordSaltSeparator: 'Bw==',
			passwordSignerKey: 'a2V5',
		});
		expect(requests[0].body).not.toHaveProperty('passwordCpu');
	});

	it('sends the SHA version, defaulting to the SHA-256 Appwrite assumes', async () => {
		const defaulted = await run({ ...base, passwordHashAlgorithm: 'sha' });
		expect(defaulted.requests[0].url).toBe(`${BASE_URL}/users/sha`);
		expect((defaulted.requests[0].body as IDataObject).passwordVersion).toBe('sha256');

		const chosen = await run({ ...base, passwordHashAlgorithm: 'sha', passwordVersion: 'sha1' });
		expect((chosen.requests[0].body as IDataObject).passwordVersion).toBe('sha1');
	});

	it('generates the user ID when it is left empty', async () => {
		const { requests } = await run({ ...base, userId: '', passwordHashAlgorithm: 'md5' });
		expect((requests[0].body as IDataObject).userId).toMatch(/^[0-9a-f]{20}$/);
	});

	it('rejects an algorithm an expression resolved to an unknown value', async () => {
		await expect(run({ ...base, passwordHashAlgorithm: 'rot13' })).rejects.toThrow(
			'Unknown hash algorithm "rot13"',
		);
	});
});

describe('User › targets', () => {
	it('creates a target with its provider type and identifier', async () => {
		const { requests } = await run({
			operation: 'createTarget',
			userId: USER,
			targetId: 'phone',
			targetProviderType: 'sms',
			targetIdentifier: '+15555550100',
		});

		expect(requests[0].url).toBe(`${BASE_URL}/users/u1/targets`);
		expect(requests[0].body).toEqual({
			targetId: 'phone',
			providerType: 'sms',
			identifier: '+15555550100',
		});
	});

	it('sends only the fields being updated, as Appwrite keeps the rest', async () => {
		const { requests } = await run({
			operation: 'updateTarget',
			userId: USER,
			targetId: 'phone',
			updateFields: { name: 'Work Phone', targetIdentifier: '' },
		});

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('PATCH');
		expect(requests[0].url).toBe(`${BASE_URL}/users/u1/targets/phone`);
		expect(requests[0].body).toEqual({ name: 'Work Phone' });
	});

	it('reports the deleted target', async () => {
		const { output, requests } = await run({
			operation: 'deleteTarget',
			userId: USER,
			targetId: 'phone',
		});

		expect(requests[0].method).toBe('DELETE');
		expect(output[0].json).toEqual({ deleted: true, userId: 'u1', targetId: 'phone' });
	});
});

describe('User › MFA', () => {
	it.each([
		['createMfaRecoveryCodes', 'PATCH', '/users/u1/mfa/recovery-codes'],
		['regenerateMfaRecoveryCodes', 'PUT', '/users/u1/mfa/recovery-codes'],
		['getMfaRecoveryCodes', 'GET', '/users/u1/mfa/recovery-codes'],
		['getMfaFactors', 'GET', '/users/u1/mfa/factors'],
		['deleteMfaAuthenticator', 'DELETE', '/users/u1/mfa/authenticators/totp'],
	])('%s calls %s %s', async (operation, method, path) => {
		const { requests } = await run({ operation, userId: USER });

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe(method);
		expect(requests[0].url).toBe(`${BASE_URL}${path}`);
	});

	it('turns MFA on or off', async () => {
		const { requests } = await run({ operation: 'updateMfa', userId: USER, mfa: false });
		expect(requests[0].url).toBe(`${BASE_URL}/users/u1/mfa`);
		expect(requests[0].body).toEqual({ mfa: false });
	});

	it('does not grant impersonation unless asked to', async () => {
		const { requests } = await run({ operation: 'updateImpersonator', userId: USER });
		expect(requests[0].url).toBe(`${BASE_URL}/users/u1/impersonator`);
		expect(requests[0].body).toEqual({ impersonator: false });
	});
});
