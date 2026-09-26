import { id, ref, RUN, email } from '../common.mjs';

const DB = id('db');
const T = id('tbl');
const REL = id('rel');
const at = (extra) => ({ databaseId: DB, tableId: T, ...extra });
const field = (fieldName, fieldValue) => ({ fieldName, fieldValue });
const col = (name, columnType, extra = {}) => ({
	name: `Column ${name} (${columnType})`,
	op: 'column.create',
	set: at({ columnType, key: name, ...extra }),
});

export default [
	{
		key: 'DB',
		title: 'TablesDB: databases, tables, columns, indexes, rows, transactions',
		steps: [
			{ name: 'Create Database', op: 'database.create', set: { databaseId: DB, name: 'Test DB' } },
			{ name: 'Get Database', op: 'database.get', set: { databaseId: DB } },
			{ name: 'Get Many Databases', op: 'database.getMany', set: { limit: 5 } },
			{
				name: 'Update Database',
				op: 'database.update',
				set: { databaseId: DB, name: 'Renamed DB', updateFields: { enabled: true } },
			},
			{
				name: 'Create Table',
				op: 'table.create',
				set: { databaseId: DB, tableId: T, name: 'Items', permissions: 'read("any")' },
			},
			{
				name: 'Create Related Table',
				op: 'table.create',
				set: { databaseId: DB, tableId: REL, name: 'Categories' },
			},
			{ name: 'Get Table', op: 'table.get', set: at({}) },
			{ name: 'Get Many Tables', op: 'table.getMany', set: { databaseId: DB } },
			{
				name: 'Update Table',
				op: 'table.update',
				set: at({ name: 'Items (renamed)', updateFields: { rowSecurity: true } }),
			},
			col('title', 'varchar', { size: 128 }),
			col('qty', 'integer', { options: { min: 0, max: 1000, defaultValue: '0' } }),
			col('price', 'float'),
			col('active', 'boolean', { options: { defaultValue: 'true' } }),
			col('due', 'datetime'),
			col('contact', 'email'),
			col('status', 'enum', { elements: 'new,open,closed' }),
			col('addr', 'ip'),
			col('site', 'url'),
			col('notes', 'text'),
			col('summary', 'mediumtext'),
			col('body', 'longtext'),
			col('legacy', 'string'),
			col('big', 'bigint'),
			col('loc', 'point'),
			col('route', 'line'),
			col('area', 'polygon'),
			{
				name: 'Column name (varchar, related table)',
				op: 'column.create',
				set: { databaseId: DB, tableId: REL, columnType: 'varchar', key: 'name', size: 64 },
			},
			{
				name: 'Column category (relationship)',
				op: 'column.create',
				set: at({
					columnType: 'relationship',
					relatedTableId: REL,
					relationshipType: 'manyToOne',
					key: 'category',
					options: { onDelete: 'setNull' },
				}),
			},
			{ name: 'Wait For Columns', wait: 10 },
			{ name: 'Get Column', op: 'column.get', set: at({ key: 'title' }) },
			{ name: 'Get Many Columns', op: 'column.getMany', set: at({}) },
			{
				name: 'Update Column (varchar)',
				op: 'column.update',
				set: at({ columnType: 'varchar', key: 'title', options: { newSize: 200 } }),
			},
			{
				name: 'Update Column (integer)',
				op: 'column.update',
				set: at({ columnType: 'integer', key: 'qty', options: { min: 0, max: 5000 } }),
			},
			{
				name: 'Update Column (enum)',
				op: 'column.update',
				set: at({ columnType: 'enum', key: 'status', elements: 'new,open,closed,archived' }),
			},
			{
				name: 'Update Column (relationship)',
				op: 'column.update',
				set: at({ columnType: 'relationship', key: 'category', options: { onDelete: 'cascade' } }),
			},
			{
				name: 'Create Index (key)',
				op: 'index.create',
				set: at({ key: 'idx_title', indexType: 'key', columns: 'title' }),
			},
			{
				name: 'Create Index (unique)',
				op: 'index.create',
				set: at({ key: 'idx_contact', indexType: 'unique', columns: 'contact' }),
			},
			{
				name: 'Create Index (fulltext)',
				op: 'index.create',
				set: at({ key: 'idx_notes', indexType: 'fulltext', columns: 'notes' }),
			},
			{ name: 'Wait For Indexes', wait: 6 },
			{ name: 'Get Index', op: 'index.get', set: at({ key: 'idx_title' }) },
			{ name: 'Get Many Indexes', op: 'index.getMany', set: at({}) },
			{
				name: 'Create Category Row',
				op: 'row.create',
				set: {
					databaseId: DB,
					tableId: REL,
					rowId: id('c1'),
					dataFieldsUi: { fieldValues: [field('name', 'Hardware')] },
				},
			},
			{
				name: 'Create Row (fields)',
				op: 'row.create',
				set: at({
					rowId: id('r1'),
					dataFieldsUi: {
						fieldValues: [
							field('title', 'First'),
							field('qty', '5'),
							field('price', '9.99'),
							field('active', 'true'),
							field('status', 'new'),
							field('contact', 'first@example.com'),
							field('category', `={{ 'c1' + ${RUN} }}`),
						],
					},
				}),
			},
			{
				name: 'Create Row (JSON)',
				op: 'row.create',
				set: at({
					rowId: id('r2'),
					dataMode: 'json',
					dataJson:
						'{"title":"Second","qty":3,"status":"open","due":"2026-10-01T10:00:00.000Z","addr":"10.0.0.1","site":"https://example.com","notes":"hello world","big":1234567890123,"loc":[-79.38,43.65]}',
				}),
			},
			{
				name: 'Create Many Rows',
				op: 'row.createMany',
				set: at({
					rowsJson:
						'[{"title":"Bulk A","qty":1,"status":"open"},{"title":"Bulk B","qty":2,"status":"closed"}]',
				}),
			},
			{
				name: 'Upsert Row',
				op: 'row.upsert',
				set: at({
					rowId: id('r3'),
					dataFieldsUi: { fieldValues: [field('title', 'Upserted'), field('qty', '4')] },
				}),
			},
			{
				name: 'Upsert Many Rows',
				op: 'row.upsertMany',
				set: at({
					rowsJson: `={{ JSON.stringify([{ $id: 'r3' + ${RUN}, title: 'Upserted again', qty: 7 }, { title: 'Upserted new', qty: 8 }]) }}`,
				}),
			},
			{ name: 'Get Row', op: 'row.get', set: at({ rowId: id('r1') }) },
			{
				name: 'Get Row (select)',
				op: 'row.get',
				set: at({
					rowId: id('r1'),
					queriesUi: { queryValues: [{ type: 'select', value: 'title,qty' }] },
				}),
			},
			{ name: 'Get Many Rows', op: 'row.getMany', set: at({ limit: 10 }) },
			{
				name: 'Get Many Rows (query + sort)',
				op: 'row.getMany',
				set: at({
					queriesUi: { queryValues: [{ type: 'greaterThan', column: 'qty', value: '1' }] },
					sortUi: { sortValues: [{ column: 'qty', direction: 'desc' }] },
				}),
			},
			{ name: 'Get Many Rows (return all)', op: 'row.getMany', set: at({ returnAll: true }) },
			{
				name: 'Update Row',
				op: 'row.update',
				set: at({
					rowId: id('r1'),
					dataFieldsUi: { fieldValues: [field('title', 'First (edited)')] },
				}),
			},
			{
				name: 'Increment',
				op: 'row.increment',
				set: at({ rowId: id('r1'), column: 'qty', amount: 2 }),
			},
			{
				name: 'Decrement',
				op: 'row.decrement',
				set: at({ rowId: id('r1'), column: 'qty', amount: 1, options: { min: 0 } }),
			},
			{
				name: 'Update Many',
				op: 'row.updateMany',
				set: at({
					dataMode: 'json',
					dataJson: '{"active":false}',
					queriesUi: { queryValues: [{ type: 'equal', column: 'status', value: 'open' }] },
				}),
			},
			{ name: 'Create Transaction', op: 'transaction.create', set: { ttl: 300 } },
			{
				name: 'Create Row In Transaction',
				op: 'row.create',
				set: at({
					rowId: id('rt'),
					dataFieldsUi: { fieldValues: [field('title', 'In transaction')] },
					options: { transactionId: ref('DB: Create Transaction') },
				}),
			},
			{
				name: 'Create Operations',
				op: 'transaction.createOperations',
				set: {
					transactionId: ref('DB: Create Transaction'),
					operationsJson: `={{ JSON.stringify([{ action: 'create', databaseId: 'db' + ${RUN}, tableId: 'tbl' + ${RUN}, rowId: 'unique()', data: { title: 'Staged operation' } }]) }}`,
				},
			},
			{
				name: 'Get Transaction',
				op: 'transaction.get',
				set: { transactionId: ref('DB: Create Transaction') },
			},
			{ name: 'Get Many Transactions', op: 'transaction.getMany', set: { limit: 5 } },
			{
				name: 'Commit Transaction',
				op: 'transaction.commit',
				set: { transactionId: ref('DB: Create Transaction') },
			},
			{ name: 'Get Committed Row', op: 'row.get', set: at({ rowId: id('rt') }) },
			{ name: 'Create Transaction 2', op: 'transaction.create' },
			{
				name: 'Rollback Transaction',
				op: 'transaction.rollback',
				set: { transactionId: ref('DB: Create Transaction 2') },
			},
			{ name: 'Create Transaction 3', op: 'transaction.create' },
			{
				name: 'Delete Transaction',
				op: 'transaction.delete',
				set: { transactionId: ref('DB: Create Transaction 3') },
			},
			{ name: 'Delete Row', op: 'row.delete', set: at({ rowId: id('r2') }) },
			{
				name: 'Delete Many (query)',
				op: 'row.deleteMany',
				set: at({
					queriesUi: { queryValues: [{ type: 'equal', column: 'title', value: 'Bulk A' }] },
				}),
			},
			{ name: 'Delete Many (all rows)', op: 'row.deleteMany', set: at({ applyToAll: true }) },
			{ name: 'Delete Index', op: 'index.delete', set: at({ key: 'idx_title' }) },
			{ name: 'Delete Column', op: 'column.delete', set: at({ key: 'site' }) },
			{ name: 'Delete Relationship Column', op: 'column.delete', set: at({ key: 'category' }) },
			{ name: 'Get Status', op: 'database.getStatus', set: { databaseId: DB } },
			{ name: 'Get Replicas', op: 'database.getReplicas', set: { databaseId: DB } },
			{ name: 'Get Many Operations', op: 'database.getManyOperations', set: { databaseId: DB } },
			{ name: 'Get Many Specifications', op: 'database.getManySpecifications' },
			{ name: 'Get Many Migrations', op: 'database.getManyMigrations', set: { databaseId: DB } },
			{
				name: 'Get Migration (unknown ID)',
				op: 'database.getMigration',
				set: { databaseId: DB, databaseMigrationId: 'no-such-migration' },
			},
			{
				name: 'Create Migration (invalid spec)',
				op: 'database.createMigration',
				set: { databaseId: DB, databaseSpecification: 'no-such-specification' },
			},
			{
				name: 'Create Cutover (unknown ID)',
				op: 'database.createCutover',
				set: { databaseId: DB, databaseMigrationId: 'no-such-migration' },
			},
			{
				name: 'Delete Migration (unknown ID)',
				op: 'database.deleteMigration',
				set: { databaseId: DB, databaseMigrationId: 'no-such-migration' },
			},
			{
				name: 'Create Failover (shared DB)',
				op: 'database.createFailover',
				set: { databaseId: DB },
			},
			{ name: 'Delete Table', op: 'table.delete', set: at({}) },
			{ name: 'Delete Related Table', op: 'table.delete', set: { databaseId: DB, tableId: REL } },
			{ name: 'Delete Database', op: 'database.delete', set: { databaseId: DB } },
		],
	},
];
