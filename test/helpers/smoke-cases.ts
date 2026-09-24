import type {
	IDataObject,
	IHttpRequestOptions,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { description, resolveParameters, testNode } from './mock-context';

/**
 * Generates the parameter sets the smoke and API contract tests run every
 * operation with: the defaults n8n stores for a freshly added node, every
 * displayed field filled in, one case per alternative value of each displayed
 * dropdown and toggle, and each resource locator in By URL mode.
 */

const { properties } = description;

export const resources = (
	(properties.find((property) => property.name === 'resource')?.options ??
		[]) as INodePropertyOptions[]
).map((option) => option.value as string);

export const operationsOf = (resource: string): string[] => {
	const property = properties.find(
		(candidate) =>
			candidate.name === 'operation' &&
			(candidate.displayOptions?.show?.resource as string[] | undefined)?.includes(resource),
	);
	return ((property?.options ?? []) as INodePropertyOptions[]).map(
		(option) => option.value as string,
	);
};

const LIST_KEYS = [
	'buckets',
	'columns',
	'continents',
	'countries',
	'currencies',
	'databases',
	'deployments',
	'executions',
	'files',
	'frameworks',
	'functions',
	'identities',
	'indexes',
	'languages',
	'localeCodes',
	'locales',
	'logs',
	'memberships',
	'messages',
	'operations',
	'phones',
	'rows',
	'runtimes',
	'sessions',
	'sites',
	'specifications',
	'subscribers',
	'tables',
	'targets',
	'teams',
	'tokens',
	'topics',
	'transactions',
	'users',
	'variables',
];

/** One plausible Appwrite answer for any endpoint: a model with every list key populated. */
export function universalResponse(request: IHttpRequestOptions): unknown {
	if (request.encoding === 'arraybuffer') return Buffer.from('binary-content');
	if (request.json === false) return JSON.stringify({ $id: 'uploaded-file' });

	const model: IDataObject = {
		$id: 'model-id',
		$createdAt: '2026-01-01T00:00:00.000+00:00',
		$updatedAt: '2026-01-01T00:00:00.000+00:00',
		name: 'Model',
		key: 'model-key',
		mimeType: 'text/plain',
		status: 'available',
		enabled: true,
		total: 1,
	};
	for (const key of LIST_KEYS) {
		model[key] = [{ $id: `${key}-1`, name: key, key: `${key}-key` }];
	}
	return model;
}

/** Column default values that pass the node's own validation for each column type. */
const COLUMN_DEFAULTS: Record<string, string> = {
	integer: '1',
	bigint: '1',
	float: '1.5',
	boolean: 'true',
	datetime: '2030-01-01T00:00:00.000+00:00',
	point: '[1, 2]',
	line: '[[1, 2], [3, 4]]',
	polygon: '[[[0, 0], [1, 0], [1, 1], [0, 0]]]',
};

/**
 * A realistic non-empty value for a property, or its default when `filled` is
 * off. `context` holds the top-level values chosen so far, for the few fields
 * whose valid values depend on a sibling.
 */
function valueFor(
	property: INodeProperties,
	filled: boolean,
	context: INodeParameters,
	typed = false,
): unknown {
	const { name } = property;
	switch (property.type) {
		case 'string': {
			if (!filled || name.endsWith('Json')) return property.default;
			// An expression resolves to its natural type even in a text field.
			if (typed) return 7;
			if (name === 'defaultValue') return COLUMN_DEFAULTS[String(context.columnType)] ?? 'default';
			if (name === 'orders') return 'asc';
			if (name === 'lengths') return '255';
			if (name === 'inputBinaryField' && context.operation === 'createDeployment') return 'code';
			if (name === 'inputBinaryField' || name === 'outputBinaryField') return 'data';
			if (name === 'permissions') return 'read("any")\nupdate("users")';
			if (name === 'email') return 'user@example.com';
			if (name === 'phone') return '+15555550100';
			if (name === 'password' || name === 'secret') return 'correct-horse-battery-staple';
			if (name === 'url' || name === 'redirectUrl') return 'https://example.com/path';
			if (name === 'domain') return 'example.com';
			if (name === 'countryCode') return 'us';
			if (/expire|scheduledAt|date/i.test(name)) return '2030-01-01T00:00:00.000+00:00';
			return `${name}-value`;
		}
		case 'options': {
			if (property.typeOptions?.loadOptionsMethod !== undefined) {
				return filled ? `${name}-id` : property.default;
			}
			if (property.default !== '' && property.default !== undefined) return property.default;
			return (property.options as INodePropertyOptions[] | undefined)?.[0]?.value ?? '';
		}
		case 'multiOptions': {
			if (!filled) return property.default;
			return (property.options as INodePropertyOptions[]).slice(0, 2).map((option) => option.value);
		}
		case 'color':
			return filled ? '#ff8800' : property.default;
		case 'dateTime':
			return filled ? '2030-01-01T00:00:00.000Z' : property.default;
		case 'collection': {
			if (!filled) return {};
			const collection: IDataObject = {};
			for (const option of property.options as INodeProperties[]) {
				const value = valueFor(option, true, context, typed);
				if (value !== undefined) collection[option.name] = value as IDataObject[string];
			}
			return collection;
		}
		case 'fixedCollection': {
			if (!filled) return {};
			const collection: IDataObject = {};
			for (const group of property.options as INodePropertyCollection[]) {
				const entry: IDataObject = {};
				for (const field of group.values) {
					const value = valueFor(field, true, context, typed);
					if (value !== undefined) entry[field.name] = value as IDataObject[string];
				}
				collection[group.name] = property.typeOptions?.multipleValues ? [entry] : entry;
			}
			return collection;
		}
		case 'resourceLocator':
			return filled ? { __rl: true, mode: 'id', value: `${name}-id` } : property.default;
		case 'notice':
			return undefined;
		default:
			return property.default;
	}
}

const isDisplayed = (values: INodeParameters, property: INodeProperties): boolean =>
	NodeHelpers.displayParameter(values, property, testNode, description);

/**
 * Fill every displayed top-level property, repeating until no newly displayed
 * property appears (a filled dropdown can reveal dependent fields).
 */
function fillDisplayed(base: INodeParameters, filled: boolean, typed = false): INodeParameters {
	const values: INodeParameters = { ...base };
	for (let pass = 0; pass < 4; pass++) {
		const resolved = resolveParameters(values);
		let changed = false;
		for (const property of properties) {
			if (property.name in values) continue;
			if (!isDisplayed(resolved, property)) continue;
			const value = valueFor(property, filled, values, typed);
			if (value === undefined) continue;
			values[property.name] = value as NodeParameterValueType;
			changed = true;
		}
		if (!changed) break;
	}
	return values;
}

export interface SmokeCase {
	name: string;
	filled: boolean;
	parameters: INodeParameters;
	/** Every text field holds a number, as an expression can resolve to one. */
	typed?: boolean;
	/** A value some request must carry in its path or body, e.g. an ID extracted from a URL. */
	expectInPath?: string;
}

export function casesFor(resource: string, operation: string): SmokeCase[] {
	const base: INodeParameters = { resource, operation };
	const cases: SmokeCase[] = [
		{ name: `${resource} › ${operation} (defaults)`, filled: false, parameters: base },
		{
			name: `${resource} › ${operation} (all fields)`,
			filled: true,
			parameters: fillDisplayed(base, true),
		},
		{
			name: `${resource} › ${operation} (expressions resolve to numbers)`,
			filled: true,
			typed: true,
			parameters: fillDisplayed(base, true, true),
		},
	];

	const resolved = resolveParameters(fillDisplayed(base, true));
	for (const property of properties) {
		if (property.name === 'resource' || property.name === 'operation') continue;
		if (!isDisplayed(resolved, property)) continue;

		if (property.type === 'options' && property.typeOptions?.loadOptionsMethod === undefined) {
			for (const option of property.options as INodePropertyOptions[]) {
				if (option.value === resolved[property.name]) continue;
				cases.push({
					name: `${resource} › ${operation} (${property.name}=${String(option.value)})`,
					filled: true,
					parameters: fillDisplayed({ ...base, [property.name]: option.value }, true),
				});
			}
		}

		if (property.type === 'resourceLocator') {
			// By URL mode: the ID must come out of a pasted Console link.
			const kind = /\/(\w+)-\(/.exec(
				String(property.modes?.find((mode) => mode.name === 'url')?.extractValue?.regex ?? ''),
			)?.[1];
			if (kind !== undefined) {
				cases.push({
					name: `${resource} › ${operation} (${property.name} by URL)`,
					filled: true,
					parameters: fillDisplayed(
						{
							...base,
							[property.name]: {
								__rl: true,
								mode: 'url',
								value: `https://cloud.appwrite.io/console/project-fra-p/${kind}-${property.name}Url?tab=x`,
							},
						},
						true,
					),
					expectInPath: `${property.name}Url`,
				});
			}
		}

		if (property.type === 'boolean') {
			const flipped = !(resolved[property.name] as boolean);
			cases.push({
				name: `${resource} › ${operation} (${property.name}=${String(flipped)})`,
				filled: true,
				parameters: fillDisplayed({ ...base, [property.name]: flipped }, true),
			});
		}
	}

	return cases;
}

export const BINARY = {
	data: { buffer: Buffer.from('hello world'), mimeType: 'text/plain', fileName: 'hello.txt' },
	// Deployments check for the gzip signature before uploading a code package.
	code: {
		buffer: Buffer.from([0x1f, 0x8b, 0x08, 0x00]),
		mimeType: 'application/gzip',
		fileName: 'code.tar.gz',
	},
};
