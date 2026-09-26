import { id, ref, RUN } from '../common.mjs';

const DDB = id('ddb');
const DCOL = id('dcol');
const VDB = id('vdb');
const VCOL = id('vcol');
const dat = (extra) => ({ databaseId: DDB, collectionId: DCOL, ...extra });
const vat = (extra) => ({ databaseId: VDB, collectionId: VCOL, ...extra });
const field = (fieldName, fieldValue) => ({ fieldName, fieldValue });

export default [
	{
		key: 'DocDB',
		title: 'DocumentsDB: databases, collections, documents, transactions',
		steps: [
			{
				name: 'Create Database',
				op: 'documentsDbDatabase.create',
				set: { databaseId: DDB, name: 'Docs DB' },
			},
			{ name: 'Get Database', op: 'documentsDbDatabase.get', set: { databaseId: DDB } },
			{ name: 'Get Many Databases', op: 'documentsDbDatabase.getMany', set: { limit: 5 } },
			{
				name: 'Update Database',
				op: 'documentsDbDatabase.update',
				set: { databaseId: DDB, name: 'Docs DB (renamed)' },
			},
			{ name: 'Get Status', op: 'documentsDbDatabase.getStatus', set: { databaseId: DDB } },
			{ name: 'Get Replicas', op: 'documentsDbDatabase.getReplicas', set: { databaseId: DDB } },
			{
				name: 'Get Many Operations',
				op: 'documentsDbDatabase.getManyOperations',
				set: { databaseId: DDB },
			},
			{ name: 'Get Many Specifications', op: 'documentsDbDatabase.getManySpecifications' },
			{
				name: 'Failover (serverless)',
				op: 'documentsDbDatabase.failover',
				set: { databaseId: DDB },
			},
			{
				name: 'Create Collection',
				op: 'documentsDbCollection.create',
				set: { databaseId: DDB, collectionId: DCOL, name: 'Articles', permissions: 'read("any")' },
			},
			{ name: 'Get Collection', op: 'documentsDbCollection.get', set: dat({}) },
			{
				name: 'Get Many Collections',
				op: 'documentsDbCollection.getMany',
				set: { databaseId: DDB },
			},
			{
				name: 'Update Collection',
				op: 'documentsDbCollection.update',
				set: dat({ name: 'Articles (renamed)' }),
			},
			{
				name: 'Create Index',
				op: 'documentsDbCollection.createIndex',
				set: dat({ key: 'idx_title', indexType: 'key', indexAttributes: 'title' }),
			},
			{ name: 'Wait For Index', wait: 5 },
			{ name: 'Get Index', op: 'documentsDbCollection.getIndex', set: dat({ key: 'idx_title' }) },
			{ name: 'Get Many Indexes', op: 'documentsDbCollection.getManyIndexes', set: dat({}) },
			{
				name: 'Create Document (fields)',
				op: 'documentsDbDocument.create',
				set: dat({
					documentId: id('d1'),
					dataFieldsUi: { fieldValues: [field('title', 'First'), field('views', '10')] },
				}),
			},
			{
				name: 'Create Document (JSON)',
				op: 'documentsDbDocument.create',
				set: dat({
					documentId: id('d2'),
					dataMode: 'json',
					dataJson: '{"title":"Second","views":3,"tags":["a","b"],"meta":{"source":"test"}}',
				}),
			},
			{
				name: 'Create Many Documents',
				op: 'documentsDbDocument.createMany',
				set: dat({ documentsJson: '[{"title":"Bulk A","views":1},{"title":"Bulk B","views":2}]' }),
			},
			{
				name: 'Upsert Document',
				op: 'documentsDbDocument.upsert',
				set: dat({
					documentId: id('d3'),
					dataFieldsUi: { fieldValues: [field('title', 'Upserted')] },
				}),
			},
			{
				name: 'Upsert Many Documents',
				op: 'documentsDbDocument.upsertMany',
				set: dat({
					documentsJson: `={{ JSON.stringify([{ $id: 'd3' + ${RUN}, title: 'Upserted again', views: 7 }]) }}`,
				}),
			},
			{ name: 'Get Document', op: 'documentsDbDocument.get', set: dat({ documentId: id('d1') }) },
			{ name: 'Get Many Documents', op: 'documentsDbDocument.getMany', set: dat({ limit: 10 }) },
			{
				name: 'Get Many Documents (query + sort)',
				op: 'documentsDbDocument.getMany',
				set: dat({
					queriesUi: { queryValues: [{ type: 'greaterThan', column: 'views', value: '1' }] },
					sortUi: { sortValues: [{ column: 'views', direction: 'desc' }] },
				}),
			},
			{
				name: 'Update Document',
				op: 'documentsDbDocument.update',
				set: dat({
					documentId: id('d1'),
					dataFieldsUi: { fieldValues: [field('title', 'First (edited)')] },
				}),
			},
			{
				name: 'Increment',
				op: 'documentsDbDocument.increment',
				set: dat({ documentId: id('d1'), documentAttribute: 'views', amount: 2 }),
			},
			{
				name: 'Decrement',
				op: 'documentsDbDocument.decrement',
				set: dat({ documentId: id('d1'), documentAttribute: 'views', amount: 1 }),
			},
			{
				name: 'Update Many',
				op: 'documentsDbDocument.updateMany',
				set: dat({
					dataMode: 'json',
					dataJson: '{"archived":true}',
					queriesUi: { queryValues: [{ type: 'equal', column: 'title', value: 'Bulk A' }] },
				}),
			},
			{
				name: 'Create Transaction',
				op: 'documentsDbDatabase.createTransaction',
				set: { ttl: 300 },
			},
			{
				name: 'Create Document In Transaction',
				op: 'documentsDbDocument.create',
				set: dat({
					documentId: id('dt'),
					dataFieldsUi: { fieldValues: [field('title', 'In transaction')] },
					options: { transactionId: ref('DocDB: Create Transaction') },
				}),
			},
			{
				name: 'Create Transaction Operations',
				op: 'documentsDbDatabase.createTransactionOperations',
				set: {
					transactionId: ref('DocDB: Create Transaction'),
					operationsJson: `={{ JSON.stringify([{ action: 'create', databaseId: 'ddb' + ${RUN}, collectionId: 'dcol' + ${RUN}, documentId: 'unique()', data: { title: 'Staged operation' } }]) }}`,
				},
			},
			{
				name: 'Get Transaction',
				op: 'documentsDbDatabase.getTransaction',
				set: { transactionId: ref('DocDB: Create Transaction') },
			},
			{
				name: 'Get Many Transactions',
				op: 'documentsDbDatabase.getManyTransactions',
				set: { limit: 5 },
			},
			{
				name: 'Commit Transaction',
				op: 'documentsDbDatabase.commitTransaction',
				set: { transactionId: ref('DocDB: Create Transaction') },
			},
			{
				name: 'Get Committed Document',
				op: 'documentsDbDocument.get',
				set: dat({ documentId: id('dt') }),
			},
			{ name: 'Create Transaction 2', op: 'documentsDbDatabase.createTransaction' },
			{
				name: 'Rollback Transaction',
				op: 'documentsDbDatabase.rollbackTransaction',
				set: { transactionId: ref('DocDB: Create Transaction 2') },
			},
			{ name: 'Create Transaction 3', op: 'documentsDbDatabase.createTransaction' },
			{
				name: 'Delete Transaction',
				op: 'documentsDbDatabase.deleteTransaction',
				set: { transactionId: ref('DocDB: Create Transaction 3') },
			},
			{
				name: 'Delete Document',
				op: 'documentsDbDocument.delete',
				set: dat({ documentId: id('d2') }),
			},
			{
				name: 'Delete Many (query)',
				op: 'documentsDbDocument.deleteMany',
				set: dat({
					queriesUi: { queryValues: [{ type: 'equal', column: 'title', value: 'Bulk B' }] },
				}),
			},
			{
				name: 'Delete Many (all)',
				op: 'documentsDbDocument.deleteMany',
				set: dat({ applyToAll: true }),
			},
			{
				name: 'Delete Index',
				op: 'documentsDbCollection.deleteIndex',
				set: dat({ key: 'idx_title' }),
			},
			{ name: 'Delete Collection', op: 'documentsDbCollection.delete', set: dat({}) },
			{ name: 'Delete Database', op: 'documentsDbDatabase.delete', set: { databaseId: DDB } },
		],
	},
	{
		key: 'VecDB',
		title: 'VectorsDB and text embeddings',
		steps: [
			{
				name: 'Create Text Embeddings',
				op: 'embedding.createTextEmbeddings',
				set: {
					embeddingText: 'Appwrite is an open-source backend platform',
					options: { embeddingModel: 'all-minilm' },
				},
			},
			{
				name: 'Create Database',
				op: 'vectorsDbDatabase.create',
				set: { databaseId: VDB, name: 'Vectors DB' },
			},
			{ name: 'Get Database', op: 'vectorsDbDatabase.get', set: { databaseId: VDB } },
			{ name: 'Get Many Databases', op: 'vectorsDbDatabase.getMany', set: { limit: 5 } },
			{
				name: 'Update Database',
				op: 'vectorsDbDatabase.update',
				set: { databaseId: VDB, name: 'Vectors DB (renamed)' },
			},
			{ name: 'Get Status', op: 'vectorsDbDatabase.getStatus', set: { databaseId: VDB } },
			{ name: 'Get Replicas', op: 'vectorsDbDatabase.getReplicas', set: { databaseId: VDB } },
			{
				name: 'Get Many Operations',
				op: 'vectorsDbDatabase.getManyOperations',
				set: { databaseId: VDB },
			},
			{ name: 'Get Many Specifications', op: 'vectorsDbDatabase.getManySpecifications' },
			{ name: 'Failover (serverless)', op: 'vectorsDbDatabase.failover', set: { databaseId: VDB } },
			{
				name: 'Create Collection',
				op: 'vectorsDbCollection.create',
				set: {
					databaseId: VDB,
					collectionId: VCOL,
					name: 'Snippets',
					vectorDimension: 3,
					permissions: 'read("any")',
				},
			},
			{ name: 'Get Collection', op: 'vectorsDbCollection.get', set: vat({}) },
			{ name: 'Get Many Collections', op: 'vectorsDbCollection.getMany', set: { databaseId: VDB } },
			{
				name: 'Update Collection',
				op: 'vectorsDbCollection.update',
				set: vat({ name: 'Snippets (renamed)' }),
			},
			{
				name: 'Create Index',
				op: 'vectorsDbCollection.createIndex',
				set: vat({ key: 'idx_vec', indexType: 'hnsw_cosine', indexAttributes: 'embeddings' }),
			},
			{ name: 'Wait For Index', wait: 5 },
			{ name: 'Get Index', op: 'vectorsDbCollection.getIndex', set: vat({ key: 'idx_vec' }) },
			{ name: 'Get Many Indexes', op: 'vectorsDbCollection.getManyIndexes', set: vat({}) },
			{
				name: 'Create Document',
				op: 'vectorsDbDocument.create',
				set: vat({
					documentId: id('v1'),
					vectorEmbeddings: '[0.1, 0.2, 0.3]',
					vectorMetadata: '{"label":"first"}',
				}),
			},
			{
				name: 'Create Many Documents',
				op: 'vectorsDbDocument.createMany',
				set: vat({
					documentsJson:
						'[{"embeddings":[0.3,0.2,0.1],"metadata":{"label":"bulk"}},{"embeddings":[0.9,0.1,0.0],"metadata":{"label":"bulk"}}]',
				}),
			},
			{
				name: 'Upsert Document',
				op: 'vectorsDbDocument.upsert',
				set: vat({
					documentId: id('v2'),
					vectorEmbeddings: '[0.5, 0.5, 0.5]',
					vectorMetadata: '{"label":"upserted"}',
				}),
			},
			{
				name: 'Upsert Many Documents',
				op: 'vectorsDbDocument.upsertMany',
				set: vat({
					documentsJson: `={{ JSON.stringify([{ $id: 'v2' + ${RUN}, embeddings: [0.4, 0.5, 0.6], metadata: { label: 'upserted again' } }]) }}`,
				}),
			},
			{ name: 'Get Document', op: 'vectorsDbDocument.get', set: vat({ documentId: id('v1') }) },
			{ name: 'Get Many Documents', op: 'vectorsDbDocument.getMany', set: vat({ limit: 10 }) },
			{
				name: 'Search',
				op: 'vectorsDbDocument.search',
				set: vat({ searchVector: '[0.1, 0.2, 0.3]', similarityMetric: 'cosine', limit: 2 }),
			},
			{
				name: 'Update Document',
				op: 'vectorsDbDocument.update',
				set: vat({ documentId: id('v1'), vectorMetadata: '{"label":"edited"}' }),
			},
			{
				name: 'Update Many',
				op: 'vectorsDbDocument.updateMany',
				set: vat({ vectorMetadata: '{"batch":true}', applyToAll: true }),
			},
			{ name: 'Create Transaction', op: 'vectorsDbDatabase.createTransaction', set: { ttl: 300 } },
			{
				name: 'Create Transaction Operations',
				op: 'vectorsDbDatabase.createTransactionOperations',
				set: {
					transactionId: ref('VecDB: Create Transaction'),
					operationsJson: `={{ JSON.stringify([{ action: 'create', databaseId: 'vdb' + ${RUN}, collectionId: 'vcol' + ${RUN}, documentId: 'unique()', data: { embeddings: [0.2, 0.2, 0.2] } }]) }}`,
				},
			},
			{
				name: 'Get Transaction',
				op: 'vectorsDbDatabase.getTransaction',
				set: { transactionId: ref('VecDB: Create Transaction') },
			},
			{
				name: 'Get Many Transactions',
				op: 'vectorsDbDatabase.getManyTransactions',
				set: { limit: 5 },
			},
			{
				name: 'Commit Transaction',
				op: 'vectorsDbDatabase.commitTransaction',
				set: { transactionId: ref('VecDB: Create Transaction') },
			},
			{ name: 'Create Transaction 2', op: 'vectorsDbDatabase.createTransaction' },
			{
				name: 'Rollback Transaction',
				op: 'vectorsDbDatabase.rollbackTransaction',
				set: { transactionId: ref('VecDB: Create Transaction 2') },
			},
			{ name: 'Create Transaction 3', op: 'vectorsDbDatabase.createTransaction' },
			{
				name: 'Delete Transaction',
				op: 'vectorsDbDatabase.deleteTransaction',
				set: { transactionId: ref('VecDB: Create Transaction 3') },
			},
			{
				name: 'Delete Document',
				op: 'vectorsDbDocument.delete',
				set: vat({ documentId: id('v2') }),
			},
			{
				name: 'Delete Many (query)',
				op: 'vectorsDbDocument.deleteMany',
				set: vat({
					queriesUi: { queryValues: [{ type: 'equal', column: 'metadata.label', value: 'bulk' }] },
				}),
			},
			{
				name: 'Delete Many (all)',
				op: 'vectorsDbDocument.deleteMany',
				set: vat({ applyToAll: true }),
			},
			{ name: 'Delete Index', op: 'vectorsDbCollection.deleteIndex', set: vat({ key: 'idx_vec' }) },
			{ name: 'Delete Collection', op: 'vectorsDbCollection.delete', set: vat({}) },
			{ name: 'Delete Database', op: 'vectorsDbDatabase.delete', set: { databaseId: VDB } },
		],
	},
];
