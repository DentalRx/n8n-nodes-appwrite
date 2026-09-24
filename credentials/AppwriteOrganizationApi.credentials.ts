import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AppwriteOrganizationApi implements ICredentialType {
	name = 'appwriteOrganizationApi';

	displayName = 'Appwrite Organization API';

	icon = {
		light: 'file:../nodes/Appwrite/appwrite.svg',
		dark: 'file:../nodes/Appwrite/appwrite.dark.svg',
	} as const;

	documentationUrl = 'https://appwrite.io/docs/advanced/platform/api-keys';

	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: 'https://cloud.appwrite.io/v1',
			required: true,
			placeholder: 'e.g. https://cloud.appwrite.io/v1',
			description:
				'The Appwrite API endpoint URL. Use https://cloud.appwrite.io/v1 for Appwrite Cloud (or your region endpoint, e.g. https://nyc.cloud.appwrite.io/v1), or the URL of your self-hosted instance.',
		},
		{
			displayName: 'Organization ID',
			name: 'organizationId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. 5f9a9b9a9b9a9',
			description:
				"The Appwrite organization ID. Found in the address of the organization's page in the Appwrite Console, after organization-.",
		},
		{
			displayName: 'Organization API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				"An API key of the organization (it starts with organization_), with the scopes required for the operations you want to run, such as projects.read or domains.write. A project's API key does not work here.",
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'ignoreSslIssues',
			type: 'boolean',
			default: false,
			description:
				'Whether to connect even if SSL certificate validation is not possible, e.g. to a self-hosted Appwrite with a self-signed certificate',
		},
	];

	// An organization API key belongs to an organization, not to a project. In
	// the Console's own project, `console`, Appwrite looks the key up in the
	// organization the X-Appwrite-Organization header names; that pairing is
	// also what the Appwrite Console sends with its organization requests.
	// Without the header, or with another organization's ID, the key is not
	// found and the request runs as a guest.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Appwrite-Project': 'console',
				'X-Appwrite-Organization': '={{$credentials.organizationId}}',
				'X-Appwrite-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// A key Appwrite does not find in the organization is downgraded to a guest
	// key rather than rejected, and no guest may list the organization's
	// projects, so this proves the key, the organization ID and the endpoint
	// together. Unlike the organization's other endpoints, it is also served by
	// self-hosted Appwrite. It is the first call the node's Project picker makes.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.endpoint.replace(new RegExp("/+$"), "")}}',
			url: '/organization/projects',
			method: 'GET',
			skipSslCertificateValidation: '={{$credentials.ignoreSslIssues}}',
		},
	};
}
