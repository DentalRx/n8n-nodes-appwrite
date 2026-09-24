import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyCollection,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, jsonParse } from 'n8n-workflow';

import { Query, extractId } from './helpers/appwrite';

/**
 * Wrap one or more API results as n8n output items paired to the input item
 * they were produced from.
 */
export function toItems(
	data: IDataObject | IDataObject[],
	itemIndex: number,
): INodeExecutionData[] {
	const list = Array.isArray(data) ? data : [data];
	return list.map((json) => ({ json, pairedItem: { item: itemIndex } }));
}

/**
 * The output of a bulk write: one item per record Appwrite returns, or one
 * summary item when it returns none. Inside a transaction Appwrite only stages
 * the writes and returns no records, and the next node (such as the
 * transaction's Commit) must still run.
 */
export function bulkWriteItems(
	response: IDataObject,
	listKey: string,
	itemIndex: number,
	transactionId?: string,
): INodeExecutionData[] {
	const records = (response[listKey] as IDataObject[] | undefined) ?? [];
	if (records.length > 0 && transactionId === undefined) return toItems(records, itemIndex);
	return toItems(
		{ total: response.total ?? records.length, ...(transactionId ? { transactionId } : {}) },
		itemIndex,
	);
}

/**
 * Stop Update Many or Delete Many that has no query unless Apply to All is on:
 * with no query, Appwrite applies them to every record of the table or
 * collection.
 */
export function assertBulkTargetsChosen(
	this: IExecuteFunctions,
	queries: string[],
	record: string,
	itemIndex: number,
): void {
	if (queries.length > 0 || (this.getNodeParameter('applyToAll', itemIndex, false) as boolean)) {
		return;
	}
	const plural = `${record}s`;
	throw new NodeOperationError(this.getNode(), `No query selects which ${plural} to change`, {
		description: `Add a query that selects the ${plural}, or turn on Apply to All ${plural.charAt(0).toUpperCase()}${plural.slice(1)} to change every ${record}.`,
		itemIndex,
	});
}

/** The output of a bulk delete: one confirmation, like every other delete. */
export function bulkDeleteItems(
	response: IDataObject,
	itemIndex: number,
	transactionId?: string,
): INodeExecutionData[] {
	return toItems(
		{ deleted: true, total: response.total ?? 0, ...(transactionId ? { transactionId } : {}) },
		itemIndex,
	);
}

/**
 * Read the ID of an existing record from a resource locator (From List, By URL
 * or ID mode) or a plain string parameter. A Console URL typed into ID mode or
 * produced by an expression resolves too. Returns '' when the field is empty.
 */
export function getOptionalResourceId(
	this: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	kind: string,
): string {
	const value = this.getNodeParameter(parameterName, itemIndex, '', { extractValue: true });
	const raw =
		value !== null && typeof value === 'object' && 'value' in value
			? String((value as { value: unknown }).value ?? '')
			: String(value ?? '');
	return extractId(raw, kind);
}

/**
 * Like getOptionalResourceId, for a required record: an empty value stops the
 * item with a message naming the field, instead of sending a request with a
 * blank path segment.
 */
export function getResourceId(
	this: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	kind: string,
	label: string,
): string {
	const id = getOptionalResourceId.call(this, parameterName, itemIndex, kind);
	if (id === '') {
		throw new NodeOperationError(this.getNode(), `The '${label}' parameter is empty`, {
			description: `Choose a ${label.toLowerCase()} from the list, or enter its ID or Appwrite Console URL.`,
			itemIndex,
		});
	}
	return id;
}

/**
 * Read a text parameter as a string. An expression resolves to its natural
 * type even in a text field (`{{ 42 }}` is the number 42), and Appwrite rejects
 * a number or boolean where it expects text, so the value is converted here.
 */
export function getStringParameter(
	this: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	fallback?: string,
): string {
	const value =
		fallback === undefined
			? this.getNodeParameter(parameterName, itemIndex)
			: this.getNodeParameter(parameterName, itemIndex, fallback);
	if (value === undefined || value === null) return fallback ?? '';
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** A date and time without a UTC offset, as n8n's date picker stores it. */
const LOCAL_DATE_TIME =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?$/;

/** How far ahead of UTC the time zone's wall clock is at an instant, in milliseconds. */
function utcOffsetAt(instant: number, timezone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(instant));
	const part = (type: string): number =>
		Number(parts.find((candidate) => candidate.type === type)?.value);
	const wallClock = Date.UTC(
		part('year'),
		part('month') - 1,
		part('day'),
		part('hour'),
		part('minute'),
		part('second'),
	);
	return wallClock - (instant - (((instant % 1000) + 1000) % 1000));
}

