import type { IDataObject, IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { parseJsonParameter, toItems } from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

export async function executeGraphqlOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'executeMutation' || operation === 'executeQuery') {
		const document = this.getNodeParameter('graphqlQuery', i) as string;
		const options = this.getNodeParameter('options', i, {}) as {
			operationName?: string;
			variables?: unknown;
		};
		const variables = parseJsonParameter.call(this, options.variables, 'Variables', i);

		const request: IDataObject = { query: document };
		if (Object.keys(variables).length > 0) request.variables = variables;
		if (options.operationName) request.operationName = options.operationName;

		// Send the request the way Appwrite's SDKs do: wrapped in a `query`
		// object and flagged with the x-sdk-graphql header. That is the body
		// Appwrite's API description documents; without the header Appwrite
		// would read the body's top-level keys as the GraphQL request instead.
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			operation === 'executeMutation' ? '/graphql/mutation' : '/graphql',
			{ body: { query: request }, headers: { 'x-sdk-graphql': 'true' } },
			i,
		);

		// GraphQL answers with HTTP 200 even when the request failed, listing
		// what went wrong in `errors`, often with no data at all. Stop the item
		// rather than pass an empty result downstream as if it had succeeded.
		const reported = response.errors;
		if (Array.isArray(reported) && reported.length > 0) {
			const messages = reported.map((entry) => {
				const message = (entry as IDataObject | null)?.message;
				return typeof message === 'string' ? message : JSON.stringify(entry);
			});
			throw new NodeApiError(this.getNode(), response as JsonObject, {
				message: messages[0],
				description:
					messages.length > 1
						? `Appwrite reported ${messages.length} issues: ${messages.join(' | ')}`
						: 'Appwrite reported this in the GraphQL response. Check the document, its variables, and the scopes of the API key.',
				itemIndex: i,
			});
		}

		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown GraphQL operation "${operation}"`, {
		itemIndex: i,
	});
}
