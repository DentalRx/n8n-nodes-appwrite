import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AppwriteApi implements ICredentialType {
	name = 'appwriteApi';

	displayName = 'Appwrite API';

	icon = 'file:../nodes/Appwrite/appwrite.svg' as const;

	documentationUrl = 'https://appwrite.io/docs/advanced/platform/api-keys';

	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: 'https://cloud.appwrite.io/v1',
			required: true,
			placeholder: 'https://cloud.appwrite.io/v1',
			description:
				'The Appwrite API endpoint URL. Use https://cloud.appwrite.io/v1 for Appwrite Cloud (or your region endpoint, e.g. https://nyc.cloud.appwrite.io/v1), or the URL of your self-hosted instance.',
		},
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string',
			default: '',
			required: true,
			placeholder: '5f9a9b9a9b9a9',
			description:
				'The Appwrite project ID. Found in the Appwrite Console under Settings > Project ID.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'An Appwrite API key with the scopes required for the operations you want to run. Create one in the Appwrite Console under Overview > Integrations > API Keys.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Appwrite-Project': '={{$credentials.projectId}}',
				'X-Appwrite-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// /ping answers at Appwrite's `global` scope, which the Guests role already
	// holds, and an unrecognised API key is downgraded to a guest key rather
	// than rejected - so pinging reports success for any key at all. Listing
	// databases needs a scope no guest has, which makes the test prove the key
	// works. It is also the first call the node's own Database picker makes.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.endpoint.replace(new RegExp("/+$"), "")}}',
			url: '/tablesdb',
			method: 'GET',
		},
	};
}
