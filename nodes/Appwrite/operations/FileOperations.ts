import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ImageFormat, ImageGravity, type Storage } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

import {
	buildQueries,
	fetchAllPages,
	getPermissions,
	lookupEnum,
	resolveId,
	stripHexHash,
	toItems,
	withLimit,
} from '../GenericFunctions';

const IMAGE_GRAVITY_MAP: Record<string, ImageGravity> = {
	bottom: ImageGravity.Bottom,
	'bottom-left': ImageGravity.Bottomleft,
	'bottom-right': ImageGravity.Bottomright,
	center: ImageGravity.Center,
	left: ImageGravity.Left,
	right: ImageGravity.Right,
	top: ImageGravity.Top,
	'top-left': ImageGravity.Topleft,
	'top-right': ImageGravity.Topright,
};

const IMAGE_FORMAT_MAP: Record<string, ImageFormat> = {
	avif: ImageFormat.Avif,
	gif: ImageFormat.Gif,
	heic: ImageFormat.Heic,
	jpeg: ImageFormat.Jpeg,
	jpg: ImageFormat.Jpg,
	png: ImageFormat.Png,
	webp: ImageFormat.Webp,
};

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
	storage: Storage,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const bucketId = this.getNodeParameter('bucketId', i) as string;

	const toBinaryItem = async (
		arrayBuffer: ArrayBuffer,
		fileId: string,
		mimeTypeOverride?: string,
		fileExtensionOverride?: string,
	): Promise<INodeExecutionData[]> => {
		const meta = await storage.getFile({ bucketId, fileId });
		const outputBinaryField = this.getNodeParameter('outputBinaryField', i, 'data') as string;
		const fileName = fileExtensionOverride
			? `${meta.name.replace(/\.[^.]+$/, '')}.${fileExtensionOverride}`
			: meta.name;
		const binary = await this.helpers.prepareBinaryData(
			Buffer.from(arrayBuffer),
			fileName,
			mimeTypeOverride ?? meta.mimeType,
		);
		return [
			{
				json: meta as unknown as IDataObject,
				binary: { [outputBinaryField]: binary },
				pairedItem: { item: i },
			},
		];
	};

	if (operation === 'upload') {
		const rawFileId = this.getNodeParameter('fileId', i, '') as string;
		const fileId = resolveId(rawFileId);
		const binaryPropertyName = this.getNodeParameter('inputBinaryField', i) as string;
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		const fileName =
			(this.getNodeParameter('fileName', i, '') as string) || binaryData.fileName || 'file';
		const file = InputFile.fromBuffer(buffer, fileName);
		const permissions = getPermissions.call(this, i);
		const response = await storage.createFile({ bucketId, fileId, file, permissions });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'get') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const response = await storage.getFile({ bucketId, fileId });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = this.getNodeParameter('search', i, '') as string;
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const files = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await storage.listFiles({
						bucketId,
						queries: pageQueries,
						search: searchArg,
					})) as unknown as IDataObject,
				'files',
			);
			return toItems(files as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await storage.listFiles({
			bucketId,
			queries: withLimit(queries, limit),
			search: searchArg,
		});
		return toItems(response.files as unknown as IDataObject[], i);
	}

	if (operation === 'update') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const name = this.getNodeParameter('name', i, '') as string;
		const permissions = getPermissions.call(this, i);
		const response = await storage.updateFile({
			bucketId,
			fileId,
			name: name === '' ? undefined : name,
			permissions,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		await storage.deleteFile({ bucketId, fileId });
		return toItems({ success: true, bucketId, fileId }, i);
	}

	if (operation === 'download' || operation === 'getView') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const options = this.getNodeParameter('options', i, {}) as { token?: string };
		const token = options.token === '' ? undefined : options.token;
		const arrayBuffer =
			operation === 'download'
				? await storage.getFileDownload({ bucketId, fileId, token })
				: await storage.getFileView({ bucketId, fileId, token });
		return await toBinaryItem(arrayBuffer, fileId);
	}

	if (operation === 'getPreview') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const options = this.getNodeParameter('options', i, {}) as PreviewOptions;
		const output = options.output
			? lookupEnum(this, IMAGE_FORMAT_MAP, options.output, 'image format', i)
			: undefined;
		const arrayBuffer = await storage.getFilePreview({
			bucketId,
			fileId,
			width: options.width,
			height: options.height,
			gravity: options.gravity
				? lookupEnum(this, IMAGE_GRAVITY_MAP, options.gravity, 'image gravity', i)
				: undefined,
			quality: options.quality,
			borderWidth: options.borderWidth,
			borderColor: stripHexHash(options.borderColor),
			borderRadius: options.borderRadius,
			opacity: options.opacity,
			rotation: options.rotation,
			background: stripHexHash(options.background),
			output,
			token: options.token === '' ? undefined : options.token,
		});
		const mimeType = output ? `image/${output === ImageFormat.Jpg ? 'jpeg' : output}` : undefined;
		return await toBinaryItem(arrayBuffer, fileId, mimeType, output);
	}

	throw new NodeOperationError(this.getNode(), `Unknown file operation "${operation}"`, {
		itemIndex: i,
	});
}
