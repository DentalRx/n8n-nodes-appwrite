import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { properties } from './descriptions';
import {
	getBuckets,
	getColumns,
	getDatabases,
	getFunctions,
	getRuntimes,
	getTables,
	getTeams,
	getTopics,
	getUsers,
} from './methods/loadOptions';
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

export class Appwrite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Appwrite',
		name: 'appwrite',
		icon: { light: 'file:appwrite.svg', dark: 'file:appwrite.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Interact with the Appwrite API: databases with tables and rows, storage, functions, users, teams, and messaging',
		// Declared here rather than in a sibling Appwrite.node.json: the n8n CLI's
		// build step only copies images into dist/, so a codex file would never
		// reach the published package. The inline field carries the same data.
		codex: {
			categories: ['Development'],
			resources: {
				credentialDocumentation: [{ url: 'https://appwrite.io/docs/advanced/platform/api-keys' }],
				primaryDocumentation: [{ url: 'https://appwrite.io/docs' }],
			},
		},
		defaults: {
			name: 'Appwrite',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'appwriteApi',
				required: true,
			},
		],
		properties,
	};

	methods = {
		loadOptions: {
			getBuckets,
			getColumns,
			getDatabases,
			getFunctions,
			getRuntimes,
			getTables,
			getTeams,
			getTopics,
			getUsers,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const continueOnFail = this.continueOnFail();

		for (let i = 0; i < items.length; i++) {
			// Read per item: resource may be driven by an expression, just as
			// operation already is.
			const resource = this.getNodeParameter('resource', i) as string;

			if (!continueOnFail) {
				push(returnData, await runOperation.call(this, resource, i));
				continue;
			}

			try {
				push(returnData, await runOperation.call(this, resource, i));
			} catch (error) {
				const json: IDataObject = {
					error: error instanceof Error ? error.message : String(error),
				};
				// A NodeApiError's message is n8n's generic status text; Appwrite's
				// own message lives in `description`, so keep both on the error item
				// (plus the status code) for downstream error-handling branches.
				if (error instanceof NodeApiError) {
					if (error.description) json.description = error.description;
					if (error.httpCode) json.httpCode = error.httpCode;
				}
				returnData.push({ json, pairedItem: { item: i } });
			}
		}

		return [returnData];
	}
}

/**
 * Append results in place. Spreading them as arguments instead would throw a
 * RangeError once a Return All result set exceeds the engine's argument limit.
 */
function push(target: INodeExecutionData[], results: INodeExecutionData[]): void {
	for (const result of results) target.push(result);
}

/**
 * Dispatch one input item to the operations module for the selected resource.
 */
async function runOperation(
	this: IExecuteFunctions,
	resource: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', i) as string;

	switch (resource) {
		case 'avatar':
			return await executeAvatarOperation.call(this, operation, i);
		case 'bucket':
			return await executeBucketOperation.call(this, operation, i);
		case 'column':
			return await executeColumnOperation.call(this, operation, i);
		case 'database':
			return await executeDatabaseOperation.call(this, operation, i);
		case 'execution':
			return await executeExecutionOperation.call(this, operation, i);
		case 'file':
			return await executeFileOperation.call(this, operation, i);
		case 'function':
			return await executeFunctionOperation.call(this, operation, i);
		case 'health':
			return await executeHealthOperation.call(this, operation, i);
		case 'index':
			return await executeIndexOperation.call(this, operation, i);
		case 'locale':
			return await executeLocaleOperation.call(this, operation, i);
		case 'message':
			return await executeMessageOperation.call(this, operation, i);
		case 'row':
			return await executeRowOperation.call(this, operation, i);
		case 'table':
			return await executeTableOperation.call(this, operation, i);
		case 'team':
			return await executeTeamOperation.call(this, operation, i);
		case 'token':
			return await executeTokenOperation.call(this, operation, i);
		case 'topic':
			return await executeTopicOperation.call(this, operation, i);
		case 'transaction':
			return await executeTransactionOperation.call(this, operation, i);
		case 'user':
			return await executeUserOperation.call(this, operation, i);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
				itemIndex: i,
			});
	}
}
