import type { INodeProperties } from 'n8n-workflow';

export const localeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['locale'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the current locale based on the request IP address',
				action: 'Get the current locale',
			},
			{
				name: 'Get Many Continents',
				value: 'getManyContinents',
				description: 'List all continents',
				action: 'Get many continents',
			},
			{
				name: 'Get Many Countries',
				value: 'getManyCountries',
				description: 'List all countries',
				action: 'Get many countries',
			},
			{
				name: 'Get Many Currencies',
				value: 'getManyCurrencies',
				description: 'List all currencies, including symbol, name, plural, and decimal digits',
				action: 'Get many currencies',
			},
			{
				name: 'Get Many EU Countries',
				value: 'getManyEuCountries',
				description: 'List all countries that are currently members of the EU',
				action: 'Get many EU countries',
			},
			{
				name: 'Get Many Languages',
				value: 'getManyLanguages',
				description: 'List all languages classified by ISO 639-1',
				action: 'Get many languages',
			},
			{
				name: 'Get Many Locale Codes',
				value: 'getManyLocaleCodes',
				description: 'List all locale codes in ISO 639-1',
				action: 'Get many locale codes',
			},
			{
				name: 'Get Many Phone Codes',
				value: 'getManyPhoneCodes',
				description: 'List the international phone code for every country',
				action: 'Get many phone codes',
			},
		],
		default: 'get',
	},
];

export const localeFields: INodeProperties[] = [];
