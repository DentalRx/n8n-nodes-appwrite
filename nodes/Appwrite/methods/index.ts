import {
	searchBuckets,
	searchDatabases,
	searchDedicatedDatabases,
	searchFiles,
	searchFunctions,
	searchProviders,
	searchSites,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
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
	searchFiles,
	searchFunctions,
	searchProviders,
	searchSites,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
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
