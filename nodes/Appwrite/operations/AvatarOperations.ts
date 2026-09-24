import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import {
	getOptionalResourceId,
	lookupEnum,
	parseJsonParameter,
	stripHexHash,
} from '../GenericFunctions';
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

/** The MIME type of each format a user photo can be returned in. */
const PHOTO_FORMATS: Record<string, string> = {
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
};

/** The MIME type of each format a screenshot can be returned in. */
const SCREENSHOT_FORMATS: Record<string, string> = {
	avif: 'image/avif',
	gif: 'image/gif',
	heic: 'image/heic',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
};

interface ImageOptions {
	width?: number;
	height?: number;
	quality?: number;
}

interface ScreenshotOptions extends ImageOptions {
	accuracy?: number;
	browserPermissions?: string[];
	fullpage?: boolean;
	headers?: unknown;
	latitude?: number;
	locale?: string;
	longitude?: number;
	output?: string;
	scale?: number;
	sleep?: number;
	theme?: string;
	timezone?: string;
	touch?: boolean;
	userAgent?: string;
	viewportHeight?: number;
	viewportWidth?: number;
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

	if (operation === 'getPhoto') {
		const userId = getOptionalResourceId.call(this, 'userId', i, 'user');
		const email = (this.getNodeParameter('email', i, '') as string).trim();
		const name = this.getNodeParameter('name', i, '') as string;
		// Appwrite falls back to the signed-in user when none of these is set,
		// but an API key has no user, so the request could only return the
		// generic placeholder image.
		if (userId === '' && email === '' && name === '') {
			throw new NodeOperationError(this.getNode(), 'No user, email, or name to get a photo for', {
				description: 'Set at least one of User, Email, or Name.',
				itemIndex: i,
			});
		}

		const options = this.getNodeParameter('options', i, {}) as ImageOptions & {
			output?: string;
			rating?: string;
		};
		const output = options.output || 'png';
		const mimeType = lookupEnum(this, PHOTO_FORMATS, output, 'output format', i);
		const content = await getImage('/avatars/photo', {
			userId: userId === '' ? undefined : userId,
			// Appwrite only accepts the email as the SHA-256 hash of its trimmed,
			// lowercased form, so the address itself never appears in a URL.
			emailHash:
				email === '' ? undefined : createHash('sha256').update(email.toLowerCase()).digest('hex'),
			name: name === '' ? undefined : name,
			width: options.width,
			height: options.height,
			quality: options.quality,
			output: options.output,
			rating: options.rating,
		});
		return await toBinaryItem(
			content,
			`photo.${output}`,
			{ userId, email, name, ...options },
			mimeType,
		);
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

	if (operation === 'getScreenshot') {
		const url = this.getNodeParameter('url', i) as string;
		// The headers can carry credentials for the captured page, so they are
		// sent but kept out of the output item.
		const { headers: rawHeaders, ...options } = this.getNodeParameter(
			'options',
			i,
			{},
		) as ScreenshotOptions;
		const headers = parseJsonParameter.call(this, rawHeaders, 'Headers', i);
		const output = options.output || 'png';
		const mimeType = lookupEnum(this, SCREENSHOT_FORMATS, output, 'output format', i);
		const permissions = options.browserPermissions ?? [];
		const content = await getImage('/avatars/screenshots', {
			url,
			headers: Object.keys(headers).length > 0 ? headers : undefined,
			viewportWidth: options.viewportWidth,
			viewportHeight: options.viewportHeight,
			scale: options.scale,
			theme: options.theme,
			userAgent: options.userAgent || undefined,
			fullpage: options.fullpage,
			locale: options.locale || undefined,
			timezone: options.timezone || undefined,
			latitude: options.latitude,
			longitude: options.longitude,
			accuracy: options.accuracy,
			touch: options.touch,
			permissions: permissions.length > 0 ? permissions : undefined,
			sleep: options.sleep,
			width: options.width,
			height: options.height,
			quality: options.quality,
			output: options.output,
		});
		return await toBinaryItem(content, `screenshot.${output}`, { url, ...options }, mimeType);
	}

	throw new NodeOperationError(this.getNode(), `Unknown avatar operation "${operation}"`, {
		itemIndex: i,
	});
}
