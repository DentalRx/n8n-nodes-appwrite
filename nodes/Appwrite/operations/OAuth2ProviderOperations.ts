import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { OAuth2Provider } from '../descriptions/oauth2Providers';
import { OAUTH2_PROVIDERS } from '../descriptions/oauth2Providers';
import { getManyByOffset, lookupEnum, parseStringList, toItems } from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

const PROVIDERS: Record<string, OAuth2Provider> = Object.fromEntries(
	OAUTH2_PROVIDERS.map((provider) => [provider.value, provider]),
);

export async function executeOAuth2ProviderOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const provider = (): OAuth2Provider =>
		lookupEnum(
			this,
			PROVIDERS,
			this.getNodeParameter('oauth2Provider', i) as string,
			'OAuth2 provider',
			i,
		);

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/project/oauth2/${encodeURIComponent(provider().value)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const providers = await getManyByOffset.call(
			this,
			async (queries) =>
				await appwriteApiRequest.call(this, 'GET', '/project/oauth2', { qs: { queries } }, i),
			'providers',
			i,
		);
		return toItems(providers, i);
	}

	if (operation === 'update') {
		const selected = provider();
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		// Only the selected provider's own fields are read, under the body keys
		// its endpoint expects; a field the user did not add keeps its value.
		const body: IDataObject = {};
		for (const field of selected.fields) {
			const value = updateFields[field.property.name];
			if (value === undefined) continue;
			body[field.body] = field.list
				? parseStringList.call(this, value as string, field.property.displayName, i)
				: value;
		}
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/project/oauth2/${encodeURIComponent(selected.value)}`,
			{ body },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown OAuth2 provider operation "${operation}"`, {
		itemIndex: i,
	});
}
