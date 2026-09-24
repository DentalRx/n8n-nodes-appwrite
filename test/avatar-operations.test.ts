import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

/** SHA-256 of "name@email.com", the form Appwrite expects instead of the address. */
const EMAIL_HASH = '7039f319f9811cec2e14e6f7d6ae7eb6be55c5294a2f0aeb25397d9f8c04e1a8';

async function run(parameters: IDataObject) {
	const { context, requests } = createExecuteContext({
		parameters: { resource: 'avatar', ...parameters },
		respond: () => Buffer.from('image-bytes'),
	});
	const [output] = await node.execute.call(context);
	return { output, requests };
}

describe('Avatar › Get Photo', () => {
	it('sends a hash of the trimmed, lowercased email, never the address', async () => {
		const { requests } = await run({ operation: 'getPhoto', email: '  Name@Email.com ' });

		expect(requests[0].url).toBe(`${BASE_URL}/avatars/photo`);
		expect(requests[0].encoding).toBe('arraybuffer');
		expect(requests[0].qs).toEqual({ emailHash: EMAIL_HASH });
		expect(JSON.stringify(requests[0])).not.toContain('Name@Email.com');
	});

	it('resolves the photo for a picked user and names the file after the format', async () => {
		const { output, requests } = await run({
			operation: 'getPhoto',
			userId: { __rl: true, mode: 'id', value: 'u1' },
			options: { output: 'webp', rating: 'pg' },
		});

		expect(requests[0].qs).toEqual({ userId: 'u1', output: 'webp', rating: 'pg' });
		expect(output[0].binary?.data.fileName).toBe('photo.webp');
		expect(output[0].binary?.data.mimeType).toBe('image/webp');
	});

	it('refuses to run without a user, email, or name', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'avatar', operation: 'getPhoto' },
		});

		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		expect(requests).toHaveLength(0);
	});
});

describe('Avatar › Get Screenshot', () => {
	it('passes browser settings as query parameters', async () => {
		const { requests } = await run({
			operation: 'getScreenshot',
			url: 'https://example.com',
			options: {
				browserPermissions: ['geolocation', 'camera'],
				fullpage: true,
				headers: '{"Authorization": "Bearer secret"}',
				theme: 'dark',
				timezone: 'America/New_York',
			},
		});

		expect(requests[0].url).toBe(`${BASE_URL}/avatars/screenshots`);
		expect(requests[0].qs).toEqual({
			url: 'https://example.com',
			'headers[Authorization]': 'Bearer secret',
			theme: 'dark',
			fullpage: true,
			timezone: 'America/New_York',
			'permissions[0]': 'geolocation',
			'permissions[1]': 'camera',
		});
	});

	it('keeps the page headers, which may hold credentials, out of the output', async () => {
		const { output } = await run({
			operation: 'getScreenshot',
			url: 'https://example.com',
			options: { headers: { Authorization: 'Bearer secret' }, output: 'jpeg' },
		});

		expect(output[0].json).toEqual({ url: 'https://example.com', output: 'jpeg' });
		expect(output[0].binary?.data.fileName).toBe('screenshot.jpeg');
		expect(output[0].binary?.data.mimeType).toBe('image/jpeg');
	});

	it('omits empty headers and permissions', async () => {
		const { requests } = await run({
			operation: 'getScreenshot',
			url: 'https://example.com',
			options: { browserPermissions: [], headers: '{}' },
		});

		expect(requests[0].qs).toEqual({ url: 'https://example.com' });
	});
});
