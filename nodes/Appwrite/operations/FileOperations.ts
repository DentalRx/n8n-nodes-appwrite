import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	simplifyItems,
	stripHexHash,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { extractId, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest, appwriteApiRequestBinary, appwriteFileUpload } from '../transport';

/** Crop positions Appwrite accepts for a preview. The UI stores the wire value directly. */
const IMAGE_GRAVITIES = new Set([
	'bottom',
	'bottom-left',
	'bottom-right',
	'center',
	'left',
	'right',
	'top',
	'top-left',
	'top-right',
]);

/** Output formats Appwrite can convert a preview to. The UI stores the wire value directly. */
const IMAGE_FORMATS = new Set(['avif', 'gif', 'heic', 'jpeg', 'jpg', 'png', 'webp']);

/** The file-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'bucketId',
	'name',
	'mimeType',
	'sizeOriginal',
	'$createdAt',
	'$updatedAt',
];

interface PreviewOptions {
	background?: string;
	borderColor?: string;
	borderRadius?: number;
	borderWidth?: number;
	gravity?: string;
	height?: number;
	opacity?: number;
	output?: string;
	quality?: number;
	rotation?: number;
	token?: string;
	width?: number;
}

export async function executeFileOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const bucketId = extractId(this.getNodeParameter('bucketId', i) as string, 'bucket');
	const filesPath = `/storage/buckets/${encodeURIComponent(bucketId)}/files`;

	const toBinaryItem = async (
		content: Buffer,
		fileId: string,
		mimeTypeOverride?: string,
		fileExtensionOverride?: string,
	): Promise<INodeExecutionData[]> => {
		const meta = await appwriteApiRequest.call(
			this,
			'GET',
			`${filesPath}/${encodeURIComponent(fileId)}`,
			{},
			i,
		);
		const outputBinaryField = this.getNodeParameter('outputBinaryField', i, 'data') as string;
		const name = meta.name as string;
		const fileName = fileExtensionOverride
			? `${name.replace(/\.[^.]+$/, '')}.${fileExtensionOverride}`
			: name;
		const binary = await this.helpers.prepareBinaryData(
			content,
			fileName,
			mimeTypeOverride ?? (meta.mimeType as string),
		);
		return [
			{
				json: meta,
				binary: { [outputBinaryField]: binary },
				pairedItem: { item: i },
			},
		];
	};

	if (operation === 'upload') {
		const fileId = resolveId(this.getNodeParameter('fileId', i, '') as string);
		const binaryPropertyName = this.getNodeParameter('inputBinaryField', i) as string;
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		const fileName =
			(this.getNodeParameter('fileName', i, '') as string) || binaryData.fileName || 'file';
		const permissions = getPermissions.call(this, i);

		const fields: Array<[string, string]> = [['fileId', fileId]];
		for (const permission of permissions ?? []) {
			fields.push(['permissions[]', permission]);
		}

		const response = await appwriteFileUpload.call(
			this,
			filesPath,
			{
				content: buffer,
				filename: fileName,
				contentType: binaryData.mimeType || 'application/octet-stream',
			},
			fields,
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'get') {
		const fileId = extractId(this.getNodeParameter('fileId', i) as string, 'file');
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${filesPath}/${encodeURIComponent(fileId)}`,
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
		const project = (files: IDataObject[]) =>
			simplify ? (simplifyItems(files, SIMPLIFY_FIELDS) as IDataObject[]) : files;

		if (returnAll) {
			const files = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						filesPath,
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'files',
				i,
			);
			return toItems(project(files as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			filesPath,
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(project(response.files as IDataObject[]), i);
	}

	if (operation === 'update') {
		const fileId = extractId(this.getNodeParameter('fileId', i) as string, 'file');
		const name = this.getNodeParameter('fileName', i, '') as string;
		const permissions = getPermissions.call(this, i);
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${filesPath}/${encodeURIComponent(fileId)}`,
			{ body: { name: name === '' ? undefined : name, permissions } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const fileId = extractId(this.getNodeParameter('fileId', i) as string, 'file');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${filesPath}/${encodeURIComponent(fileId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, bucketId, fileId }, i);
	}

	if (operation === 'download' || operation === 'getView') {
		const fileId = extractId(this.getNodeParameter('fileId', i) as string, 'file');
		const options = this.getNodeParameter('options', i, {}) as { token?: string };
		const token = options.token === '' ? undefined : options.token;
		const content = await appwriteApiRequestBinary.call(
			this,
			'GET',
			`${filesPath}/${encodeURIComponent(fileId)}/${
				operation === 'download' ? 'download' : 'view'
			}`,
			{ qs: { token } },
			i,
		);
		return await toBinaryItem(content, fileId);
	}

	if (operation === 'getPreview') {
		const fileId = extractId(this.getNodeParameter('fileId', i) as string, 'file');
		const options = this.getNodeParameter('options', i, {}) as PreviewOptions;

		const output = options.output || undefined;
		if (output !== undefined && !IMAGE_FORMATS.has(output)) {
			throw new NodeOperationError(this.getNode(), `Unknown output format "${output}"`, {
				description: `Expected one of: ${[...IMAGE_FORMATS].sort().join(', ')}.`,
				itemIndex: i,
			});
		}
		const gravity = options.gravity || undefined;
		if (gravity !== undefined && !IMAGE_GRAVITIES.has(gravity)) {
			throw new NodeOperationError(this.getNode(), `Unknown crop gravity "${gravity}"`, {
				description: `Expected one of: ${[...IMAGE_GRAVITIES].sort().join(', ')}.`,
				itemIndex: i,
			});
		}

		const content = await appwriteApiRequestBinary.call(
			this,
			'GET',
			`${filesPath}/${encodeURIComponent(fileId)}/preview`,
			{
				qs: {
					width: options.width,
					height: options.height,
					gravity,
					quality: options.quality,
					borderWidth: options.borderWidth,
					borderColor: stripHexHash(options.borderColor),
					borderRadius: options.borderRadius,
					opacity: options.opacity,
					rotation: options.rotation,
					background: stripHexHash(options.background),
					output,
					token: options.token === '' ? undefined : options.token,
				},
			},
			i,
		);

		const mimeType = output ? `image/${output === 'jpg' ? 'jpeg' : output}` : undefined;
		return await toBinaryItem(content, fileId, mimeType, output);
	}

	throw new NodeOperationError(this.getNode(), `Unknown file operation "${operation}"`, {
		itemIndex: i,
	});
}
