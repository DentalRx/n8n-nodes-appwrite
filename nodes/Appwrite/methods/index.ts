import {
	searchBuckets,
	searchDatabases,
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
import { getColumns, getFrameworks, getRuntimes, getSiteBuildRuntimes } from './loadOptions';

/** The pickers behind the node's resource locators (From List mode). */
export const listSearch = {
	searchBuckets,
	searchDatabases,
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
	getColumns,
	getFrameworks,
	getRuntimes,
	getSiteBuildRuntimes,
};
