import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { activityFields, activityOperations } from './descriptions/ActivityDescription';
import { advisorFields, advisorOperations } from './descriptions/AdvisorDescription';
import { avatarFields, avatarOperations } from './descriptions/AvatarDescription';
import { backupFields, backupOperations } from './descriptions/BackupDescription';
import { bucketFields, bucketOperations } from './descriptions/BucketDescription';
import { columnFields, columnOperations } from './descriptions/ColumnDescription';
import { databaseFields, databaseOperations } from './descriptions/DatabaseDescription';
import { embeddingFields, embeddingOperations } from './descriptions/EmbeddingDescription';
	},
	{
		option: {
import {
	dedicatedDatabaseFields,
	dedicatedDatabaseOperations,
} from './descriptions/DedicatedDatabaseDescription';
import { executionFields, executionOperations } from './descriptions/ExecutionDescription';
import { fileFields, fileOperations } from './descriptions/FileDescription';
import { functionFields, functionOperations } from './descriptions/FunctionDescription';
import { graphqlFields, graphqlOperations } from './descriptions/GraphqlDescription';
import { healthFields, healthOperations } from './descriptions/HealthDescription';
import { indexFields, indexOperations } from './descriptions/IndexDescription';
import { localeFields, localeOperations } from './descriptions/LocaleDescription';
import { messageFields, messageOperations } from './descriptions/MessageDescription';
import { presenceFields, presenceOperations } from './descriptions/PresenceDescription';
import { providerFields, providerOperations } from './descriptions/ProviderDescription';
import { rowFields, rowOperations } from './descriptions/RowDescription';
import { siteFields, siteOperations } from './descriptions/SiteDescription';
import { tableFields, tableOperations } from './descriptions/TableDescription';
import { teamFields, teamOperations } from './descriptions/TeamDescription';
import { tokenFields, tokenOperations } from './descriptions/TokenDescription';
import { topicFields, topicOperations } from './descriptions/TopicDescription';
import { transactionFields, transactionOperations } from './descriptions/TransactionDescription';
import { userFields, userOperations } from './descriptions/UserDescription';
import { webhookFields, webhookOperations } from './descriptions/WebhookDescription';
import { executeActivityOperation } from './operations/ActivityOperations';
import { executeAdvisorOperation } from './operations/AdvisorOperations';
import { executeAvatarOperation } from './operations/AvatarOperations';
import { executeBackupOperation } from './operations/BackupOperations';
import { executeBucketOperation } from './operations/BucketOperations';
import { executeColumnOperation } from './operations/ColumnOperations';
import { executeDatabaseOperation } from './operations/DatabaseOperations';
import { executeDedicatedDatabaseOperation } from './operations/DedicatedDatabaseOperations';
import { executeEmbeddingOperation } from './operations/EmbeddingOperations';
import { executeExecutionOperation } from './operations/ExecutionOperations';
import { executeFileOperation } from './operations/FileOperations';
import { executeFunctionOperation } from './operations/FunctionOperations';
import { executeGraphqlOperation } from './operations/GraphqlOperations';
import { executeHealthOperation } from './operations/HealthOperations';
import { executeIndexOperation } from './operations/IndexOperations';
import { executeLocaleOperation } from './operations/LocaleOperations';
import { executeMessageOperation } from './operations/MessageOperations';
import { executePresenceOperation } from './operations/PresenceOperations';
import { executeProviderOperation } from './operations/ProviderOperations';
import { executeRowOperation } from './operations/RowOperations';
import { executeSiteOperation } from './operations/SiteOperations';
import { executeTableOperation } from './operations/TableOperations';
import { executeTeamOperation } from './operations/TeamOperations';
import { executeTokenOperation } from './operations/TokenOperations';
import { executeTopicOperation } from './operations/TopicOperations';
import { executeTransactionOperation } from './operations/TransactionOperations';
import { executeUserOperation } from './operations/UserOperations';
import { executeWebhookOperation } from './operations/WebhookOperations';

/** Runs one operation of a resource for one input item. */
export type OperationExecutor = (
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
) => Promise<INodeExecutionData[]>;

interface ResourceDefinition {
	/** The Resource dropdown entry. */
	option: INodePropertyOptions & { value: string };
	/** The resource's Operation dropdown. */
	operations: INodeProperties[];
	/** Every other parameter the resource's operations show. */
	fields: INodeProperties[];
	execute: OperationExecutor;
}

/**
 * Every resource the node offers. Adding a resource means adding its entry
 * here: the Resource dropdown, the parameter list and the execute dispatch are
 * all derived from this table.
 */
const RESOURCES: ResourceDefinition[] = [
	{
		option: {
			name: 'Activity',
			value: 'activity',
			description:
				"Read the project's audit trail, which replaces the user logs removed in Appwrite 2.2",
		},
		operations: activityOperations,
		fields: activityFields,
		execute: executeActivityOperation,
	},
	{
		option: {
			name: 'Advisor',
			value: 'advisor',
			description: "Read Advisor's analysis reports and the insights they contain",
		},
		operations: advisorOperations,
		fields: advisorFields,
		execute: executeAdvisorOperation,
	},
	{
		option: {
			name: 'Avatar',
			value: 'avatar',
			description:
				'Generate icons, flags, QR codes, initials, user photos, and webpage screenshots',
		},
		operations: avatarOperations,
		fields: avatarFields,
		execute: executeAvatarOperation,
	},
	{
		option: {
			name: 'Backup',
			value: 'backup',
			description:
				'Manage backup policies, archives, and restorations (Appwrite Cloud, Pro plan and above)',
		},
		operations: backupOperations,
		fields: backupFields,
		execute: executeBackupOperation,
	},
	{
		option: { name: 'Bucket', value: 'bucket', description: 'Manage storage buckets' },
		operations: bucketOperations,
		fields: bucketFields,
		execute: executeBucketOperation,
	},
	{
		option: {
			name: 'Column',
			value: 'column',
			description: 'Manage table columns (formerly attributes)',
		},
		operations: columnOperations,
		fields: columnFields,
		execute: executeColumnOperation,
	},
	{
		option: { name: 'Database', value: 'database', description: 'Manage databases' },
		operations: databaseOperations,
		fields: databaseFields,
		execute: executeDatabaseOperation,
	},
	{
		option: {
			name: 'Dedicated Database',
			value: 'dedicatedDatabase',
			description: 'Manage native MongoDB, MySQL, and PostgreSQL databases, and run SQL on them',
		},
		operations: dedicatedDatabaseOperations,
		fields: dedicatedDatabaseFields,
		execute: executeDedicatedDatabaseOperation,
	},
	{
		option: {
			name: 'Embedding',
			value: 'embedding',
			description: 'Generate vector embeddings from text',
		},
		operations: embeddingOperations,
		fields: embeddingFields,
		execute: executeEmbeddingOperation,
	},
	{
		option: {
			name: 'Execution',
			value: 'execution',
			description: 'Run Appwrite Functions and inspect their executions',
		},
		operations: executionOperations,
		fields: executionFields,
		execute: executeExecutionOperation,
	},
	{
		option: {
			name: 'File',
			value: 'file',
			description: 'Upload, download, and manage storage files',
		},
		operations: fileOperations,
		fields: fileFields,
		execute: executeFileOperation,
	},
	{
		option: {
			name: 'Function',
			value: 'function',
			description: 'Manage Appwrite Functions, their deployments, and variables',
		},
		operations: functionOperations,
		fields: functionFields,
		execute: executeFunctionOperation,
	},
	{
		option: {
			name: 'GraphQL',
			value: 'graphql',
			description: "Run GraphQL queries and mutations against the project's API",
		},
		operations: graphqlOperations,
		fields: graphqlFields,
		execute: executeGraphqlOperation,
	},
	{
		option: {
			name: 'Health',
			value: 'health',
			description: 'Check the health of the Appwrite instance',
		},
		operations: healthOperations,
		fields: healthFields,
		execute: executeHealthOperation,
	},
	{
		option: { name: 'Index', value: 'index', description: 'Manage table indexes' },
		operations: indexOperations,
		fields: indexFields,
		execute: executeIndexOperation,
	},
	{
		option: {
			name: 'Locale',
			value: 'locale',
			description: 'Look up locale data such as countries, currencies, and languages',
		},
		operations: localeOperations,
		fields: localeFields,
		execute: executeLocaleOperation,
	},
	{
		option: {
			name: 'Message',
			value: 'message',
			description: 'Send email, SMS, and push messages',
		},
		operations: messageOperations,
		fields: messageFields,
		execute: executeMessageOperation,
	},
	{
		option: {
			name: 'Presence',
			value: 'presence',
			description: 'Read and remove the real-time presence of users',
		},
		operations: presenceOperations,
		fields: presenceFields,
		execute: executePresenceOperation,
	},
	{
		option: {
			name: 'Provider',
			value: 'provider',
			description: 'Manage the email, SMS, and push providers Messaging sends through',
		},
		operations: providerOperations,
		fields: providerFields,
		execute: executeProviderOperation,
	},
	{
		option: {
			name: 'Row',
			value: 'row',
			description: 'Manage table rows (formerly documents)',
		},
		operations: rowOperations,
		fields: rowFields,
		execute: executeRowOperation,
	},
	{
		option: {
			name: 'Site',
			value: 'site',
			description: 'Manage Appwrite Sites, their deployments, logs, and variables',
		},
		operations: siteOperations,
		fields: siteFields,
		execute: executeSiteOperation,
	},
	{
		option: {
			name: 'Table',
			value: 'table',
			description: 'Manage tables (formerly collections)',
		},
		operations: tableOperations,
		fields: tableFields,
		execute: executeTableOperation,
	},
	{
		option: {
			name: 'Team',
			value: 'team',
			description: 'Manage teams and their memberships',
		},
		operations: teamOperations,
		fields: teamFields,
		execute: executeTeamOperation,
	},
	{
		option: { name: 'Token', value: 'token', description: 'Manage file access tokens' },
		operations: tokenOperations,
		fields: tokenFields,
		execute: executeTokenOperation,
	},
	{
		option: {
			name: 'Topic',
			value: 'topic',
			description: 'Manage messaging topics and subscribers',
		},
		operations: topicOperations,
		fields: topicFields,
		execute: executeTopicOperation,
	},
	{
		option: {
			name: 'Transaction',
			value: 'transaction',
			description: 'Manage database transactions',
		},
		operations: transactionOperations,
		fields: transactionFields,
		execute: executeTransactionOperation,
	},
	{
		option: { name: 'User', value: 'user', description: 'Manage user accounts' },
		operations: userOperations,
		fields: userFields,
		execute: executeUserOperation,
	},
	{
		option: {
			name: 'Webhook',
			value: 'webhook',
			description: 'Manage webhooks that send project events to other services',
		},
		operations: webhookOperations,
		fields: webhookFields,
		execute: executeWebhookOperation,
	},
];

const byName = (a: ResourceDefinition, b: ResourceDefinition): number =>
	a.option.name.localeCompare(b.option.name);

const sorted = [...RESOURCES].sort(byName);

const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: sorted.map((resource) => resource.option),
	default: 'row',
};

/** The node's full parameter list: Resource, every Operation dropdown, then every field. */
export const properties: INodeProperties[] = [
	resourceProperty,
	...sorted.flatMap((resource) => resource.operations),
	...sorted.flatMap((resource) => resource.fields),
];

const executors = new Map<string, OperationExecutor>(
	RESOURCES.map((resource) => [resource.option.value, resource.execute]),
);

/** The operations module for a resource, or undefined for an unknown resource. */
export function getExecutor(resource: string): OperationExecutor | undefined {
	return executors.get(resource);
}
