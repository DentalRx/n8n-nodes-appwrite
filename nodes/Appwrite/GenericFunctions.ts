import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import { Client, ID, Query } from 'node-appwrite';

/**
 * Build an authenticated Appwrite client from the node credentials.
 */
export async function getAppwriteClient(this: IExecuteFunctions): Promise<Client> {
	const credentials = await this.getCredentials('appwriteApi');

	const endpoint = ((credentials.endpoint as string) ?? '').replace(/\/+$/, '');
	const projectId = credentials.projectId as string;
	const apiKey = credentials.apiKey as string;

	return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

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
 * Resolve an ID field on a create operation: an empty value (or the literal
 * `unique()`) means "let Appwrite generate one".
 */
export function resolveId(rawId: string): string {
	const trimmed = rawId.trim();
	return trimmed === '' || trimmed === 'unique()' ? ID.unique() : rawId;
}

/**
 * Strip a leading `#` from a hex colour: Appwrite's colour parameters expect
 * bare hex digits, but colour pickers and humans both write `#fd366e`.
 */
export function stripHexHash(value?: string): string | undefined {
	if (value === undefined || value === '') return undefined;
	return value.replace(/^#/, '');
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
			itemIndex,
			description: `Expected one of: ${Object.keys(map).sort().join(', ')}`,
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
		if (Array.isArray(value)) {
			throw new NodeOperationError(
				this.getNode(),
				`Parameter "${parameterName}" must be a JSON object`,
				{ itemIndex },
			);
		}
		return value as IDataObject;
	}

	try {
		const parsed = jsonParse<IDataObject>(value as string);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new NodeOperationError(
				this.getNode(),
				`Parameter "${parameterName}" must be a JSON object`,
				{ itemIndex },
			);
		}
		return parsed;
	} catch (error) {
		if (error instanceof NodeOperationError) throw error;
		throw new NodeOperationError(
			this.getNode(),
			`Parameter "${parameterName}" contains invalid JSON: ${(error as Error).message}`,
			{ itemIndex },
		);
	}
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
		try {
			const parsed = jsonParse<unknown>(value);
			if (!Array.isArray(parsed)) {
				throw new NodeOperationError(
					this.getNode(),
					`Parameter "${parameterName}" must be a JSON array`,
					{ itemIndex },
				);
			}
			return parsed;
		} catch (error) {
			if (error instanceof NodeOperationError) throw error;
			throw new NodeOperationError(
				this.getNode(),
				`Parameter "${parameterName}" contains invalid JSON: ${(error as Error).message}`,
				{ itemIndex },
			);
		}
	}

	throw new NodeOperationError(this.getNode(), `Parameter "${parameterName}" must be an array`, {
		itemIndex,
	});
}

/**
 * Parse a list-valued UI field that accepts either a comma-separated string or
 * a JSON array, e.g. `pdf, docx` or `["pdf","docx"]`.
 */
export function parseStringList(
	this: IExecuteFunctions,
	raw: string | string[] | undefined,
	parameterName: string,
	itemIndex: number,
): string[] {
	if (raw === undefined || raw === null) return [];
	if (Array.isArray(raw)) return raw.map((entry) => String(entry));

	const trimmed = raw.trim();
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
 * Read a list-valued node parameter that accepts a comma-separated string or a
 * JSON array.
 */
export function getStringListParameter(
	this: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): string[] {
	const raw = this.getNodeParameter(parameterName, itemIndex, '') as string | string[];
	return parseStringList.call(this, raw, parameterName, itemIndex);
}

/**
 * Interpret a UI string value with smart typing: numbers, booleans, null and
 * JSON arrays/objects are parsed, anything else stays a string.
 */
export function smartParseValue(value: string, treatAsString: boolean): unknown {
	if (treatAsString) return value;
	const trimmed = value.trim();
	if (trimmed === '') return value;
	// Pure-integer strings outside the double-safe range would be silently
	// rounded by JSON.parse (Appwrite integer columns are 64-bit); keep the
	// original string so the value is never corrupted.
	if (/^-?\d+$/.test(trimmed) && !Number.isSafeInteger(Number(trimmed))) {
		return value;
	}
	if (
		/^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)$/.test(trimmed) ||
		trimmed.startsWith('[') ||
		trimmed.startsWith('{') ||
		(trimmed.startsWith('"') && trimmed.endsWith('"'))
	) {
		try {
			return JSON.parse(trimmed);
		} catch {
			return value;
		}
	}
	return value;
}

interface QueryCondition {
	type: string;
	column?: string;
	value?: string;
	value2?: string;
	values?: string;
	treatValueAsString?: boolean;
}

/**
 * Read the `method` of an encoded Appwrite query string, or '' when the query
 * is not a JSON-encoded query (which the SDK also accepts).
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
 * Limit query of their own — Appwrite rejects duplicate limit queries.
 */