/**
 * A date and time as the UTC timestamp Appwrite expects. n8n's date picker
 * stores the wall-clock time of the workflow's time zone without an offset,
 * which Appwrite would read as UTC; such a value is converted from that time
 * zone. A value with an offset, or one that is not a date, is kept as it is.
 */
export function dateTimeInZone(value: unknown, timezone: string): unknown {
	if (value instanceof Date) return value.toISOString();
	if (value !== null && typeof value === 'object' && 'toISO' in value) {
		const toIso = (value as { toISO: unknown }).toISO;
		if (typeof toIso === 'function') return String(toIso.call(value));
	}
	if (typeof value !== 'string') return value;
	const match = LOCAL_DATE_TIME.exec(value.trim());
	if (match === null) return value;
	const [, year, month, day, hour = '0', minute = '0', second = '0', fraction = '0'] = match;
	const wallClock = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second),
		Number(fraction.padEnd(3, '0')),
	);
	// The offset depends on the instant (daylight saving time), so it is
	// looked up again at the first estimate.
	const estimate = wallClock - utcOffsetAt(wallClock, timezone);
	return new Date(wallClock - utcOffsetAt(estimate, timezone)).toISOString();
}

/** Read a date and time parameter as a UTC timestamp, or '' when it is empty. */
export function getDateTimeParameter(
	this: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): string {
	const value = this.getNodeParameter(parameterName, itemIndex, '');
	if (value === undefined || value === null || value === '') return '';
	return String(dateTimeInZone(value, this.getTimezone()));
}

/** The node's parameter definitions, registered once by the resource registry. */
const parameterDefinitions: INodeProperties[] = [];

export function registerParameterDefinitions(properties: INodeProperties[]): void {
	parameterDefinitions.splice(0, parameterDefinitions.length, ...properties);
}

/**
 * Convert the numbers and booleans an expression put in a text field of a
 * collection (and of any collection inside it) to strings, and its dates and
 * times to UTC timestamps.
 */
function textFieldsAsStrings(
	value: IDataObject,
	fields: INodeProperties[],
	timezone: string,
): IDataObject {
	const result: IDataObject = { ...value };
	for (const [key, entry] of Object.entries(value)) {
		const matching = fields.filter((field) => field.name === key);
		if (matching.length === 0) continue;
		if (
			(typeof entry === 'number' || typeof entry === 'boolean') &&
			matching.every((field) => field.type === 'string')
		) {
			result[key] = String(entry);
		} else if (matching.every((field) => field.type === 'dateTime')) {
			result[key] = dateTimeInZone(entry, timezone) as IDataObject[string];
		} else if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
			result[key] = collectionAsStrings(entry as IDataObject, matching, timezone);
		}
	}
	return result;
}

/** textFieldsAsStrings for a collection or fixed collection value, given its definitions. */
function collectionAsStrings(
	value: IDataObject,
	definitions: INodeProperties[],
	timezone: string,
): IDataObject {
	const fields = definitions.filter((definition) => definition.type === 'collection');
	let result = textFieldsAsStrings(
		value,
		fields.flatMap((definition) => (definition.options ?? []) as INodeProperties[]),
		timezone,
	);
	for (const definition of definitions.filter(
		(candidate) => candidate.type === 'fixedCollection',
	)) {
		for (const group of (definition.options ?? []) as INodePropertyCollection[]) {
			const entries = result[group.name];
			if (entries === null || typeof entries !== 'object') continue;
			result = {
				...result,
				[group.name]: Array.isArray(entries)
					? (entries as IDataObject[]).map((entry) =>
							textFieldsAsStrings(entry, group.values, timezone),
						)
					: textFieldsAsStrings(entries as IDataObject, group.values, timezone),
			};
		}
	}
	return result;
}

/**
 * Read a collection or fixed collection parameter with its text fields as
 * strings, as getStringParameter does for a top-level text field, and its
 * dates as UTC timestamps. Fields of other types (numbers, toggles, lists)
 * keep the type their expression gave.
 */
