import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Compression, type Models, type Storage } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	lookupEnum,
	parseStringList,
	resolveId,
	toItems,
	withLimit,
} from '../GenericFunctions';

const COMPRESSION_MAP: Record<string, Compression> = {
	gzip: Compression.Gzip,
	none: Compression.None,
	zstd: Compression.Zstd,
};

type Bucket = Models.Bucket;

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
	const getBucketOptionArgs = (current?: Bucket) => {
		const options = this.getNodeParameter('options', i, {}) as BucketOptions;
		const extensions = parseStringList.call(
			this,
			options.allowedFileExtensions ?? '',
			'allowedFileExtensions',
			i,
		);
		const allowedFileExtensions =
			options.allowedFileExtensions === undefined ? current?.allowedFileExtensions : extensions;
		return {
			fileSecurity: options.fileSecurity ?? current?.fileSecurity,
			enabled: options.enabled ?? current?.enabled,
			maximumFileSize: options.maximumFileSize ?? current?.maximumFileSize,
			allowedFileExtensions:
				allowedFileExtensions !== undefined && allowedFileExtensions.length > 0
					? allowedFileExtensions
					: undefined,
			compression: options.compression
				? lookupEnum(this, COMPRESSION_MAP, options.compression, 'compression algorithm', i)
				: (current?.compression as Compression | undefined),
			encryption: options.encryption ?? current?.encryption,
			antivirus: options.antivirus ?? current?.antivirus,
		};
	};

	if (operation === 'create') {
		const rawBucketId = this.getNodeParameter('bucketId', i, '') as string;
		const bucketId = resolveId(rawBucketId);
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		const response = await storage.createBucket({
			bucketId,
			name,
			permissions,
			...getBucketOptionArgs(),
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'get') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		const response = await storage.getBucket({ bucketId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const buckets = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await storage.listBuckets({
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'buckets',
			);
			return toItems(buckets as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await storage.listBuckets({
			queries: withLimit(queries, limit),
			search: searchArg,
		});
		return toItems(response.buckets as unknown as IDataObject[], i);
	}

	if (operation === 'update') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		// Appwrite's bucket update is a full replace: any setting left out of the
		// request is reset to the API's own default rather than kept. Read the
		// bucket first so options the user did not touch survive the update.
		const current = await storage.getBucket({ bucketId });
		const response = await storage.updateBucket({
			bucketId,
			name,
			permissions,
			...getBucketOptionArgs(current),
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		const bucketId = this.getNodeParameter('bucketId', i) as string;
		await storage.deleteBucket({ bucketId });
		return toItems({ success: true, bucketId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown bucket operation "${operation}"`, {
		itemIndex: i,
	});
}
