import {
	searchBuckets,
	searchDatabases,
	searchFiles,
	searchFunctions,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
} from './listSearch';
import { getColumns, getRuntimes } from './loadOptions';

/** The pickers behind the node's resource locators (From List mode). */
export const listSearch = {
	searchBuckets,
	searchDatabases,
	searchFiles,
	searchFunctions,
	searchTables,
	searchTeams,
	searchTopics,
	searchUsers,
};

/** The dropdowns whose options load from Appwrite. */
export const loadOptions = {
	getColumns,
	getRuntimes,
};
