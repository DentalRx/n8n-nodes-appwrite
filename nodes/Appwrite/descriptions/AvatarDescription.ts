import type { INodeProperties } from 'n8n-workflow';

import { userLocator } from './locators';

export const avatarOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['avatar'],
			},
		},
		options: [
			{
				name: 'Get Browser Icon',
				value: 'getBrowser',
				description: 'Get the icon of a browser by its code',
				action: 'Get browser icon',
			},
			{
				name: 'Get Credit Card Icon',
				value: 'getCreditCard',
				description: 'Get the icon of a credit card provider by its code',
				action: 'Get credit card icon',
			},
			{
				name: 'Get Favicon',
				value: 'getFavicon',
				description: 'Fetch the favicon of a remote website URL',
				action: 'Get favicon',
			},
			{
				name: 'Get Flag',
				value: 'getFlag',
				description: 'Get the flag icon of a country by its ISO 3166-1 code',
				action: 'Get country flag',
			},
			{
				name: 'Get Image',
				value: 'getImage',
				description: 'Fetch a remote image URL and crop it to the given size',
				action: 'Get remote image',
			},
			{
				name: 'Get Initials',
				value: 'getInitials',
				description: 'Get an avatar image showing the initials of a name',
				action: 'Get initials avatar',
			},
			{
				name: 'Get Photo',
				value: 'getPhoto',
				description:
					'Get the best available profile photo for a user, email, or name, falling back to initials',
				action: 'Get user photo',
			},
			{
				name: 'Get QR Code',
				value: 'getQr',
				description: 'Convert a given plain text to a QR code image',
				action: 'Get QR code',
			},
			{
				name: 'Get Screenshot',
				value: 'getScreenshot',
				description: 'Capture a screenshot of a webpage in a headless browser',
				action: 'Get webpage screenshot',
			},
		],
		default: 'getInitials',
	},
];

