/**
 * DocumentsDB and VectorsDB, the Appwrite database types that keep documents
 * in collections rather than rows in tables. Each is served by its own API
 * (`/documentsdb`, `/vectorsdb`) with the same shape, so the node builds the
 * three resources of each (Database, Collection, Document) from one set of
 * descriptions and executors, parameterised by the records below.
 */
export interface DocumentDatabaseType {
	/** The product name, as Appwrite writes it. */
	label: string;
	/** The API's base path. */
	path: string;
	/**
	 * Whether documents are embedding vectors with metadata, searchable by
	 * similarity (VectorsDB), rather than free-form attributes (DocumentsDB).
	 */
	vectors: boolean;
	/** The values of the type's entries in the Resource dropdown. */
	resources: { database: string; collection: string; document: string };
	/** The listSearch methods behind the type's Database and Collection pickers. */
	searchMethods: { databases: string; collections: string };
}

export const DOCUMENTS_DB: DocumentDatabaseType = {
	label: 'DocumentsDB',
	path: '/documentsdb',
	vectors: false,
	resources: {
		database: 'documentsDbDatabase',
		collection: 'documentsDbCollection',
		document: 'documentsDbDocument',
	},
	searchMethods: {
		databases: 'searchDocumentsDbDatabases',
		collections: 'searchDocumentsDbCollections',
	},
};

export const VECTORS_DB: DocumentDatabaseType = {
	label: 'VectorsDB',
	path: '/vectorsdb',
	vectors: true,
	resources: {
		database: 'vectorsDbDatabase',
		collection: 'vectorsDbCollection',
		document: 'vectorsDbDocument',
	},
	searchMethods: {
		databases: 'searchVectorsDbDatabases',
		collections: 'searchVectorsDbCollections',
	},
};

/**
 * The attribute every VectorsDB collection stores its vectors in. Appwrite
 * creates it, sized to the collection's dimension, next to a `metadata`
 * object attribute; VectorsDB collections have no other attributes.
 */
export const EMBEDDINGS_ATTRIBUTE = 'embeddings';
