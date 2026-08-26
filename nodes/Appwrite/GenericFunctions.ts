import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import { Client, Query } from 'node-appwrite';

/**
 * Build an authenticated Appwrite client from the node credentials.
 */
export async function getAppwriteClient(this: IExecuteFunctions): Promise<Client> {
	const credentials = await this.getCredentials('appwriteApi');

	const endpoint = (credentials.endpoint as string).replace(/\/+$/, '');
	const projectId = credentials.projectId as string;
	const apiKey = credentials.apiKey as string;

	return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
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
	if (typeof value === 'object') return value as IDataObject;

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
 * Interpret a UI string value with smart typing: numbers, booleans, null and
 * JSON arrays/objects are parsed, anything else stays a string.
 */
export function smartParseValue(value: string, treatAsString: boolean): unknown {
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
	const listValues = (): unknown[] => {
		const raw = condition.values ?? condition.value ?? '';
		const parsed = smartParseValue(raw, false);
		return Array.isArray(parsed) ? parsed : [parsed];
	};

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
			return Query.select(listValues() as string[]);
		case 'orderAsc':
			return Query.orderAsc(column);
		case 'orderDesc':
			return Query.orderDesc(column);
		case 'limit':
			return Query.limit(Number(condition.value ?? 25));
		case 'offset':
			return Query.offset(Number(condition.value ?? 0));
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
 */
export function getPermissions(
	this: IExecuteFunctions,
	itemIndex: number,
	parameterName = 'permissions',
): string[] | undefined {
	const raw = this.getNodeParameter(parameterName, itemIndex, '') as string | string[];
	if (raw === '' || raw === undefined || raw === null) return undefined;

	let permissions: unknown[];
	if (Array.isArray(raw)) {
		permissions = raw;
	} else if (typeof raw === 'string' && raw.trim().startsWith('[')) {
		permissions = parseJsonArrayParameter.call(this, raw, parameterName, itemIndex);
	} else {
		permissions = raw
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line !== '');
	}

	const result = permissions.map((p) => String(p));
	return result.length > 0 ? result : undefined;
}

/**
 * Fetch the row data for create/update/upsert operations, supporting both the
 * key-value UI mode and the raw JSON mode.
 */
export function getRowData(this: IExecuteFunctions, itemIndex: number): IDataObject {
	const mode = this.getNodeParameter('dataMode', itemIndex, 'json') as string;

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
 * Paginate an Appwrite list endpoint until all results are fetched, using
 * cursor pagination in pages of 100 (queries may not contain cursor/limit).
 */
export async function fetchAllPages<T extends { $id: string }>(
	baseQueries: string[],
	fetchPage: (queries: string[]) => Promise<{ rows?: T[]; total: number } | IDataObject>,
	listKey: string,
): Promise<T[]> {
	const results: T[] = [];
	let cursor: string | undefined;

	// Cursor pagination breaks if the caller also set cursor queries; strip them.
	const cleanQueries = baseQueries.filter((q) => {
		try {
			const parsed = JSON.parse(q) as { method?: string };
			return !['limit', 'cursorAfter', 'cursorBefore', 'offset'].includes(parsed.method ?? '');
		} catch {
			return true;
		}
	});

	for (;;) {
		const pageQueries = [...cleanQueries, Query.limit(100)];
		if (cursor) pageQueries.push(Query.cursorAfter(cursor));

		const response = (await fetchPage(pageQueries)) as unknown as Record<string, T[]>;
		const page = response[listKey] ?? [];
		results.push(...page);

		if (page.length < 100) break;
		cursor = page[page.length - 1].$id;
	}

	return results;
}