export const avatarFields: INodeProperties[] = [
	{
		displayName: 'Browser Code',
		name: 'browserCode',
		type: 'options',
		options: [
			{ name: 'Android WebView Beta', value: 'an' },
			{ name: 'Avant Browser', value: 'aa' },
			{ name: 'Chromium', value: 'cr' },
			{ name: 'Google Chrome', value: 'ch' },
			{ name: 'Google Chrome (iOS)', value: 'ci' },
			{ name: 'Google Chrome Mobile', value: 'cm' },
			{ name: 'Microsoft Edge', value: 'ps' },
			{ name: 'Microsoft Edge (iOS)', value: 'oi' },
			{ name: 'Mobile Safari', value: 'mf' },
			{ name: 'Mozilla Firefox', value: 'ff' },
			{ name: 'Opera', value: 'op' },
			{ name: 'Opera Mini', value: 'om' },
			{ name: 'Opera Next', value: 'on' },
			{ name: 'Safari', value: 'sf' },
		],
		default: 'ch',
		description: 'The browser to get the icon for, as it appears in Appwrite user sessions',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getBrowser'],
			},
		},
	},
	{
		displayName: 'Credit Card Code',
		name: 'creditCardCode',
		type: 'options',
		options: [
			{ name: 'American Express', value: 'amex' },
			{ name: 'Argencard', value: 'argencard' },
			{ name: 'Cabal', value: 'cabal' },
			{ name: 'Cencosud', value: 'cencosud' },
			{ name: 'Diners Club', value: 'diners' },
			{ name: 'Discover', value: 'discover' },
			{ name: 'Elo', value: 'elo' },
			{ name: 'Hipercard', value: 'hipercard' },
			{ name: 'JCB', value: 'jcb' },
			{ name: 'Maestro', value: 'maestro' },
			{ name: 'Mastercard', value: 'mastercard' },
			{ name: 'MIR', value: 'mir' },
			{ name: 'Naranja', value: 'naranja' },
			{ name: 'RuPay', value: 'rupay' },
			{ name: 'Tarjeta Shopping', value: 'targeta-shopping' },
			{ name: 'UnionPay', value: 'unionpay' },
			{ name: 'Visa', value: 'visa' },
		],
		default: 'visa',
		description: 'The credit card provider to get the icon for',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getCreditCard'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com',
		description: 'The website URL to fetch the favicon from. HTTP redirects are not followed.',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getFavicon'],
			},
		},
	},
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. us',
		description:
			'The two-letter country code to get the flag for, following the ISO 3166-1 alpha-2 standard (e.g. us, ca, de)',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getFlag'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/image.png',
		description: 'The remote image URL to fetch and crop. HTTP redirects are not followed.',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getImage'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. John Doe',
		description: 'The full name to build the initials from, up to 128 characters',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getInitials'],
			},
		},
	},
	userLocator(
		{ resource: ['avatar'], operation: ['getPhoto'] },
		{
			required: false,
			description:
				"The user whose photo to get, from their sign-in provider, Gravatar, or their name's initials",
			hint: 'Set at least one of User, Email, or Name',
		},
	),
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'e.g. name@email.com',
		description:
			"The email address to look up on Gravatar and Libravatar, instead of the user's own. Only its SHA-256 hash is sent to Appwrite.",
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getPhoto'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. John Doe',
		description:
			"The name to render initials from when no photo is found, instead of the user's own. Up to 128 characters.",
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getPhoto'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com',
		description: 'The public webpage URL to capture',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getScreenshot'],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'The plain text to convert to a QR code image',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getQr'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getBrowser', 'getCreditCard', 'getFlag'],
			},
		},
		options: [
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 100,
				description: 'Image height in pixels, between 0 and 2000. Pass 0 to keep the aspect ratio.',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 100,
				description:
					'Image quality, between 0 and 100. Leave this option out to keep the source image quality.',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 100,
				description: 'Image width in pixels, between 0 and 2000. Pass 0 to keep the aspect ratio.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getImage'],
			},
		},
		options: [
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 400,
				description: 'Image height in pixels, between 0 and 2000. Pass 0 to keep the aspect ratio.',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 400,
				description: 'Image width in pixels, between 0 and 2000. Pass 0 to keep the aspect ratio.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getInitials'],
			},
		},
		options: [
			{
				displayName: 'Background Color',
				name: 'background',
				type: 'color',
				default: '',
				description:
					'Background color as a hex value. A leading # is removed automatically. Leave empty for a random color that stays persistent for the given name.',
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 100,
				description: 'Image height in pixels, between 0 and 2000. Pass 0 to keep the aspect ratio.',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 100,
				description: 'Image width in pixels, between 0 and 2000. Pass 0 to keep the aspect ratio.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getQr'],
			},
		},
		options: [
			{
				displayName: 'Margin',
				name: 'margin',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 10 },
				default: 1,
				description: 'Margin from the edge, between 0 and 10',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 400,
				description: 'QR code size in pixels, between 1 and 1000',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getPhoto'],
			},
		},
		options: [
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 256,
				description: 'Image height in pixels, between 0 and 2000',
			},
			{
				displayName: 'Output Format',
				name: 'output',
				type: 'options',
				options: [
					{ name: 'JPG', value: 'jpg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				default: 'png',
				description: 'The image format to return the photo in',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 100,
				description: 'Image quality, between 0 and 100',
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'options',
				options: [
					{ name: 'G', value: 'g', description: 'Suitable for all audiences' },
					{ name: 'PG', value: 'pg', description: 'May contain rude gestures or mild violence' },
					{
						name: 'R',
						value: 'r',
						description: 'May contain harsh profanity, nudity, or intense violence',
					},
					{
						name: 'X',
						value: 'x',
						description: 'May contain explicit or extremely disturbing imagery',
					},
				],
				default: 'g',
				description: 'The most mature Gravatar or Libravatar rating to accept',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 256,
				description: 'Image width in pixels, between 0 and 2000',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getScreenshot'],
			},
		},
		options: [
			{
				displayName: 'Browser Permissions',
				name: 'browserPermissions',
				type: 'multiOptions',
				options: [
					{ name: 'Accelerometer', value: 'accelerometer' },
					{ name: 'Ambient Light Sensor', value: 'ambient-light-sensor' },
					{ name: 'Background Sync', value: 'background-sync' },
					{ name: 'Bluetooth', value: 'bluetooth' },
					{ name: 'Camera', value: 'camera' },
					{ name: 'Clipboard Read', value: 'clipboard-read' },
					{ name: 'Clipboard Write', value: 'clipboard-write' },
					{ name: 'Geolocation', value: 'geolocation' },
					{ name: 'Gyroscope', value: 'gyroscope' },
					{ name: 'Magnetometer', value: 'magnetometer' },
					{ name: 'Microphone', value: 'microphone' },
					{ name: 'MIDI', value: 'midi' },
					{ name: 'Notifications', value: 'notifications' },
					{ name: 'Payment Handler', value: 'payment-handler' },
					{ name: 'Persistent Storage', value: 'persistent-storage' },
					{ name: 'Push', value: 'push' },
					{ name: 'Screen Wake Lock', value: 'screen-wake-lock' },
					{ name: 'USB', value: 'usb' },
					{ name: 'Web Share', value: 'web-share' },
					{ name: 'XR Spatial Tracking', value: 'xr-spatial-tracking' },
				],
				default: [],
				description: 'The browser permissions to grant the page',
			},
			{
				displayName: 'Full Page',
				name: 'fullpage',
				type: 'boolean',
				default: false,
				description: 'Whether to capture the whole scrollable page instead of only the viewport',
			},
			{
				displayName: 'Geolocation Accuracy (Meters)',
				name: 'accuracy',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100000 },
				default: 0,
				description: 'The accuracy of the emulated location in meters, between 0 and 100000',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'json',
				default: '{}',
				description:
					'HTTP headers the browser sends with the page request, as a JSON object, e.g. {"Authorization": "Bearer token"}. Appwrite takes them in the request URL, where proxies and logs can see them, so prefer short-lived credentials.',
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 0,
				description:
					'Output image height in pixels, between 0 and 2000. Pass 0 to keep the captured height.',
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'number',
				typeOptions: { minValue: -90, maxValue: 90, numberPrecision: 6 },
				default: 0,
				description:
					'The latitude of the emulated location, between -90 and 90. The location is only emulated when latitude or longitude is not 0.',
			},
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: '',
				placeholder: 'e.g. en-US',
				description: "The browser locale. Leave empty for the browser's default.",
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'number',
				typeOptions: { minValue: -180, maxValue: 180, numberPrecision: 6 },
				default: 0,
				description:
					'The longitude of the emulated location, between -180 and 180. The location is only emulated when latitude or longitude is not 0.',
			},
			{
				displayName: 'Output Format',
				name: 'output',
				type: 'options',
				options: [
					{ name: 'AVIF', value: 'avif' },
					{ name: 'GIF', value: 'gif' },
					{ name: 'HEIC', value: 'heic' },
					{ name: 'JPEG', value: 'jpeg' },
					{ name: 'JPG', value: 'jpg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				default: 'png',
				description: 'The image format to return the screenshot in',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 100,
				description:
					'Image quality, between 0 and 100. Leave this option out to keep the captured image quality.',
			},
			{
				displayName: 'Scale',
				name: 'scale',
				type: 'number',
				typeOptions: { minValue: 0.1, maxValue: 3, numberPrecision: 1 },
				default: 1,
				description: 'The device scale factor, between 0.1 and 3. Use 2 for a high-DPI capture.',
			},
			{
				displayName: 'Theme',
				name: 'theme',
				type: 'options',
				options: [
					{ name: 'Dark', value: 'dark' },
					{ name: 'Light', value: 'light' },
				],
				default: 'light',
				description: 'The color scheme the browser reports to the page',
			},
			{
				displayName: 'Time Zone',
				name: 'timezone',
				type: 'string',
				default: '',
				placeholder: 'e.g. America/New_York',
				description: "The IANA time zone of the browser. Leave empty for the browser's default.",
			},
			{
				displayName: 'Touch Support',
				name: 'touch',
				type: 'boolean',
				default: false,
				description: 'Whether the browser reports touch support to the page',
			},
			{
				displayName: 'User Agent',
				name: 'userAgent',
				type: 'string',
				default: '',
				description:
					"The user agent string the browser sends. Leave empty for the browser's default.",
			},
			{
				displayName: 'Viewport Height',
				name: 'viewportHeight',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1080 },
				default: 720,
				description: 'The browser viewport height in pixels, between 1 and 1080',
			},
			{
				displayName: 'Viewport Width',
				name: 'viewportWidth',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1920 },
				default: 1280,
				description: 'The browser viewport width in pixels, between 1 and 1920',
			},
			{
				displayName: 'Wait Before Capture (Seconds)',
				name: 'sleep',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 10 },
				default: 0,
				description:
					'How long to wait after the page loads before capturing it, between 0 and 10 seconds',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2000 },
				default: 0,
				description:
					'Output image width in pixels, between 0 and 2000. Pass 0 to keep the captured width.',
			},
		],
	},
	{
		displayName: 'Output Data Field Name',
		name: 'outputBinaryField',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output field to put the image in',
		displayOptions: {
			show: {
				resource: ['avatar'],
			},
		},
	},
];
