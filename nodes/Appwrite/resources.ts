import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { avatarFields, avatarOperations } from './descriptions/AvatarDescription';
import { bucketFields, bucketOperations } from './descriptions/BucketDescription';
import { columnFields, columnOperations } from './descriptions/ColumnDescription';
import { databaseFields, databaseOperations } from './descriptions/DatabaseDescription';
import { executionFields, executionOperations } from './descriptions/ExecutionDescription';
import { fileFields, fileOperations } from './descriptions/FileDescription';
import { functionFields, functionOperations } from './descriptions/FunctionDescription';
import { healthFields, healthOperations } from './descriptions/HealthDescription';
import { indexFields, indexOperations } from './descriptions/IndexDescription';
import { localeFields, localeOperations } from './descriptions/LocaleDescription';
import { messageFields, messageOperations } from './descriptions/MessageDescription';
import { rowFields, rowOperations } from './descriptions/RowDescription';
import { tableFields, tableOperations } from './descriptions/TableDescription';
import { teamFields, teamOperations } from './descriptions/TeamDescription';
import { tokenFields, tokenOperations } from './descriptions/TokenDescription';
import { topicFields, topicOperations } from './descriptions/TopicDescription';
import { transactionFields, transactionOperations } from './descriptions/TransactionDescription';
import { userFields, userOperations } from './descriptions/UserDescription';
import { executeAvatarOperation } from './operations/AvatarOperations';
import { executeBucketOperation } from './operations/BucketOperations';
import { executeColumnOperation } from './operations/ColumnOperations';
import { executeDatabaseOperation } from './operations/DatabaseOperations';
import { executeExecutionOperation } from './operations/ExecutionOperations';
import { executeFileOperation } from './operations/FileOperations';
import { executeFunctionOperation } from './operations/FunctionOperations';
import { executeHealthOperation } from './operations/HealthOperations';
import { executeIndexOperation } from './operations/IndexOperations';
import { executeLocaleOperation } from './operations/LocaleOperations';
import { executeMessageOperation } from './operations/MessageOperations';
import { executeRowOperation } from './operations/RowOperations';
import { executeTableOperation } from './operations/TableOperations';
import { executeTeamOperation } from './operations/TeamOperations';
import { executeTokenOperation } from './operations/TokenOperations';
import { executeTopicOperation } from './operations/TopicOperations';
import { executeTransactionOperation } from './operations/TransactionOperations';
import { executeUserOperation } from './operations/UserOperations';

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
			name: 'Avatar',
			value: 'avatar',
			description: 'Generate icons, flags, QR codes, and initials images',
		},
		operations: avatarOperations,
		fields: avatarFields,
		execute: executeAvatarOperation,
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
