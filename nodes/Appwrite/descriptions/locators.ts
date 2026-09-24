import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

import type { DocumentDatabaseType } from '../helpers/documentDatabases';

/**
 * Resource locators for the Appwrite records a user picks rather than types:
 * each offers a searchable From List mode (the default, as the n8n UX
 * guidelines ask), an ID mode, and a By URL mode that accepts a link copied
 * out of the Appwrite Console, whose path carries IDs as `<kind>-<id>`
 * segments (e.g. `.../databases/database-main/table-orders`) or, on a few
 * pages, as a bare segment (e.g. `.../settings/webhooks/order-sync`).
 */
export interface LocatorOptions {
	/** Parameter name, e.g. `databaseId`. */
	name: string;
	/** Label, e.g. `Database`. */
	displayName: string;
	/** The Console URL segment prefix that carries the ID, e.g. `database`. */
	kind: string;
	/**
	 * For Console pages that carry the ID as a bare segment instead of as
	 * `<kind>-<id>`: the path segment right before the ID, e.g. `webhooks` for
	 * `.../settings/webhooks/<id>`.
	 */
	urlSegment?: string;
	/** The listSearch method that fills the From List mode. */
	searchListMethod: string;
	/** Example ID for the ID mode's placeholder. */
	placeholder: string;
	/**
	 * Example Console URL for the By URL mode's placeholder. Leave it out for
	 * records the Console gives no page of their own (a proxy rule, a firewall
	 * rule): the locator then offers only From List and ID.
	 */
	urlPlaceholder?: string;
	/** Parameters the list depends on, e.g. `['databaseId.value']`. */
	dependsOn?: string[];
	description?: string;
	hint?: string;
	required?: boolean;
}

/** Appwrite IDs: up to 36 characters of a-z, A-Z, 0-9, period, hyphen and underscore. */
const ID_PATTERN = '[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}';

export function resourceLocator(
	options: LocatorOptions,
	show: IDisplayOptions['show'],
): INodeProperties {
	const idPrefix = options.urlSegment === undefined ? `${options.kind}-` : `${options.urlSegment}/`;
	const property: INodeProperties = {
		displayName: options.displayName,
		name: options.name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: options.required ?? true,
		...(options.description ? { description: options.description } : {}),
		...(options.hint ? { hint: options.hint } : {}),
		...(options.dependsOn ? { typeOptions: { loadOptionsDependsOn: options.dependsOn } } : {}),
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: options.searchListMethod,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: options.urlPlaceholder,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: `^https?://.*/${idPrefix}${ID_PATTERN}(?:[/?#].*)?$`,
							errorMessage: `Not a valid Appwrite Console ${options.displayName.toLowerCase()} URL`,
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: `/${idPrefix}(${ID_PATTERN})(?:[/?#]|$)`,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: options.placeholder,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: `^${ID_PATTERN}$`,
							errorMessage: `Not a valid Appwrite ${options.displayName.toLowerCase()} ID`,
						},
					},
				],
			},
		],
		displayOptions: { show },
	};
	// A record the Console gives no page of its own has no URL to paste.
	if (options.urlPlaceholder === undefined) {
		property.modes = property.modes?.filter((mode) => mode.name !== 'url');
	}
	return property;
}

const CONSOLE = 'https://cloud.appwrite.io/console/project-fra-myproject';

export const appLocator = (
	show: IDisplayOptions['show'],
	overrides: Partial<Pick<LocatorOptions, 'description'>> = {},
): INodeProperties =>
	resourceLocator(
		{
			name: 'appId',
			displayName: 'App',
			kind: 'app',
			searchListMethod: 'searchApps',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			description: 'The app to use',
			...overrides,
		},
		show,
	);

export const databaseLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'databaseId',
			displayName: 'Database',
			kind: 'database',
			searchListMethod: 'searchDatabases',
			placeholder: 'e.g. main',
			urlPlaceholder: `e.g. ${CONSOLE}/databases/database-main`,
			description: 'The database to use',
		},
		show,
	);

export const tableLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'tableId',
			displayName: 'Table',
			kind: 'table',
			searchListMethod: 'searchTables',
			placeholder: 'e.g. orders',
			urlPlaceholder: `e.g. ${CONSOLE}/databases/database-main/table-orders`,
			dependsOn: ['databaseId.value'],
			description: 'The table to use',
			hint: 'A table is what Appwrite used to call a collection',
		},
		show,
	);

/**
 * Database picker for DocumentsDB and VectorsDB. It shares `databaseId` with
 * the TablesDB picker, but lists the databases of its own type.
 */
