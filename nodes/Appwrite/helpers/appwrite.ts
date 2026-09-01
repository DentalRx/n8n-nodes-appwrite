import type { IDataObject } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

/**
 * Appwrite query strings, matching the wire format the Appwrite API expects:
 * a JSON object of `{ method, attribute, values }`.
 *
 * Replicates the query helpers of the Appwrite SDK so the node needs no
 * runtime dependencies (n8n community nodes must ship without any).
 */
function query(method: string, attribute?: string, values?: unknown): string {
	const payload: IDataObject = { method };
	if (attribute !== undefined) payload.attribute = attribute;
	if (values !== undefined) payload.values = Array.isArray(values) ? values : [values];
	return JSON.stringify(payload);
}

export const Query = {
	equal: (attribute: string, value: unknown) => query('equal', attribute, value),
	notEqual: (attribute: string, value: unknown) => query('notEqual', attribute, value),
	lessThan: (attribute: string, value: unknown) => query('lessThan', attribute, value),
	lessThanEqual: (attribute: string, value: unknown) => query('lessThanEqual', attribute, value),
	greaterThan: (attribute: string, value: unknown) => query('greaterThan', attribute, value),
	greaterThanEqual: (attribute: string, value: unknown) =>
		query('greaterThanEqual', attribute, value),
	between: (attribute: string, start: unknown, end: unknown) =>
		query('between', attribute, [start, end]),
	isNull: (attribute: string) => query('isNull', attribute),
	isNotNull: (attribute: string) => query('isNotNull', attribute),
	startsWith: (attribute: string, value: string) => query('startsWith', attribute, value),
	endsWith: (attribute: string, value: string) => query('endsWith', attribute, value),
	search: (attribute: string, value: string) => query('search', attribute, value),
	contains: (attribute: string, value: unknown) => query('contains', attribute, value),
	select: (attributes: string[]) => query('select', undefined, attributes),
	orderAsc: (attribute: string) => query('orderAsc', attribute),
	orderDesc: (attribute: string) => query('orderDesc', attribute),
	limit: (value: number) => query('limit', undefined, value),
	offset: (value: number) => query('offset', undefined, value),
	cursorAfter: (rowId: string) => query('cursorAfter', undefined, rowId),
	cursorBefore: (rowId: string) => query('cursorBefore', undefined, rowId),
};

/**
 * Generate a unique ID the way the Appwrite SDK does: a hex timestamp plus
 * random hex padding.
 */
export function uniqueId(padding = 7): string {
	const now = new Date();
	const seconds = Math.floor(now.getTime() / 1000);
	const hexTimestamp = seconds.toString(16) + now.getMilliseconds().toString(16).padStart(5, '0');

	// CSPRNG-backed padding: Math.random's small state space made ID collisions
	// between parallel executions plausible, and crypto costs nothing here.
	const randomPadding = randomBytes(Math.ceil(padding / 2))
		.toString('hex')
		.slice(0, padding);

	return hexTimestamp + randomPadding;
}

/**
 * Resolve an ID parameter: an empty value or the literal `unique()` means
 * "let Appwrite pick one".
 */
export function resolveId(value: string): string {
	return value === '' || value === 'unique()' ? uniqueId() : value;
}

/**
 * Accept either a bare Appwrite ID or a URL copied out of the Appwrite Console.
 * Console URLs carry the ID as a `<kind>-<id>` path segment, e.g.
 * `.../databases/database-main/table-orders`.
 */
export function extractId(value: string, kind: string): string {
	const trimmed = value.trim();
	if (!/^https?:\/\//i.test(trimmed)) return trimmed;

	const prefix = `${kind}-`;
	const segments = trimmed.split(/[/?#]/);
	for (let index = segments.length - 1; index >= 0; index--) {
		if (segments[index].startsWith(prefix)) return segments[index].slice(prefix.length);
	}

	return trimmed;
}
