import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import {
	Avatars,
	Functions,
	Health,
	Locale,
	Messaging,
	Storage,
	TablesDB,
	Teams,
	Tokens,
	Users,
} from 'node-appwrite';

import { getAppwriteClient } from './GenericFunctions';
import { properties } from './descriptions';
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
		icon: 'file:appwrite.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Interact with the Appwrite API: databases with tables and rows, storage, functions, users, teams, and messaging',
		defaults: {
			name: 'Appwrite',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'appwriteApi',
				required: true,
			},
		],
		properties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const client = await getAppwriteClient.call(this);
		const resource = this.getNodeParameter('resource', 0) as string;

		const tablesDB = new TablesDB(client);
		const storage = new Storage(client);
		const functions = new Functions(client);
		const users = new Users(client);
		const teams = new Teams(client);
		const messaging = new Messaging(client);
		const locale = new Locale(client);
		const health = new Health(client);
		const avatars = new Avatars(client);
		const tokens = new Tokens(client);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let results: INodeExecutionData[];
				switch (resource) {
					case 'avatar':
						results = await executeAvatarOperation.call(this, avatars, operation, i);
						break;
					case 'bucket':
						results = await executeBucketOperation.call(this, storage, operation, i);
						break;
					case 'column':
						results = await executeColumnOperation.call(this, tablesDB, operation, i);
						break;
					case 'database':
						results = await executeDatabaseOperation.call(this, tablesDB, operation, i);
						break;
					case 'execution':
						results = await executeExecutionOperation.call(this, functions, operation, i);
						break;
					case 'file':
						results = await executeFileOperation.call(this, storage, operation, i);
						break;
					case 'function':
						results = await executeFunctionOperation.call(this, functions, operation, i);
						break;
					case 'health':
						results = await executeHealthOperation.call(this, health, operation, i);
						break;
					case 'index':
						results = await executeIndexOperation.call(this, tablesDB, operation, i);
						break;
					case 'locale':
						results = await executeLocaleOperation.call(this, locale, operation, i);
						break;
					case 'message':
						results = await executeMessageOperation.call(this, messaging, operation, i);
						break;
					case 'row':
						results = await executeRowOperation.call(this, tablesDB, operation, i);
						break;
					case 'table':
						results = await executeTableOperation.call(this, tablesDB, operation, i);
						break;
					case 'team':
						results = await executeTeamOperation.call(this, teams, operation, i);
						break;
					case 'token':
						results = await executeTokenOperation.call(this, tokens, operation, i);
						break;
					case 'topic':
						results = await executeTopicOperation.call(this, messaging, operation, i);
						break;
					case 'transaction':
						results = await executeTransactionOperation.call(this, tablesDB, operation, i);
						break;
					case 'user':
						results = await executeUserOperation.call(this, users, operation, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
							itemIndex: i,
						});
				}

				returnData.push(...results);
			} catch (error) {
				if (this.continueOnFail()) {
					const message = error instanceof Error ? error.message : String(error);
					returnData.push({
						json: { error: message },
						pairedItem: { item: i },
					});
					continue;
				}

				if (error instanceof NodeOperationError || error instanceof NodeApiError) {
					throw error;
				}

				const apiError = error as { message?: string; code?: number; type?: string };
				throw new NodeApiError(
					this.getNode(),
					{
						message: apiError.message ?? String(error),
						code: apiError.code,
						type: apiError.type,
					} as JsonObject,
					{ itemIndex: i },
				);
			}
		}

		return [returnData];
	}
}
