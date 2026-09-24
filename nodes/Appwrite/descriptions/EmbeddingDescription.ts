import type { INodeProperties } from 'n8n-workflow';

export const embeddingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['embedding'],
			},
		},
		options: [
			{
				name: 'Create Text Embeddings',
				value: 'createTextEmbeddings',
				description: 'Turn text into vectors for semantic search and similarity queries',
				action: 'Create text embeddings',
			},
		],
		default: 'createTextEmbeddings',
	},
];

export const embeddingFields: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'embeddingText',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		placeholder: 'e.g. Appwrite is an open-source backend platform',
		description:
			'The text to embed. To embed several texts in one request, use an expression that returns an array of strings; the node outputs one item per text, in the same order.',
		displayOptions: {
			show: {
				resource: ['embedding'],
				operation: ['createTextEmbeddings'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['embedding'],
				operation: ['createTextEmbeddings'],
			},
		},
		options: [
			{
				displayName: 'Model',
				name: 'embeddingModel',
				type: 'options',
				options: [
					{
						name: 'All-MiniLM',
						value: 'all-minilm',
						description: '384-dimension vectors from a smaller, faster model',
					},
					{
						name: 'Nomic Embed Text',
						value: 'nomic-embed-text',
						description: "768-dimension vectors (Appwrite's default model)",
					},
				],
				default: 'nomic-embed-text',
				description:
					'The embedding model. Vectors from different models cannot be compared, so use the same one for stored data and for queries.',
			},
		],
	},
];
