import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Compression, ID, Query, type Storage } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	parseJsonArrayParameter,
} from '../GenericFunctions';

const COMPRESSION_MAP: Record<string, Compression> = {
	gzip: Compression.Gzip,
	none: Compression.None,
	zstd: Compression.Zstd,
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
	storage: Storage,
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

	const getBucketOptionArgs = () => {
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
		const rawBucketId = this.getNodeParameter('bucketId', i, '') as string;
		const bucketId = rawBucketId === '' || rawBucketId === 'unique()' ? ID.unique() : rawBucketId;
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const response = await storage.createBucket({
			bucketId,
			name,
			permissions,
			...getBucketOptionArgs(),
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'get') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		const response = await storage.getBucket({ bucketId });
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const buckets = await fetchAllPages(
				queries,
				async (pageQueries) =>
					(await storage.listBuckets({
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'buckets',
			);
			return toItems(buckets as unknown as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await storage.listBuckets({
			queries: [...queries, Query.limit(limit)],
			search: searchArg,
		});
		return toItems(response.buckets as unknown as IDataObject[]);
	}

	if (operation === 'update') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const response = await storage.updateBucket({
			bucketId,
			name,
			permissions,
			...getBucketOptionArgs(),
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'delete') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		await storage.deleteBucket({ bucketId });
		return toItems({ success: true, bucketId });
	}

	throw new NodeOperationError(this.getNode(), `Unknown bucket operation "${operation}"`, {
		itemIndex: i,
	});
}