export function getCollectionParameter(
	this: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): IDataObject {
	const value = this.getNodeParameter(parameterName, itemIndex, {});
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
	const resource = String(this.getNodeParameter('resource', itemIndex, ''));
	const operation = String(this.getNodeParameter('operation', itemIndex, ''));
	const shownHere = (definition: INodeProperties): boolean => {
		const show = definition.displayOptions?.show;
		return (
			(show?.resource === undefined || show.resource.includes(resource)) &&
			(show?.operation === undefined || show.operation.includes(operation))
		);
	};
	return collectionAsStrings(
		value as IDataObject,
		parameterDefinitions.filter(
			(definition) => definition.name === parameterName && shownHere(definition),
		),
		this.getTimezone(),
	);
}

/**
 * Strip a leading `#` from a hex colour: Appwrite's colour parameters expect
 * bare hex digits, but colour pickers and humans both write `#fd366e`.
 */
export function stripHexHash(value?: unknown): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	return String(value).replace(/^#/, '');
}

/**
 * Look an Appwrite enum value up by its UI value, failing with a node-level
 * error rather than silently sending `undefined` for an unmapped key.
 */
export function lookupEnum<T>(
	ctx: IExecuteFunctions,
	map: Record<string, T>,
	key: string,
	label: string,
	itemIndex: number,
): T {
	const value = map[key];
	if (value === undefined) {
		throw new NodeOperationError(ctx.getNode(), `Unknown ${label} "${key}"`, {
			description: `Expected one of: ${Object.keys(map).sort().join(', ')}.`,
			itemIndex,
		});
	}
	return value;
}

/**
 * Parse a parameter that n8n may hand over either as a JSON string or as an
 * already-parsed object (both happen for `type: 'json'` properties).
 */
export function parseJsonParameter(
	this: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): IDataObject {
	if (value === undefined || value === null || value === '') return {};

	if (typeof value === 'object') {
		// An expression can resolve a `json` parameter to an already-parsed
		// value; arrays must fail here exactly as they do on the string path.
		if (Array.isArray(value)) {
			throw new NodeOperationError(
				this.getNode(),
				`Parameter '${parameterName}' must be a JSON object`,
				{
					description: 'Provide an object like {"key": "value"}, not a list or a plain value.',
					itemIndex,
				},
			);
		}
		return value as IDataObject;
	}

	let parsed: IDataObject;
	try {
		parsed = jsonParse<IDataObject>(value as string);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Parameter '${parameterName}' is not valid JSON`, {
			description: (error as Error).message,
			itemIndex,
		});
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new NodeOperationError(
			this.getNode(),
			`Parameter '${parameterName}' must be a JSON object`,
			{
				description: 'Provide an object like {"key": "value"}, not a list or a plain value.',
				itemIndex,
			},
		);
	}

	return parsed;
}

/**
 * Parse a parameter that must resolve to a JSON array.
 */
export function parseJsonArrayParameter(
	this: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): unknown[] {
	if (value === undefined || value === null || value === '') return [];
	if (Array.isArray(value)) return value;

	if (typeof value === 'string') {
		let parsed: unknown;
		try {
			parsed = jsonParse<unknown>(value);
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Parameter '${parameterName}' is not valid JSON`,
				{ description: (error as Error).message, itemIndex },
			);
		}

		if (!Array.isArray(parsed)) {
			throw new NodeOperationError(
				this.getNode(),
				`Parameter '${parameterName}' must be a JSON array`,
				{
					description: 'Provide a list like ["a", "b"], not an object or a plain value.',
					itemIndex,
				},
			);
		}

		return parsed;
	}

	throw new NodeOperationError(this.getNode(), `Parameter '${parameterName}' must be an array`, {
		itemIndex,
	});
}

/**
 * Parse a list-valued UI field that accepts either a comma-separated string or
 * a JSON array, e.g. `pdf, docx` or `["pdf","docx"]`.
 */
