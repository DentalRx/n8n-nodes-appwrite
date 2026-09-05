import { describe, expect, it } from 'vitest';

import { AppwriteApi } from '../credentials/AppwriteApi.credentials';

describe('AppwriteApi credential', () => {
	const credential = new AppwriteApi();

	it('is named consistently with the node and documented', () => {
		expect(credential.name).toBe('appwriteApi');
		expect(credential.displayName).toBe('Appwrite API');
		expect(credential.documentationUrl).toMatch(/^https:\/\//);
		expect(credential.icon).toEqual({
			light: 'file:../nodes/Appwrite/appwrite.svg',
			dark: 'file:../nodes/Appwrite/appwrite.dark.svg',
		});
	});

	it('asks for the endpoint, project ID and a masked API key', () => {
		const names = credential.properties.map((property) => property.name);
		expect(names).toEqual(['endpoint', 'projectId', 'apiKey']);
		for (const property of credential.properties) {
			expect(property.required, `${property.name} is required`).toBe(true);
			expect(property.description, `${property.name} has a description`).toBeTruthy();
		}
		const apiKey = credential.properties.find((property) => property.name === 'apiKey');
		expect(apiKey?.typeOptions).toEqual({ password: true });
		const endpoint = credential.properties.find((property) => property.name === 'endpoint');
		expect(endpoint?.default).toBe('https://cloud.appwrite.io/v1');
	});

	it('authenticates every request with the Appwrite project and key headers', () => {
		expect(credential.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					'X-Appwrite-Project': '={{$credentials.projectId}}',
					'X-Appwrite-Key': '={{$credentials.apiKey}}',
				},
			},
		});
	});

	it('tests the credential against an endpoint that needs a real scope', () => {
		expect(credential.test.request.method).toBe('GET');
		expect(credential.test.request.url).toBe('/tablesdb');
		expect(credential.test.request.baseURL).toContain('$credentials.endpoint');
	});
});
