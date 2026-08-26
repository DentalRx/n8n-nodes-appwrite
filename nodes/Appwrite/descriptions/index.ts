import type { INodeProperties } from 'n8n-workflow';

import { avatarFields, avatarOperations } from './AvatarDescription';
import { bucketFields, bucketOperations } from './BucketDescription';
import { columnFields, columnOperations } from './ColumnDescription';
import { databaseFields, databaseOperations } from './DatabaseDescription';
import { executionFields, executionOperations } from './ExecutionDescription';
import { fileFields, fileOperations } from './FileDescription';
import { functionFields, functionOperations } from './FunctionDescription';
import { healthFields, healthOperations } from './HealthDescription';
import { indexFields, indexOperations } from './IndexDescription';
import { localeFields, localeOperations } from './LocaleDescription';
import { messageFields, messageOperations } from './MessageDescription';
import { rowFields, rowOperations } from './RowDescription';
import { tableFields, tableOperations } from './TableDescription';
import { teamFields, teamOperations } from './TeamDescription';
import { tokenFields, tokenOperations } from './TokenDescription';
import { topicFields, topicOperations } from './TopicDescription';
import { transactionFields, transactionOperations } from './TransactionDescription';
import { userFields, userOperations } from './UserDescription';

const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Avatar',
			value: 'avatar',
			description: 'Generate icons, flags, QR codes, and initials images',
		},
		{
			name: 'Bucket',
			value: 'bucket',
			description: 'Manage storage buckets',
		},
		{
			name: 'Column',
			value: 'column',
			description: 'Manage table columns (formerly attributes)',
		},
		{
			name: 'Database',
			value: 'database',
			description: 'Manage databases',
		},
		{
			name: 'Execution',
			value: 'execution',
			description: 'Run Appwrite Functions and inspect their executions',
		},
		{
			name: 'File',
			value: 'file',
			description: 'Upload, download, and manage storage files',
		},
		{
			name: 'Function',
			value: 'function',
			description: 'Manage Appwrite Functions, their deployments, and variables',
		},
		{
			name: 'Health',
			value: 'health',
			description: 'Check the health of the Appwrite instance',
		},
		{
			name: 'Index',
			value: 'index',
			description: 'Manage table indexes',
		},
		{
			name: 'Locale',
			value: 'locale',
			description: 'Look up locale data such as countries, currencies, and languages',
		},
		{
			name: 'Message',
			value: 'message',
			description: 'Send email, SMS, and push messages',
		},
		{
			name: 'Row',
			value: 'row',
			description: 'Manage table rows (formerly documents)',
		},
		{
			name: 'Table',
			value: 'table',
			description: 'Manage tables (formerly collections)',
		},
		{
			name: 'Team',
			value: 'team',
			description: 'Manage teams and their memberships',
		},
		{
			name: 'Token',
			value: 'token',
			description: 'Manage file access tokens',
		},
		{
			name: 'Topic',
			value: 'topic',
			description: 'Manage messaging topics and subscribers',
		},
		{
			name: 'Transaction',
			value: 'transaction',
			description: 'Manage database transactions',
		},
		{
			name: 'User',
			value: 'user',
			description: 'Manage user accounts',
		},
	],
	default: 'row',
};

export const properties: INodeProperties[] = [
	resourceProperty,
	...avatarOperations,
	...bucketOperations,
	...columnOperations,
	...databaseOperations,
	...executionOperations,
	...fileOperations,
	...functionOperations,
	...healthOperations,
	...indexOperations,
	...localeOperations,
	...messageOperations,
	...rowOperations,
	...tableOperations,
	...teamOperations,
	...tokenOperations,
	...topicOperations,
	...transactionOperations,
	...userOperations,
	...avatarFields,
	...bucketFields,
	...columnFields,
	...databaseFields,
	...executionFields,
	...fileFields,
	...functionFields,
	...healthFields,
	...indexFields,
	...localeFields,
	...messageFields,
	...rowFields,
	...tableFields,
	...teamFields,
	...tokenFields,
	...topicFields,
	...transactionFields,
	...userFields,
];