export function parseStringList(
	this: IExecuteFunctions,
	raw: unknown,
	parameterName: string,
	itemIndex: number,
): string[] {
	if (raw === undefined || raw === null) return [];
	if (Array.isArray(raw)) return raw.map((entry) => String(entry));
	if (typeof raw === 'object') {
		throw new NodeOperationError(this.getNode(), `Parameter '${parameterName}' must be a list`, {
			description: 'Provide a comma-separated list or a JSON array like ["a", "b"], not an object.',
			itemIndex,
		});
	}

	// An expression can resolve to a number or boolean even in a text field.
	const trimmed = String(raw).trim();
	if (trimmed === '') return [];
	if (trimmed.startsWith('[')) {
		return parseJsonArrayParameter
			.call(this, trimmed, parameterName, itemIndex)
			.map((entry) => String(entry));
	}
	return trimmed
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

/**
 * Parse a vector (an embedding, or the vector of a similarity search): a JSON
 * array of numbers, the array an expression resolved to, or comma-separated
 * numbers. Numeric strings count as numbers, since vectors that pass through
 * CSV or text often arrive quoted. Returns an empty array for an empty field.
 */
export function parseVector(
	this: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): number[] {
	const text = typeof value === 'string' ? value.trim() : undefined;
	const entries =
		text !== undefined && text !== '' && !text.startsWith('[')
			? text.split(',').map((entry) => entry.trim())
			: parseJsonArrayParameter.call(this, value, parameterName, itemIndex);

	return entries.map((entry, index) => {
		const number =
			typeof entry === 'number'
				? entry
				: typeof entry === 'string' && entry.trim() !== ''
					? Number(entry)
					: Number.NaN;
		if (!Number.isFinite(number)) {
			throw new NodeOperationError(
				this.getNode(),
				`Parameter '${parameterName}' must contain only numbers`,
				{
					description: `Entry ${index + 1} is ${JSON.stringify(entry) ?? String(entry)}. Provide a list of numbers like [0.12, -0.55, 0.88].`,
					itemIndex,
				},
			);
		}
		return number;
	});
}

/**
 * Read a list-valued node parameter that accepts a comma-separated string or a
 * JSON array.
 */
export function getStringListParameter(
	this: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	displayName = parameterName,
): string[] {
	const raw = this.getNodeParameter(parameterName, itemIndex, '');
	return parseStringList.call(this, raw, displayName, itemIndex);
}

/**
 * Read the `method` of an encoded Appwrite query string, or '' when the query
 * is not a JSON-encoded query.
 */
function queryMethod(query: string): string {
	try {
		return (JSON.parse(query) as { method?: string }).method ?? '';
	} catch {
		return '';
	}
}

/**
 * Append the node's Limit to a query list, unless the user already supplied a
 * Limit query of their own. Appwrite keeps the first Limit it is given, so
 * appending a second one would silently override the user's.
 */
export function withLimit(queries: string[], limit: number): string[] {
	if (queries.some((q) => queryMethod(q) === 'limit')) return queries;
	return [...queries, Query.limit(limit)];
}

/**
 * Interpret a UI string value with smart typing: numbers, booleans, null and
 * JSON arrays/objects are parsed, anything else stays a string. An expression
 * can hand over an already-typed value even for a text field; that value is
 * kept as it is (or stringified when the user asked for a string).
 */
export function smartParseValue(value: unknown, treatAsString: boolean): unknown {
	if (typeof value !== 'string') {
		if (!treatAsString || value === null || value === undefined) return value;
		return typeof value === 'object' ? JSON.stringify(value) : String(value);
	}
	if (treatAsString) return value;
	const trimmed = value.trim();
	if (trimmed === '') return value;
	if (
		/^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)$/.test(trimmed) ||
		trimmed.startsWith('[') ||
		trimmed.startsWith('{') ||
		(trimmed.startsWith('"') && trimmed.endsWith('"'))
	) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			// Numeric literals a double cannot hold faithfully would be silently
			// corrupted by the parse (Appwrite integer columns are 64-bit):
			// overflow becomes Infinity, which serialises as null, and large
			// integral values round - including ones written with a decimal point
			// ("9007199254740993.0") or an exponent. Keep the original string in
			// those cases so the value is never corrupted.
			if (typeof parsed === 'number') {
				if (!Number.isFinite(parsed)) return value;
				if (Number.isInteger(parsed) && !Number.isSafeInteger(parsed)) return value;
			}
			return parsed;
		} catch {
			return value;
		}
	}
	return value;
}

interface QueryCondition {
	type: string;
	column?: string;
	/** Typed by the user, or whatever an expression resolved to. */
	value?: unknown;
	value2?: unknown;
	treatValueAsString?: boolean;
}

/**
 * Build Appwrite Query strings from the "Queries" UI (builder mode) or from a
 * raw JSON array (json mode).
 */
