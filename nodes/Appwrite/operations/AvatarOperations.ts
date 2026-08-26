import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Browser, CreditCard, type Avatars, type Flag } from 'node-appwrite';

const BROWSER_MAP: Record<string, Browser> = {
	aa: Browser.AvantBrowser,
	an: Browser.AndroidWebViewBeta,
	ch: Browser.GoogleChrome,
	ci: Browser.GoogleChromeIOS,
	cm: Browser.GoogleChromeMobile,
	cr: Browser.Chromium,
	ff: Browser.MozillaFirefox,
	mf: Browser.MobileSafari,
	oi: Browser.MicrosoftEdgeIOS,
	om: Browser.OperaMini,
	on: Browser.OperaNext,
	op: Browser.Opera,
	ps: Browser.MicrosoftEdge,
	sf: Browser.Safari,
};

const CREDIT_CARD_MAP: Record<string, CreditCard> = {
	amex: CreditCard.AmericanExpress,
	argencard: CreditCard.Argencard,
	cabal: CreditCard.Cabal,
	cencosud: CreditCard.Cencosud,
	diners: CreditCard.DinersClub,
	discover: CreditCard.Discover,
	elo: CreditCard.Elo,
	hipercard: CreditCard.Hipercard,
	jcb: CreditCard.JCB,
	maestro: CreditCard.Maestro,
	mastercard: CreditCard.Mastercard,
	mir: CreditCard.MIR,
	naranja: CreditCard.Naranja,
	rupay: CreditCard.Rupay,
	'targeta-shopping': CreditCard.TarjetaShopping,
	unionpay: CreditCard.UnionPay,
	visa: CreditCard.Visa,
};

interface ImageOptions {
	width?: number;
	height?: number;
	quality?: number;
}

export async function executeAvatarOperation(
	this: IExecuteFunctions,
	avatars: Avatars,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toBinaryItem = async (
		arrayBuffer: ArrayBuffer,
		fileName: string,
		json: IDataObject,
		mimeType = 'image/png',
	): Promise<INodeExecutionData[]> => {
		const outputBinaryField = this.getNodeParameter('outputBinaryField', i, 'data') as string;
		const binary = await this.helpers.prepareBinaryData(
			Buffer.from(arrayBuffer),
			fileName,
			mimeType,
		);
		return [
			{
				json,
				binary: { [outputBinaryField]: binary },
				pairedItem: { item: i },
			},
		];
	};

	if (operation === 'getBrowser') {
		const code = this.getNodeParameter('code', i) as string;
		const options = this.getNodeParameter('options', i, {}) as ImageOptions;
		const browser = BROWSER_MAP[code];
		if (!browser) {
			throw new NodeOperationError(this.getNode(), `Unknown browser code "${code}"`, {
				itemIndex: i,
			});
		}
		const arrayBuffer = await avatars.getBrowser({
			code: browser,
			width: options.width,
			height: options.height,
			quality: options.quality,
		});
		return await toBinaryItem(arrayBuffer, `browser-${code}.png`, { code, ...options });
	}

	if (operation === 'getCreditCard') {
		const code = this.getNodeParameter('code', i) as string;
		const options = this.getNodeParameter('options', i, {}) as ImageOptions;
		const creditCard = CREDIT_CARD_MAP[code];
		if (!creditCard) {
			throw new NodeOperationError(this.getNode(), `Unknown credit card code "${code}"`, {
				itemIndex: i,
			});
		}
		const arrayBuffer = await avatars.getCreditCard({
			code: creditCard,
			width: options.width,
			height: options.height,
			quality: options.quality,
		});
		return await toBinaryItem(arrayBuffer, `card-${code}.png`, { code, ...options });
	}

	if (operation === 'getFavicon') {
		const url = this.getNodeParameter('url', i) as string;
		const arrayBuffer = await avatars.getFavicon({ url });
		// The favicon endpoint returns ICO and SVG favicons unconverted; sniff
		// the bytes so the binary metadata matches the actual content.
		const bytes = Buffer.from(arrayBuffer);
		let fileName = 'favicon.png';
		let mimeType = 'image/png';
		if (bytes.length >= 4 && bytes.readUInt32LE(0) === 0x00010000) {
			fileName = 'favicon.ico';
			mimeType = 'image/x-icon';
		} else if (bytes.slice(0, 256).toString('utf8').trimStart().startsWith('<')) {
			fileName = 'favicon.svg';
			mimeType = 'image/svg+xml';
		}
		return await toBinaryItem(arrayBuffer, fileName, { url }, mimeType);
	}

	if (operation === 'getFlag') {
		const code = this.getNodeParameter('code', i) as string;
		const options = this.getNodeParameter('options', i, {}) as ImageOptions;
		const arrayBuffer = await avatars.getFlag({
			code: code as Flag,
			width: options.width,
			height: options.height,
			quality: options.quality,
		});
		return await toBinaryItem(arrayBuffer, `flag-${code}.png`, { code, ...options });
	}

	if (operation === 'getImage') {
		const url = this.getNodeParameter('url', i) as string;
		const options = this.getNodeParameter('options', i, {}) as ImageOptions;
		const arrayBuffer = await avatars.getImage({
			url,
			width: options.width,
			height: options.height,
		});
		return await toBinaryItem(arrayBuffer, 'image.png', { url, ...options });
	}

	if (operation === 'getInitials') {
		const options = this.getNodeParameter('options', i, {}) as {
			name?: string;
			width?: number;
			height?: number;
			background?: string;
		};
		const arrayBuffer = await avatars.getInitials({
			name: options.name === '' ? undefined : options.name,
			width: options.width,
			height: options.height,
			background: options.background === '' ? undefined : options.background,
		});
		return await toBinaryItem(arrayBuffer, 'initials.png', { ...options });
	}

	if (operation === 'getQr') {
		const text = this.getNodeParameter('text', i) as string;
		const options = this.getNodeParameter('options', i, {}) as {
			size?: number;
			margin?: number;
			download?: boolean;
		};
		const arrayBuffer = await avatars.getQR({
			text,
			size: options.size,
			margin: options.margin,
			download: options.download,
		});
		return await toBinaryItem(arrayBuffer, 'qr.png', { text, ...options });
	}

	throw new NodeOperationError(this.getNode(), `Unknown avatar operation "${operation}"`, {
		itemIndex: i,
	});
}
