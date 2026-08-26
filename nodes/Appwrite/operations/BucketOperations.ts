import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	parseJsonArrayParameter,
} from '../GenericFunctions';
import { Query, extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The compression algorithms Appwrite accepts, keyed by the value the UI stores. */
const COMPRESSION_MAP: Record<string, string> = {
	gzip: 'gzip',
	none: 'none',
	zstd: 'zstd',
};

interface BucketOptions {
	allowedFileExtensions?: string;
	antivirus?: boolean;
	compression?: string;
	enabled?: boolean;
	encryption?: boolean;
	fileSecurity?: boolean;
	maximumFileSize?: number;
}

export async function executeBucketOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	const parseList = (raw: string, name: string): string[] => {
		if (raw.trim() === '') return [];
		if (raw.trim().startsWith('[')) {
			return parseJsonArrayParameter.call(this, raw, name, i).map((e) => String(e));
		}
		return raw
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e !== '');
	};

	const getBucketOptionArgs = (): IDataObject => {
		const options = this.getNodeParameter('options', i, {}) as BucketOptions;
		const allowedFileExtensions = parseList(
			options.allowedFileExtensions ?? '',
			'allowedFileExtensions',
		);
		return {
			fileSecurity: options.fileSecurity,
			enabled: options.enabled,
			maximumFileSize: options.maximumFileSize,
			allowedFileExtensions: allowedFileExtensions.length > 0 ? allowedFileExtensions : undefined,
			compression: options.compression ? COMPRESSION_MAP[options.compression] : undefined,
			encryption: options.encryption,
			antivirus: options.antivirus,
		};
	};

	if (operation === 'create') {
		const bucketId = resolveId(this.getNodeParameter('bucketId', i, '') as string);
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/storage/buckets',
			{ body: { bucketId, name, permissions, ...getBucketOptionArgs() } },
			i,
		);
		return toItems(response);
	}

	if (operation === 'get') {
		const bucketId = extractId(this.getNodeParameter('bucketId', i) as string, 'bucket');
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/storage/buckets/${encodeURIComponent(bucketId)}`,
			{},
			i,
		);
		return toItems(response);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const buckets = await fetchAllPages(
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/storage/buckets',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'buckets',
			);
			return toItems(buckets as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/storage/buckets',
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		);
		return toItems(response.buckets as IDataObject[]);
	}

	if (operation === 'update') {
		const bucketId = extractId(this.getNodeParameter('bucketId', i) as string, 'bucket');
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`/storage/buckets/${encodeURIComponent(bucketId)}`,
			{ body: { name, permissions, ...getBucketOptionArgs() } },
			i,
		);
		return toItems(response);
	}

	if (operation === 'delete') {
		const bucketId = extractId(this.getNodeParameter('bucketId', i) as string, 'bucket');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/storage/buckets/${encodeURIComponent(bucketId)}`,
			{},
			i,
		);
		return toItems({ success: true, bucketId });
	}

	throw new NodeOperationError(this.getNode(), `Unknown bucket operation "${operation}"`, {
		itemIndex: i,
	});
}