export function buildQueries(
	this: IExecuteFunctions,
	itemIndex: number,
	parameterName = 'queries',
): string[] {
	const mode = this.getNodeParameter(`${parameterName}Mode`, itemIndex, 'builder') as string;

	if (mode === 'json') {
		const raw = this.getNodeParameter(`${parameterName}Json`, itemIndex, '[]');
		const parsed = parseJsonArrayParameter.call(this, raw, 'Queries (JSON)', itemIndex);
		return parsed.map((q) => (typeof q === 'string' ? q : JSON.stringify(q)));
	}

	const collection = this.getNodeParameter(`${parameterName}Ui`, itemIndex, {}) as {
		queryValues?: QueryCondition[];
	};
	const conditions = collection.queryValues ?? [];

	return conditions.map((condition) => buildSingleQuery.call(this, condition, itemIndex));
}

function buildSingleQuery(
	this: IExecuteFunctions,
	condition: QueryCondition,
	itemIndex: number,
): string {
	const { type } = condition;
	const column = condition.column ?? '';
	const treatAsString = condition.treatValueAsString ?? false;
	const value = () => smartParseValue(condition.value ?? '', treatAsString);
	const value2 = () => smartParseValue(condition.value2 ?? '', treatAsString);
	const scalar = (v: unknown) => v as string | number;
	const text = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
	// Column lists (Select) accept the same comma-separated form as every other
	// list-valued field in this node, as well as a JSON array.
	const columnList = (): string[] =>
		parseStringList.call(this, condition.value ?? '', 'Select', itemIndex);

	switch (type) {
		case 'equal':
			return Query.equal(column, value() as string);
		case 'notEqual':
			return Query.notEqual(column, value() as string);
		case 'lessThan':
			return Query.lessThan(column, value() as string);
		case 'lessThanEqual':
			return Query.lessThanEqual(column, value() as string);
		case 'greaterThan':
			return Query.greaterThan(column, value() as string);
		case 'greaterThanEqual':
			return Query.greaterThanEqual(column, value() as string);
		case 'between':
			return Query.between(column, scalar(value()), scalar(value2()));
		case 'isNull':
			return Query.isNull(column);
		case 'isNotNull':
			return Query.isNotNull(column);
		case 'startsWith':
			return Query.startsWith(column, text(condition.value));
		case 'endsWith':
			return Query.endsWith(column, text(condition.value));
		case 'search':
			return Query.search(column, text(condition.value));
		case 'contains':
			return Query.contains(column, value() as string);
		case 'select':
			return Query.select(columnList());
		case 'orderAsc':
			return Query.orderAsc(column);
		case 'orderDesc':
			return Query.orderDesc(column);
		case 'limit':
		case 'offset': {
			const isLimit = type === 'limit';
			const raw = condition.value;
			if (raw === undefined || raw === null || String(raw).trim() === '') {
				throw new NodeOperationError(
					this.getNode(),
					`Query "${isLimit ? 'Limit' : 'Offset'}" needs a value`,
					{
						itemIndex,
						description:
							'Appwrite keeps the first Limit or Offset query it is given and ignores the rest, so an empty one here would silently override the Limit field rather than do nothing. Give it a number, or remove the query.',
					},
				);
			}
			const parsed = Number(raw);
			if (Number.isNaN(parsed)) {
				throw new NodeOperationError(
					this.getNode(),
					`Query "${isLimit ? 'Limit' : 'Offset'}" requires a numeric value, got "${raw}"`,
					{ itemIndex },
				);
			}
			return isLimit ? Query.limit(parsed) : Query.offset(parsed);
		}
		case 'cursorAfter':
			return Query.cursorAfter(text(condition.value));
		case 'cursorBefore':
			return Query.cursorBefore(text(condition.value));
		default:
			throw new NodeOperationError(this.getNode(), `Unknown query type "${type}"`, { itemIndex });
	}
}

/**
 * Read the dedicated Sort collection (sortUi) into Appwrite order queries,
 * appended after the user's own queries by the Get Many operations that offer
 * the collection.
 */
export function getSortQueries(this: IExecuteFunctions, itemIndex: number): string[] {
	const collection = this.getNodeParameter('sortUi', itemIndex, {}) as {
		sortValues?: Array<{ column?: string; direction?: string }>;
	};
	return (collection.sortValues ?? [])
		.filter((rule) => (rule.column ?? '') !== '')
		.map((rule) =>
			rule.direction === 'desc'
				? Query.orderDesc(rule.column as string)
				: Query.orderAsc(rule.column as string),
		);
}