export const documentDatabaseLocator = (
	type: DocumentDatabaseType,
	show: IDisplayOptions['show'],
): INodeProperties =>
	resourceLocator(
		{
			name: 'databaseId',
			displayName: 'Database',
			kind: 'database',
			searchListMethod: type.searchMethods.databases,
			placeholder: 'e.g. main',
			urlPlaceholder: `e.g. ${CONSOLE}/databases/database-main`,
			description: `The ${type.label} database to use`,
		},
		show,
	);

export const collectionLocator = (
	type: DocumentDatabaseType,
	show: IDisplayOptions['show'],
): INodeProperties =>
	resourceLocator(
		{
			name: 'collectionId',
			displayName: 'Collection',
			kind: 'collection',
			searchListMethod: type.searchMethods.collections,
			placeholder: 'e.g. articles',
			urlPlaceholder: `e.g. ${CONSOLE}/databases/database-main/collection-articles`,
			dependsOn: ['databaseId.value'],
			description: `The ${type.label} collection to use`,
		},
		show,
	);

export const bucketLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'bucketId',
			displayName: 'Bucket',
			kind: 'bucket',
			searchListMethod: 'searchBuckets',
			placeholder: 'e.g. avatars',
			urlPlaceholder: `e.g. ${CONSOLE}/storage/bucket-avatars`,
			description: 'The storage bucket to use',
		},
		show,
	);

export const fileLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'fileId',
			displayName: 'File',
			kind: 'file',
			searchListMethod: 'searchFiles',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			urlPlaceholder: `e.g. ${CONSOLE}/storage/bucket-avatars/file-6650f1a2003e4b5c6d7e`,
			dependsOn: ['bucketId.value'],
			description: 'The file to use',
		},
		show,
	);

export const functionLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'functionId',
			displayName: 'Function',
			kind: 'function',
			searchListMethod: 'searchFunctions',
			placeholder: 'e.g. send-welcome-email',
			urlPlaceholder: `e.g. ${CONSOLE}/functions/function-send-welcome-email`,
			description: 'The function to use',
		},
		show,
	);

export const siteLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'siteId',
			displayName: 'Site',
			kind: 'site',
			searchListMethod: 'searchSites',
			placeholder: 'e.g. marketing-site',
			urlPlaceholder: `e.g. ${CONSOLE}/sites/site-marketing-site`,
			description: 'The site to use',
		},
		show,
	);

export const proxyRuleLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'proxyRuleId',
			displayName: 'Proxy Rule',
			kind: 'rule',
			searchListMethod: 'searchProxyRules',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			description: 'The proxy rule to use, listed by its domain',
		},
		show,
	);

export const wafRuleLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'wafRuleId',
			displayName: 'Firewall Rule',
			kind: 'rule',
			searchListMethod: 'searchWafRules',
			placeholder: 'e.g. block-admin-paths',
			description: 'The firewall rule to use',
		},
		show,
	);

export const teamLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'teamId',
			displayName: 'Team',
			kind: 'team',
			searchListMethod: 'searchTeams',
			placeholder: 'e.g. editors',
			urlPlaceholder: `e.g. ${CONSOLE}/auth/teams/team-editors`,
			description: 'The team to use',
		},
		show,
	);

export const providerLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'providerId',
			displayName: 'Provider',
			kind: 'provider',
			searchListMethod: 'searchProviders',
			placeholder: 'e.g. transactional-email',
			urlPlaceholder: `e.g. ${CONSOLE}/messaging/providers/provider-transactional-email`,
			description: 'The messaging provider to use',
		},
		show,
	);

export const topicLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'topicId',
			displayName: 'Topic',
			kind: 'topic',
			searchListMethod: 'searchTopics',
			placeholder: 'e.g. newsletter',
			urlPlaceholder: `e.g. ${CONSOLE}/messaging/topics/topic-newsletter`,
			description: 'The messaging topic to use',
		},
		show,
	);

export const userLocator = (
	show: IDisplayOptions['show'],
	overrides: Partial<Pick<LocatorOptions, 'description' | 'hint' | 'required'>> = {},
): INodeProperties =>
	resourceLocator(
		{
			name: 'userId',
			displayName: 'User',
			kind: 'user',
			searchListMethod: 'searchUsers',
			placeholder: 'e.g. 6650f1a2003e4b5c6d7e',
			urlPlaceholder: `e.g. ${CONSOLE}/auth/user-6650f1a2003e4b5c6d7e`,
			description: 'The user to use',
			...overrides,
		},
		show,
	);

export const webhookLocator = (show: IDisplayOptions['show']): INodeProperties =>
	resourceLocator(
		{
			name: 'webhookId',
			displayName: 'Webhook',
			kind: 'webhook',
			urlSegment: 'webhooks',
			searchListMethod: 'searchWebhooks',
			placeholder: 'e.g. order-sync',
			urlPlaceholder: `e.g. ${CONSOLE}/settings/webhooks/order-sync`,
			description: 'The webhook to use',
		},
		show,
	);
