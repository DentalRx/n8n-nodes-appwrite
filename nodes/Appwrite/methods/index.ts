import {
	searchBuckets,
	searchDatabases,
	searchDedicatedDatabases,
	searchDocumentsDbCollections,
	searchDocumentsDbDatabases,
	searchFiles,
	searchFunctions,
	searchProviders,
	searchSites,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
	searchVectorsDbCollections,
	searchVectorsDbDatabases,
	searchWebhooks,
} from './listSearch';
import {
	getAvailablePostgresqlExtensions,
	getColumns,
	getFrameworks,
	getInstalledPostgresqlExtensions,
	getRuntimes,
	getSiteBuildRuntimes,
} from './loadOptions';

/** The pickers behind the node's resource locators (From List mode). */
export const listSearch = {
	searchBuckets,
	searchDatabases,
	searchDedicatedDatabases,
	searchDocumentsDbCollections,
	searchDocumentsDbDatabases,
	searchFiles,
	searchFunctions,
	searchProviders,
	searchSites,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
	searchVectorsDbCollections,
	searchVectorsDbDatabases,
	searchWebhooks,
};

/** The dropdowns whose options load from Appwrite. */
export const loadOptions = {
	getAvailablePostgresqlExtensions,
	getColumns,
	getFrameworks,
	getInstalledPostgresqlExtensions,
	getRuntimes,
	getSiteBuildRuntimes,
};
