import { describe, expect, it } from 'vitest';

import { AppwriteApi } from '../credentials/AppwriteApi.credentials';
import { AppwriteOrganizationApi } from '../credentials/AppwriteOrganizationApi.credentials';

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
		expect(names).toEqual(['endpoint', 'projectId', 'apiKey', 'ignoreSslIssues']);
		for (const property of credential.properties.slice(0, 3)) {
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

	it('can skip certificate validation, off by default, for its test too', () => {
		const option = credential.properties.find((property) => property.name === 'ignoreSslIssues');
		expect(option).toMatchObject({ type: 'boolean', default: false });
		expect(credential.test.request.skipSslCertificateValidation).toBe(
			'={{$credentials.ignoreSslIssues}}',
		);
	});
});

describe('AppwriteOrganizationApi credential', () => {
	const credential = new AppwriteOrganizationApi();
	const project = new AppwriteApi();

	it('is named consistently with the node and documented like the project credential', () => {
		expect(credential.name).toBe('appwriteOrganizationApi');
		expect(credential.displayName).toBe('Appwrite Organization API');
		expect(credential.documentationUrl).toBe(project.documentationUrl);
		expect(credential.icon).toEqual(project.icon);
	});

	it('asks for the endpoint, organization ID and a masked organization API key', () => {
		const names = credential.properties.map((property) => property.name);
		expect(names).toEqual(['endpoint', 'organizationId', 'apiKey', 'ignoreSslIssues']);
		for (const property of credential.properties.slice(0, 3)) {
			expect(property.required, `${property.name} is required`).toBe(true);
			expect(property.description, `${property.name} has a description`).toBeTruthy();
		}
		const apiKey = credential.properties.find((property) => property.name === 'apiKey');
		expect(apiKey?.displayName).toBe('Organization API Key');
		expect(apiKey?.typeOptions).toEqual({ password: true });
		// Both credentials ask for the endpoint, and about SSL, the same way.
		expect(credential.properties[0]).toEqual(project.properties[0]);
		expect(credential.properties[3]).toEqual(project.properties[3]);
	});

	it("sends the key with the organization's ID, in the Console's own project", () => {
		expect(credential.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					'X-Appwrite-Project': 'console',
					'X-Appwrite-Organization': '={{$credentials.organizationId}}',
					'X-Appwrite-Key': '={{$credentials.apiKey}}',
				},
			},
		});
	});

	it('tests the credential against an organization endpoint that needs a real scope', () => {
		expect(credential.test.request).toEqual({
			baseURL: project.test.request.baseURL,
			url: '/organization/projects',
			method: 'GET',
			skipSslCertificateValidation: project.test.request.skipSslCertificateValidation,
		});
	});
});
