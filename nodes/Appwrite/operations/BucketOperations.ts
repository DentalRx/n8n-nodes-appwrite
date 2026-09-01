import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	lookupEnum,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The compression algorithms Appwrite accepts, keyed by the value the UI stores. */
const COMPRESSION_MAP: Record<string, string> = {
	gzip: 'gzip',
	none: 'none',
	zstd: 'zstd',
};

/** The bucket-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'enabled',
	'fileSecurity',
	'maximumFileSize',
	'allowedFileExtensions',
	'compression',
	'encryption',
	'antivirus',
	'transformations',
];

interface BucketOptions {
	allowedFileExtensions?: string;
	antivirus?: boolean;
	compression?: string;
	enabled?: boolean;
	encryption?: boolean;
	fileSecurity?: boolean;
	maximumFileSize?: number;
	transformations?: boolean;
}

export async function executeBucketOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const getBucketOptionArgs = (current?: IDataObject): IDataObject => {
		const options = this.getNodeParameter('options', i, {}) as BucketOptions;
		// An option the user never added keeps whatever the bucket already has
		// (`current` is set on update only); an option added and left blank clears it.
		const extensions =
			options.allowedFileExtensions === undefined
				? (current?.allowedFileExtensions as string[] | undefined)
				: parseStringList.call(this, options.allowedFileExtensions, 'Allowed File Extensions', i);

		return {
			fileSecurity: options.fileSecurity ?? (current?.fileSecurity as boolean | undefined),
			enabled: options.enabled ?? (current?.enabled as boolean | undefined),
			maximumFileSize: options.maximumFileSize ?? (current?.maximumFileSize as number | undefined),
			allowedFileExtensions:
				extensions !== undefined && extensions.length > 0 ? extensions : undefined,
			compression: options.compression
				? lookupEnum(this, COMPRESSION_MAP, options.compression, 'compression algorithm', i)
				: (current?.compression as string | undefined),
			encryption: options.encryption ?? (current?.encryption as boolean | undefined),
			antivirus: options.antivirus ?? (current?.antivirus as boolean | undefined),
			transformations: options.transformations ?? (current?.transformations as boolean | undefined),
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
		return toItems(response, i);
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
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		return toItems(simplify ? simplifyItems(response, SIMPLIFY_FIELDS) : response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		const project = (buckets: IDataObject[]) =>
			simplify ? (simplifyItems(buckets, SIMPLIFY_FIELDS) as IDataObject[]) : buckets;

		if (returnAll) {
			const buckets = await fetchAllPages.call(
				this,
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
				i,
			);
			return toItems(project(buckets as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/storage/buckets',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(project(response.buckets as IDataObject[]), i);
	}

	if (operation === 'update') {
		const bucketId = extractId(this.getNodeParameter('bucketId', i) as string, 'bucket');
		const name = this.getNodeParameter('name', i) as string;
		const permissions = getPermissions.call(this, i);
		// PUT /storage/buckets/{id} is a full replace: any setting left out of the
		// body is reset to the API's own default rather than kept, so renaming a
		// bucket would clear its extension allowlist and reset File Security.
		// Read the bucket first and resend the settings the user did not touch.
		const current = await appwriteApiRequest.call(
			this,
			'GET',
			`/storage/buckets/${encodeURIComponent(bucketId)}`,
			{},
			i,
		);
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`/storage/buckets/${encodeURIComponent(bucketId)}`,
			{ body: { name, permissions, ...getBucketOptionArgs(current) } },
			i,
		);
		return toItems(response, i);
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
		return toItems({ deleted: true, bucketId }, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown bucket operation "${operation}"`, {
		itemIndex: i,
	});
}