/**
 * Parse the permissions parameter into an array of Appwrite permission
 * strings, e.g. ['read("any")', 'update("team:abc")'].
 *
 * Returns `undefined` when the field is left blank, which Appwrite reads as
 * "inherit the current permissions" on update operations. An explicit empty
 * JSON array (`[]`) is passed through, so permissions can be cleared.
 */
export function getPermissions(
	this: IExecuteFunctions,
	itemIndex: number,
	parameterName = 'permissions',
): string[] | undefined {
	const raw: unknown = this.getNodeParameter(parameterName, itemIndex, '');
	if (raw === undefined || raw === null) return undefined;

	if (Array.isArray(raw)) return raw.map((p) => String(p));

	const trimmed = String(raw).trim();
	if (trimmed === '') return undefined;

	if (trimmed.startsWith('[')) {
		return parseJsonArrayParameter
			.call(this, trimmed, 'Permissions', itemIndex)
			.map((p) => String(p));
	}

	const permissions = trimmed
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '');

	return permissions.length > 0 ? permissions : undefined;
}

/**
 * Fetch the row (or DocumentsDB document) data for create/update/upsert
 * operations, supporting both the key-value UI mode and the raw JSON mode. The
 * fallback mirrors the UI default of the `dataMode` parameter.
 */
export function getRowData(this: IExecuteFunctions, itemIndex: number): IDataObject {
	const mode = this.getNodeParameter('dataMode', itemIndex, 'fields') as string;

	if (mode === 'json') {
		const raw = this.getNodeParameter('dataJson', itemIndex, '{}');
		return parseJsonParameter.call(this, raw, 'Data (JSON)', itemIndex);
	}

	const fields = this.getNodeParameter('dataFieldsUi', itemIndex, {}) as {
		fieldValues?: Array<{ fieldName: unknown; fieldValue: unknown; treatValueAsString?: boolean }>;
	};

	const data: IDataObject = {};
	for (const field of fields.fieldValues ?? []) {
		if (field.fieldName === undefined || field.fieldName === null || field.fieldName === '')
			continue;
		data[String(field.fieldName)] = smartParseValue(
			field.fieldValue ?? '',
			field.treatValueAsString ?? false,
		) as IDataObject[string];
	}
	return data;
}

/**
 * Project an API model down to the handful of fields most workflows read, for
 * the standard n8n `Simplify` toggle. Fields missing from a model are skipped.
 */
export function simplifyItems(
	data: IDataObject | IDataObject[],
	fields: string[],
): IDataObject | IDataObject[] {
	const pick = (row: IDataObject): IDataObject => {
		const out: IDataObject = {};
		for (const field of fields) {
			if (row[field] !== undefined) out[field] = row[field];
		}
		return out;
	};
	return Array.isArray(data) ? data.map(pick) : pick(data);
}

/** Whether Appwrite refused a cursor because the row's sort value is null. */
function isOrderNullError(error: unknown): boolean {
	const failure = error as { context?: { data?: { type?: unknown } }; description?: unknown };
	return (
		failure.context?.data?.type === 'database_query_order_null' ||
		String(failure.description ?? '').includes('Cursor pagination requires')
	);
}

/**
 * Paginate an Appwrite list endpoint until all results are fetched, in pages
 * of 100. Cursor pagination is used where the returned models carry $id;
 * models without one (e.g. columns and indexes) fall back to offset paging,
 * as does a sorted list once the cursor row's sort value is null.
 * A user-supplied Cursor After or Offset query sets the starting point;
 * Return All overrides any Limit query.
 */
