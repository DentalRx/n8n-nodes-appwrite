/**
 * Appwrite's dedicated databases are managed MongoDB, MySQL, and PostgreSQL
 * servers. The three engines share one API under their own path prefix, so
 * the node offers them as one resource with an engine selector.
 */
export interface DatabaseEngine {
	/** The engine's name as the UI shows it. */
	name: string;
	/** The value Appwrite reports as a database's `engine`. */
	value: string;
	/** The API path prefix, which for MongoDB is not its engine name. */
	path: string;
}

export const DATABASE_ENGINES: DatabaseEngine[] = [
	{ name: 'MongoDB', value: 'mongodb', path: '/mongo' },
	{ name: 'MySQL', value: 'mysql', path: '/mysql' },
	{ name: 'PostgreSQL', value: 'postgresql', path: '/postgresql' },
];

/** Operations only MySQL and PostgreSQL offer: both have a connection pooler and run SQL. */
const SQL_ENGINE_OPERATIONS = ['executeSql', 'getPooler', 'updatePooler'];

/** Operations only PostgreSQL offers. */
const POSTGRESQL_OPERATIONS = ['getManyExtensions', 'installExtension', 'uninstallExtension'];

/** The engines that offer an operation. */
export function enginesFor(operation: string): DatabaseEngine[] {
	if (SQL_ENGINE_OPERATIONS.includes(operation)) {
		return DATABASE_ENGINES.filter((engine) => engine.value !== 'mongodb');
	}
	if (POSTGRESQL_OPERATIONS.includes(operation)) {
		return DATABASE_ENGINES.filter((engine) => engine.value === 'postgresql');
	}
	return DATABASE_ENGINES;
}

/** The engine with the given value, or undefined for an unknown one. */
export function findEngine(value: unknown): DatabaseEngine | undefined {
	return DATABASE_ENGINES.find((engine) => engine.value === value);
}
