import type { INodeProperties } from 'n8n-workflow';

import {
	listOptionsProperty,
	permissionsProperty,
	queriesProperties,
	returnAllAndLimitProperties,
} from './shared';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download the content of a file',
				action: 'Download a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the metadata of a file by ID',
				action: 'Get a file',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List files in a bucket, with optional filters',
				action: 'Get many files',
			},
			{
				name: 'Get Preview',
				value: 'getPreview',
				description: 'Get a preview image of a file, with optional resizing and cropping',
				action: 'Get a file preview',
			},
			{
				name: 'Get View',
				value: 'getView',
				description:
					'Get the content of a file to display in the browser instead of downloading it',
				action: 'Get a file view',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update the name or permissions of a file',
				action: 'Update a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a new file to a bucket',
				action: 'Upload a file',
			},
		],
		default: 'get',
	},
];

export const fileFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name or ID',
		name: 'bucketId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getBuckets' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		default: '',
		description: 'The unique ID of the file',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['get', 'update', 'delete', 'download', 'getView', 'getPreview'],
			},
		},
	},
	{
		displayName: 'Input Data Field Name',
		name: 'inputBinaryField',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input field holding the file to upload',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		placeholder: 'unique()',
		description:
			'The ID for the file. Leave empty (or use unique()) to auto-generate a unique ID. Allowed characters: a-z, A-Z, 0-9, period, hyphen, underscore; must not start with a special character.',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		description:
			'The file name to upload the file as. Leave empty to use the file name of the binary data.',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The new name of the file. Leave empty to keep the current name.',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
			},
		},
	},
	permissionsProperty(
		'file',
		['upload', 'update'],
		'Permission strings, one per line (or a JSON array). E.g. read("any"), update("user:abc"), delete("team:abc"). Leave empty to use the bucket permissions.',
	),
	...returnAllAndLimitProperties('file', ['getMany']),
	...queriesProperties('file', ['getMany']),
	{
		displayName: 'Output Data Field Name',
		name: 'outputBinaryField',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output field to put the file in',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download', 'getView', 'getPreview'],
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
				resource: ['file'],
				operation: ['download', 'getView'],
			},
		},
		options: [
			{
				displayName: 'File Token',
				name: 'token',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'File token for accessing this file if it is not public',
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
				resource: ['file'],
				operation: ['getPreview'],
			},
		},
		options: [
			{
				displayName: 'Background Color',
				name: 'background',
				type: 'color',
				default: '',
				description:
					'Preview image background color. A leading # in the HEX value is removed automatically. Only works with transparent images (PNG).',
			},
			{
				displayName: 'Border Color',
				name: 'borderColor',
				type: 'color',
				default: '',
				description:
					'Preview image border color. A leading # in the HEX value is removed automatically.',
			},
			{
				displayName: 'Border Radius',
				name: 'borderRadius',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 4000 },
				default: 0,
				description: 'Preview image border radius in pixels, between 0 and 4000',
			},
			{
				displayName: 'Border Width',
				name: 'borderWidth',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 0,
				description: 'Preview image border width in pixels, between 0 and 100',
			},
			{
				displayName: 'File Token',
				name: 'token',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'File token for accessing this file if it is not public',
			},
			{
				displayName: 'Gravity',
				name: 'gravity',
				type: 'options',
				options: [
					{ name: 'Bottom', value: 'bottom' },
					{ name: 'Bottom Left', value: 'bottom-left' },
					{ name: 'Bottom Right', value: 'bottom-right' },
					{ name: 'Center', value: 'center' },
					{ name: 'Left', value: 'left' },
					{ name: 'Right', value: 'right' },
					{ name: 'Top', value: 'top' },
					{ name: 'Top Left', value: 'top-left' },
					{ name: 'Top Right', value: 'top-right' },
				],
				default: 'center',
				description: 'The crop gravity to use when resizing the image',
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 4000 },
				default: 0,
				description: 'Resize preview image height, between 0 and 4000 pixels',
			},
			{
				displayName: 'Opacity',
				name: 'opacity',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 1,
				description:
					'Preview image opacity, between 0 and 1. Only works with images having an alpha channel (like PNG).',
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
				default: 'jpg',
				description: 'The image format to convert the preview to',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 100,
				description: 'Preview image quality, between 0 and 100',
			},
			{
				displayName: 'Rotation',
				name: 'rotation',
				type: 'number',
				typeOptions: { minValue: -360, maxValue: 360 },
				default: 0,
				description: 'Preview image rotation in degrees, between -360 and 360',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 4000 },
				default: 0,
				description: 'Resize preview image width, between 0 and 4000 pixels',
			},
		],
	},
	listOptionsProperty('file', ['getMany']),
];
