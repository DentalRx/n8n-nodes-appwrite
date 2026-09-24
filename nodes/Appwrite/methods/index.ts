import {
	searchApps,
	searchBuckets,
	searchDatabases,
	searchDedicatedDatabases,
	searchDocumentsDbCollections,
	searchDocumentsDbDatabases,
	searchFiles,
	searchFunctions,
	searchProviders,
	searchProxyRules,
	searchSites,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
	searchVectorsDbCollections,
	searchVectorsDbDatabases,
	searchWafRules,
	searchWebhooks,
} from './listSearch';
import {
	getAppInstallationScopes,
	getAvailablePostgresqlExtensions,
	getColumns,
	getFrameworks,
	getInstalledPostgresqlExtensions,
	getRuntimes,
	getSiteBuildRuntimes,
} from './loadOptions';

/** The pickers behind the node's resource locators (From List mode). */
export const listSearch = {
	searchApps,
	searchBuckets,
	searchDatabases,
	searchDedicatedDatabases,
	searchDocumentsDbCollections,
	searchDocumentsDbDatabases,
	searchFiles,
	searchFunctions,
	searchProviders,
	searchProxyRules,
	searchSites,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
	searchVectorsDbCollections,
	searchVectorsDbDatabases,
	searchWafRules,
	searchWebhooks,
};

/** The dropdowns whose options load from Appwrite. */
export const loadOptions = {
	getAppInstallationScopes,
	getAvailablePostgresqlExtensions,
	getColumns,
	getFrameworks,
	getInstalledPostgresqlExtensions,
	getRuntimes,
	getSiteBuildRuntimes,
};