export async function fetchAllPages<T extends { $id?: string }>(
	this: IExecuteFunctions,
	baseQueries: string[],
	fetchPage: (queries: string[]) => Promise<{ rows?: T[]; total: number } | IDataObject>,
	listKey: string,
	itemIndex?: number,
): Promise<T[]> {
	const results: T[] = [];
	const cleanQueries: string[] = [];
	const initialQueries: string[] = [];
	let startOffset = 0;

	for (const q of baseQueries) {
		let method = '';
		let values: unknown[] = [];
		try {
			const parsed = JSON.parse(q) as { method?: string; values?: unknown[] };
			method = parsed.method ?? '';
			values = parsed.values ?? [];
		} catch {
			cleanQueries.push(q);
			continue;
		}
		if (method === 'limit') continue;
		if (method === 'cursorBefore') {
			throw new NodeOperationError(
				this.getNode(),
				'A Cursor Before query cannot be combined with Return All',
				{
					description:
						'Return All pages forward from the start, so it can only follow a Cursor After. Use Cursor After instead, or turn Return All off.',
					itemIndex,
				},
			);
		}
		if (method === 'cursorAfter' || method === 'offset') {
			if (method === 'offset' && typeof values[0] === 'number') startOffset = values[0];
			initialQueries.push(q);
			continue;
		}
		cleanQueries.push(q);
	}

	// A user's Cursor After stays the starting point when paging by offset.
	const initialCursor = initialQueries.filter((q) => q.includes('"cursorAfter"'));
	let cursor: string | undefined;
	let byOffset = false;
	for (let page = 0; ; page++) {
		const pageQueries = [...cleanQueries, Query.limit(100)];
		if (cursor !== undefined) {
			pageQueries.push(Query.cursorAfter(cursor));
		} else if (page === 0) {
			pageQueries.push(...initialQueries);
		} else {
			pageQueries.push(...initialCursor, Query.offset(startOffset + results.length));
		}

		let response: Record<string, T[]>;
		try {
			response = (await fetchPage(pageQueries)) as unknown as Record<string, T[]>;
		} catch (error) {
			// Appwrite cannot continue from a cursor whose value in the sort
			// column is null; the rest of the list is fetched by offset.
			if (cursor !== undefined && isOrderNullError(error)) {
				cursor = undefined;
				byOffset = true;
				continue;
			}
			throw error instanceof NodeApiError || error instanceof NodeOperationError
				? error
				: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
		}
		const list = response[listKey] ?? [];
		results.push(...list);

		if (list.length < 100) break;
		cursor = byOffset ? undefined : list[list.length - 1].$id;
	}

	return results;
}

/**
 * Paginate a list endpoint that only supports limit/offset queries (e.g. the
 * audit log endpoints, whose entries carry no usable cursor). A user-supplied
 * Offset query sets the starting point, as it does for cursor pagination.
 */
export async function fetchAllPagesByOffset<T>(
	this: IExecuteFunctions,
	baseQueries: string[],
	fetchPage: (queries: string[]) => Promise<IDataObject>,
	listKey: string,
	itemIndex?: number,
): Promise<T[]> {
	const cleanQueries: string[] = [];
	let startOffset = 0;

	for (const q of baseQueries) {
		let method = '';
		let values: unknown[] = [];
		try {
			const parsed = JSON.parse(q) as { method?: string; values?: unknown[] };
			method = parsed.method ?? '';
			values = parsed.values ?? [];
		} catch {
			cleanQueries.push(q);
			continue;
		}
		if (method === 'limit') continue;
		if (method === 'offset') {
			// Honour the user's Offset as the first page's starting point rather
			// than silently restarting from zero.
			if (typeof values[0] === 'number') startOffset = values[0];
			continue;
		}
		if (method === 'cursorAfter' || method === 'cursorBefore') {
			throw new NodeOperationError(
				this.getNode(),
				'Cursor queries are not supported by this endpoint',
				{
					description:
						'This endpoint paginates by offset only, because its entries carry no cursor. Use a Limit or Offset query instead.',
					itemIndex,
				},
			);
		}
		cleanQueries.push(q);
	}

	const results: T[] = [];
	for (;;) {
		const response = (await fetchPage([
			...cleanQueries,
			Query.limit(100),
			Query.offset(startOffset + results.length),
		])) as unknown as Record<string, T[]>;
		const list = response[listKey] ?? [];
		results.push(...list);
		if (list.length < 100) break;
	}
	return results;
}

/**
 * Run a Get Many against a list endpoint that takes only limit and offset
 * queries (e.g. a project's policies or mock phone numbers), so it offers
 * Return All and Limit but no query builder: Return All pages by offset,
 * otherwise one page of Limit entries is fetched.
 */
export async function getManyByOffset(
	this: IExecuteFunctions,
	fetchPage: (queries: string[]) => Promise<IDataObject>,
	listKey: string,
	itemIndex: number,
): Promise<IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	if (returnAll) {
		const all = await fetchAllPagesByOffset.call(this, [], fetchPage, listKey, itemIndex);
		return all as IDataObject[];
	}
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const response = await fetchPage([Query.limit(limit)]);
	return (response[listKey] ?? []) as IDataObject[];
}
