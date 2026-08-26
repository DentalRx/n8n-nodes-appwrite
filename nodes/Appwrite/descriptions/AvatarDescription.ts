import type { INodeProperties } from 'n8n-workflow';

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
				action: 'Get a browser icon',
			},
			{
				name: 'Get Credit Card Icon',
				value: 'getCreditCard',
				description: 'Get the icon of a credit card provider by its code',
				action: 'Get a credit card icon',
			},
			{
				name: 'Get Favicon',
				value: 'getFavicon',
				description: 'Fetch the favicon of a remote website URL',
				action: 'Get a favicon',
			},
			{
				name: 'Get Flag',
				value: 'getFlag',
				description: 'Get the flag icon of a country by its ISO 3166-1 code',
				action: 'Get a country flag',
			},
			{
				name: 'Get Image',
				value: 'getImage',
				description: 'Fetch a remote image URL and crop it to the given size',
				action: 'Get a remote image',
			},
			{
				name: 'Get Initials',
				value: 'getInitials',
				description: 'Get an avatar image showing the initials of a name',
				action: 'Get an initials avatar',
			},
			{
				name: 'Get QR Code',
				value: 'getQr',
				description: 'Convert a given plain text to a QR code image',
				action: 'Get a QR code',
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
		placeholder: 'https://example.com',
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
		placeholder: 'us',
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
		placeholder: 'https://example.com/image.png',
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
		placeholder: 'John Doe',
		description: 'The full name to build the initials from, up to 128 characters',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getInitials'],
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
					'Image quality, between 0 and 100. Defaults to 100; remove this option to keep the source image quality.',
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
				type: 'string',
				default: '',
				placeholder: 'fd366e',
				description:
					'Background color as a hex value. Leave empty for a random color that stays persistent for the given name.',
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
