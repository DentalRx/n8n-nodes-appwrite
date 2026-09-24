import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { PlatformType } from '../descriptions/PlatformDescription';
import { PLATFORM_TYPES } from '../descriptions/PlatformDescription';
import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	lookupEnum,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

const TYPES: Record<string, PlatformType> = Object.fromEntries(
	PLATFORM_TYPES.map((type) => [type.value, type]),
);

export async function executePlatformOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: create and the list operation act on no existing platform.
	const platformId = (): string =>
		getResourceId.call(this, 'platformId', i, 'platform', 'Platform');
	const platformType = (): PlatformType =>
		lookupEnum(this, TYPES, this.getNodeParameter('platformType', i) as string, 'platform type', i);

	if (operation === 'create') {
		const type = platformType();
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`/project/platforms/${type.value}`,
			{
				body: {
					platformId: resolveId(this.getNodeParameter('platformId', i, '') as string),
					name: this.getNodeParameter('name', i) as string,
					[type.identifier.body]: this.getNodeParameter('platformIdentifier', i) as string,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const id = platformId();
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/project/platforms/${encodeURIComponent(id)}`,
			{},
			i,
		);
		return toItems({ deleted: true, platformId: id }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/project/platforms/${encodeURIComponent(platformId())}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const platforms = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/project/platforms',
						{ qs: { queries: pageQueries } },
						i,
					),
				'platforms',
				i,
			);
			return toItems(platforms as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/project/platforms',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.platforms as IDataObject[], i);
	}

	if (operation === 'update') {
		const type = platformType();
		const id = encodeURIComponent(platformId());
		const updateFields = this.getNodeParameter('updateFields', i, {}) as {
			name?: string;
			platformIdentifier?: string;
		};
		// The update endpoints require both the name and the identifier, so read
		// the platform first and resend whichever the user did not change.
		const current = await appwriteApiRequest.call(this, 'GET', `/project/platforms/${id}`, {}, i);
		if (typeof current.type === 'string' && current.type !== type.value && current.type in TYPES) {
			throw new NodeOperationError(
				this.getNode(),
				`The platform is a ${TYPES[current.type].name} platform, not ${type.name}`,
				{
					description: `Set 'Platform Type' to ${TYPES[current.type].name}.`,
					itemIndex: i,
				},
			);
		}
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`/project/platforms/${type.value}/${id}`,
			{
				body: {
					name: updateFields.name ?? current.name,
					[type.identifier.body]: updateFields.platformIdentifier ?? current[type.identifier.body],
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown platform operation "${operation}"`, {
		itemIndex: i,
	});
}
