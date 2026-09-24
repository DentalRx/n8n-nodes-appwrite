import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages, toItems, withLimit } from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

export async function executeProjectVariableOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: create and the list operation act on no existing variable.
	const variableId = (): string => {
		const id = (this.getNodeParameter('variableId', i) as string).trim();
		if (id === '') {
			throw new NodeOperationError(this.getNode(), "The 'Variable ID' parameter is empty", {
				description: 'Enter the ID of the project variable to use.',
				itemIndex: i,
			});
		}
		return id;
	};
	const variablePath = (): string => `/project/variables/${encodeURIComponent(variableId())}`;

	if (operation === 'create') {
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/project/variables',
			{
				body: {
					variableId: resolveId(this.getNodeParameter('variableId', i, '') as string),
					key: this.getNodeParameter('key', i) as string,
					value: this.getNodeParameter('value', i) as string,
					secret: this.getNodeParameter('secret', i, true) as boolean,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(this, 'DELETE', variablePath(), {}, i);
		return toItems({ deleted: true, variableId: variableId() }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', variablePath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const variables = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/project/variables',
						{ qs: { queries: pageQueries } },
						i,
					),
				'variables',
				i,
			);
			return toItems(variables as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/project/variables',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.variables as IDataObject[], i);
	}

	if (operation === 'update') {
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			key?: string;
			secret?: boolean;
			value?: string;
		};
		// Appwrite changes only what is sent, and refuses a request that sends nothing.
		if (Object.keys(updateFields).length === 0) {
			throw new NodeOperationError(this.getNode(), 'No fields to update were added', {
				description: "Add at least one field under 'Update Fields'.",
				itemIndex: i,
			});
		}
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			variablePath(),
			{ body: { key: updateFields.key, value: updateFields.value, secret: updateFields.secret } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unknown project variable operation "${operation}"`,
		{
			itemIndex: i,
		},
	);
}
