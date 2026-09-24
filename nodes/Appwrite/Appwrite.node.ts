import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { listSearch, loadOptions } from './methods';
import { getExecutor, properties } from './resources';

export class Appwrite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Appwrite',
		name: 'appwrite',
		icon: { light: 'file:appwrite.svg', dark: 'file:appwrite.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Interact with the Appwrite API: databases, storage, functions, sites, auth, messaging, and project settings',
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

	methods = { listSearch, loadOptions };

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

	const execute = getExecutor(resource);
	if (execute === undefined) {
		throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
			itemIndex: i,
		});
	}
	return await execute.call(this, operation, i);
}
