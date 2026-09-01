import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { stripHexHash } from '../GenericFunctions';
import { appwriteApiRequestBinary } from '../transport';

/** Browser codes Appwrite serves an icon for. */
const BROWSER_CODES = new Set([
	'aa',
	'an',
	'ch',
	'ci',
	'cm',
	'cr',
	'ff',
	'mf',
	'oi',
	'om',
	'on',
	'op',
	'ps',
	'sf',
]);

/** Credit card codes Appwrite serves an icon for. */
const CREDIT_CARD_CODES = new Set([
	'amex',
	'argencard',
	'cabal',
	'cencosud',
	'diners',
	'discover',
	'elo',
	'hipercard',
	'jcb',
	'maestro',
	'mastercard',
	'mir',
	'naranja',
	'rupay',
	'targeta-shopping',
	'unionpay',
	'visa',
]);

interface ImageOptions {
	width?: number;
	height?: number;
	quality?: number;
}

export async function executeAvatarOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toBinaryItem = async (
		content: Buffer,
		fileName: string,
		json: IDataObject,
		mimeType = 'image/png',
	): Promise<INodeExecutionData[]> => {
		const outputBinaryField = this.getNodeParameter('outputBinaryField', i, 'data') as string;
		const binary = await this.helpers.prepareBinaryData(content, fileName, mimeType);
		return [
			{
				json,
				binary: { [outputBinaryField]: binary },
				pairedItem: { item: i },
			},
		];
	};

	const getImage = async (path: string, qs: IDataObject): Promise<Buffer> =>
		await appwriteApiRequestBinary.call(this, 'GET', path, { qs }, i);

	if (operation === 'getBrowser' || operation === 'getCreditCard') {
		const isBrowser = operation === 'getBrowser';
		const code = this.getNodeParameter(isBrowser ? 'browserCode' : 'creditCardCode', i) as string;
		const options = this.getNodeParameter('options', i, {}) as ImageOptions;

		const allowed = isBrowser ? BROWSER_CODES : CREDIT_CARD_CODES;
		if (!allowed.has(code)) {
			throw new NodeOperationError(
				this.getNode(),
				`Unknown ${isBrowser ? 'browser' : 'credit card'} code "${code}"`,
				{
					description: `Expected one of: ${[...allowed].sort().join(', ')}.`,
					itemIndex: i,
				},
			);
		}

		const content = await getImage(
			`/avatars/${isBrowser ? 'browsers' : 'credit-cards'}/${encodeURIComponent(code)}`,
			{ width: options.width, height: options.height, quality: options.quality },
		);
		return await toBinaryItem(content, `${isBrowser ? 'browser' : 'card'}-${code}.png`, {
			code,
			...options,
		});
	}

	if (operation === 'getFavicon') {
		const url = this.getNodeParameter('url', i) as string;
		const content = await getImage('/avatars/favicon', { url });
		// The favicon endpoint returns ICO and SVG favicons unconverted; sniff
		// the bytes so the binary metadata matches the actual content.
		let fileName = 'favicon.png';
		let mimeType = 'image/png';
		if (content.length >= 4 && content.readUInt32LE(0) === 0x00010000) {
			fileName = 'favicon.ico';
			mimeType = 'image/x-icon';
		} else if (content.subarray(0, 256).toString('utf8').trimStart().startsWith('<')) {
			fileName = 'favicon.svg';
			mimeType = 'image/svg+xml';
		}
		return await toBinaryItem(content, fileName, { url }, mimeType);
	}

	if (operation === 'getFlag') {
		const code = this.getNodeParameter('countryCode', i) as string;
		const options = this.getNodeParameter('options', i, {}) as ImageOptions;
		const content = await getImage(`/avatars/flags/${encodeURIComponent(code)}`, {
			width: options.width,
			height: options.height,
			quality: options.quality,
		});
		return await toBinaryItem(content, `flag-${code}.png`, { code, ...options });
	}

	if (operation === 'getImage') {
		const url = this.getNodeParameter('url', i) as string;
		const options = this.getNodeParameter('options', i, {}) as ImageOptions;
		const content = await getImage('/avatars/image', {
			url,
			width: options.width,
			height: options.height,
		});
		return await toBinaryItem(content, 'image.png', { url, ...options });
	}

	if (operation === 'getInitials') {
		const name = this.getNodeParameter('name', i, '') as string;
		const options = this.getNodeParameter('options', i, {}) as {
			width?: number;
			height?: number;
			background?: string;
		};
		const content = await getImage('/avatars/initials', {
			name: name === '' ? undefined : name,
			width: options.width,
			height: options.height,
			background: stripHexHash(options.background),
		});
		return await toBinaryItem(content, 'initials.png', { name, ...options });
	}

	if (operation === 'getQr') {
		const text = this.getNodeParameter('text', i) as string;
		const options = this.getNodeParameter('options', i, {}) as {
			size?: number;
			margin?: number;
		};
		const content = await getImage('/avatars/qr', {
			text,
			size: options.size,
			margin: options.margin,
		});
		return await toBinaryItem(content, 'qr.png', { text, ...options });
	}

	throw new NodeOperationError(this.getNode(), `Unknown avatar operation "${operation}"`, {
		itemIndex: i,
	});
}