export function withLimit(queries: string[], limit: number): string[] {
	if (queries.some((q) => queryMethod(q) === 'limit')) return queries;
	return [...queries, Query.limit(limit)];
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
		const parsed = parseJsonArrayParameter.call(this, raw, `${parameterName}Json`, itemIndex);
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
	// Column lists (Select) accept the same comma-separated form as every other
	// list-valued field in this node, as well as a JSON array.
	const columnList = (): string[] =>
		parseStringList.call(this, condition.values ?? condition.value ?? '', 'Select', itemIndex);

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
			return Query.startsWith(column, condition.value ?? '');
		case 'endsWith':
			return Query.endsWith(column, condition.value ?? '');
		case 'search':
			return Query.search(column, condition.value ?? '');
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
				return isLimit ? Query.limit(25) : Query.offset(0);
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
			return Query.cursorAfter(condition.value ?? '');
		case 'cursorBefore':
			return Query.cursorBefore(condition.value ?? '');
		default:
			throw new NodeOperationError(this.getNode(), `Unknown query type "${type}"`, { itemIndex });
	}
}

/**
 * Parse the permissions parameter into an array of Appwrite permission
 * strings, e.g. ['read("any")', 'update("team:abc")'].
 *
 * Returns `undefined` when the field is left blank, which Appwrite reads as
 * "inherit the current permissions" on update operations. An explicit empty
 * JSON array (`[]`) is passed through so that permissions can be cleared.
 */
export function getPermissions(
	this: IExecuteFunctions,
	itemIndex: number,
	parameterName = 'permissions',
): string[] | undefined {
	const raw = this.getNodeParameter(parameterName, itemIndex, '') as string | string[];
	if (raw === undefined || raw === null) return undefined;

	if (Array.isArray(raw)) return raw.map((p) => String(p));

	const trimmed = raw.trim();
	if (trimmed === '') return undefined;

	if (trimmed.startsWith('[')) {
		return parseJsonArrayParameter
			.call(this, trimmed, parameterName, itemIndex)
			.map((p) => String(p));
	}

	const permissions = trimmed
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '');

	return permissions.length > 0 ? permissions : undefined;
}

/**
 * Fetch the row data for create/update/upsert operations, supporting both the
 * key-value UI mode and the raw JSON mode. The fallback mirrors the UI default
 * of the `dataMode` parameter.
 */
export function getRowData(this: IExecuteFunctions, itemIndex: number): IDataObject {
	const mode = this.getNodeParameter('dataMode', itemIndex, 'fields') as string;

	if (mode === 'json') {
		const raw = this.getNodeParameter('dataJson', itemIndex, '{}');
		return parseJsonParameter.call(this, raw, 'dataJson', itemIndex);
	}

	const fields = this.getNodeParameter('dataFieldsUi', itemIndex, {}) as {
		fieldValues?: Array<{ fieldName: string; fieldValue: string; treatValueAsString?: boolean }>;
	};

	const data: IDataObject = {};
	for (const field of fields.fieldValues ?? []) {
		if (!field.fieldName) continue;
		data[field.fieldName] = smartParseValue(
			field.fieldValue ?? '',
			field.treatValueAsString ?? false,
		) as IDataObject[string];
	}
	return data;
}

/**
 * Paginate an Appwrite list endpoint until all results are fetched, in pages
 * of 100. Cursor pagination is used where the returned models carry $id;
 * models without one (e.g. columns and indexes) fall back to offset paging.
 * A user-supplied Cursor After or Offset query sets the starting point;
 * Return All overrides any Limit query.
 */
export async function fetchAllPages<T extends { $id?: string }>(
	ctx: IExecuteFunctions,
	itemIndex: number,
	baseQueries: string[],
	fetchPage: (queries: string[]) => Promise<{ rows?: T[]; total: number } | IDataObject>,
	listKey: string,
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
				ctx.getNode(),
				'A Cursor Before query cannot be combined with Return All',
				{
					itemIndex,
					description: 'Use Cursor After instead, or turn Return All off.',
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

	let cursor: string | undefined;
	for (let page = 0; ; page++) {
		const pageQueries = [...cleanQueries, Query.limit(100)];
		if (cursor !== undefined) {
			pageQueries.push(Query.cursorAfter(cursor));
		} else if (page === 0) {
			pageQueries.push(...initialQueries);
		} else {
			pageQueries.push(Query.offset(startOffset + results.length));
		}

		const response = (await fetchPage(pageQueries)) as unknown as Record<string, T[]>;
		const list = response[listKey] ?? [];
		results.push(...list);

		if (list.length < 100) break;
		cursor = list[list.length - 1].$id;
	}

	return results;
}

/**
 * Paginate a list endpoint that only supports limit/offset queries (e.g. the
 * audit log endpoints, whose entries carry no usable cursor). A user-supplied
 * Offset query sets the starting point, as it does for cursor pagination.
 */
export async function fetchAllPagesByOffset<T>(
	ctx: IExecuteFunctions,
	itemIndex: number,
	baseQueries: string[],
	fetchPage: (queries: string[]) => Promise<IDataObject>,
	listKey: string,
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
			if (typeof values[0] === 'number') startOffset = values[0];
			continue;
		}
		if (method === 'cursorAfter' || method === 'cursorBefore') {
			throw new NodeOperationError(
				ctx.getNode(),
				'Cursor queries are not supported by this endpoint',
				{
					itemIndex,
					description: 'This endpoint paginates by offset only. Use a Limit or Offset query.',
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
