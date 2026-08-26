import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { RelationMutate, RelationshipType, type TablesDB } from 'node-appwrite';

import {
	buildQueries,
	fetchAllPages,
	getStringListParameter,
	lookupEnum,
	parseJsonArrayParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';

const RELATION_MUTATE_MAP: Record<string, RelationMutate> = {
	cascade: RelationMutate.Cascade,
	restrict: RelationMutate.Restrict,
	setNull: RelationMutate.SetNull,
};

const RELATIONSHIP_TYPE_MAP: Record<string, RelationshipType> = {
	oneToOne: RelationshipType.OneToOne,
	oneToMany: RelationshipType.OneToMany,
	manyToOne: RelationshipType.ManyToOne,
	manyToMany: RelationshipType.ManyToMany,
};

export async function executeColumnOperation(
	this: IExecuteFunctions,
	tablesDB: TablesDB,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = this.getNodeParameter('databaseId', i) as string;
	const tableId = this.getNodeParameter('tableId', i) as string;

	if (operation === 'get') {
		const key = this.getNodeParameter('key', i) as string;
		const response = await tablesDB.getColumn({ databaseId, tableId, key });
		return toItems(response as unknown as IDataObject, i);
	}

	if (operation === 'delete') {
		const key = this.getNodeParameter('key', i) as string;
		await tablesDB.deleteColumn({ databaseId, tableId, key });
		return toItems({ success: true, databaseId, tableId, key }, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const columns = await fetchAllPages(
				this,
				i,
				queries,
				async (pageQueries) =>
					(await tablesDB.listColumns({
						databaseId,
						tableId,
						queries: pageQueries,
					})) as unknown as IDataObject,
				'columns',
			);
			return toItems(columns as unknown as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await tablesDB.listColumns({
			databaseId,
			tableId,
			queries: withLimit(queries, limit),
		});
		return toItems(response.columns as unknown as IDataObject[], i);
	}

	if (operation !== 'create' && operation !== 'update') {
		throw new NodeOperationError(this.getNode(), `Unknown column operation "${operation}"`, {
			itemIndex: i,
		});
	}

	const columnType = this.getNodeParameter('columnType', i) as string;
	const isCreate = operation === 'create';

	// Relationship columns have their own parameter set.
	if (columnType === 'relationship') {
		const onDeleteRaw = this.getNodeParameter('onDelete', i, 'restrict') as string;
		const onDelete = lookupEnum(this, RELATION_MUTATE_MAP, onDeleteRaw, 'on-delete action', i);

		if (isCreate) {
			const relatedTableId = this.getNodeParameter('relatedTableId', i) as string;
			const typeRaw = this.getNodeParameter('relationshipType', i) as string;
			const twoWay = this.getNodeParameter('twoWay', i, false) as boolean;
			const relationshipKey = this.getNodeParameter('relationshipKey', i, '') as string;
			const twoWayKey = this.getNodeParameter('twoWayKey', i, '') as string;
			const response = await tablesDB.createRelationshipColumn({
				databaseId,
				tableId,
				relatedTableId,
				type: lookupEnum(this, RELATIONSHIP_TYPE_MAP, typeRaw, 'relationship type', i),
				twoWay,
				key: relationshipKey === '' ? undefined : relationshipKey,
				twoWayKey: twoWayKey === '' ? undefined : twoWayKey,
				onDelete,
			});
			return toItems(response as unknown as IDataObject, i);
		}

		const key = this.getNodeParameter('key', i) as string;
		const newKeyRaw = this.getNodeParameter('newKey', i, '') as string;
		const response = await tablesDB.updateRelationshipColumn({
			databaseId,
			tableId,
			key,
			onDelete,
			newKey: newKeyRaw === '' ? undefined : newKeyRaw,
		});
		return toItems(response as unknown as IDataObject, i);
	}

	// All other column types share a common parameter set.
	const key = this.getNodeParameter('key', i) as string;
	const required = this.getNodeParameter('columnRequired', i, false) as boolean;
	const defaultRaw = this.getNodeParameter('defaultValue', i, '') as string;
	const array = isCreate ? (this.getNodeParameter('array', i, false) as boolean) : undefined;
	const newKeyRaw = isCreate ? '' : (this.getNodeParameter('newKey', i, '') as string);
	const newKey = newKeyRaw === '' ? undefined : newKeyRaw;

	const parseNumericBound = (name: string): number | undefined => {
		const raw = this.getNodeParameter(name, i, '') as string;
		if (raw === '') return undefined;
		const parsed = Number(raw);
		if (Number.isNaN(parsed)) {
			throw new NodeOperationError(this.getNode(), `Parameter "${name}" must be a number`, {
				itemIndex: i,
			});
		}
		return parsed;
	};

	const stringDefault = defaultRaw === '' ? undefined : defaultRaw;

	const booleanDefault = (): boolean | undefined => {
		if (defaultRaw === '') return undefined;
		if (defaultRaw !== 'true' && defaultRaw !== 'false') {
			throw new NodeOperationError(
				this.getNode(),
				'Default Value for a boolean column must be "true" or "false"',
				{ itemIndex: i },
			);
		}
		return defaultRaw === 'true';
	};

	const numberDefault = (): number | undefined => {
		if (defaultRaw === '') return undefined;
		const parsed = Number(defaultRaw);
		if (Number.isNaN(parsed)) {
			throw new NodeOperationError(
				this.getNode(),
				'Default Value for a numeric column must be a number',
				{ itemIndex: i },
			);
		}
		return parsed;
	};

	const spatialDefault = (): unknown[] | undefined => {
		if (defaultRaw === '') return undefined;
		return parseJsonArrayParameter.call(this, defaultRaw, 'defaultValue', i);
	};

	let response: IDataObject;

	switch (columnType) {
		case 'boolean':
			response = (
				isCreate
					? await tablesDB.createBooleanColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: booleanDefault(),
							array,
						})
					: await tablesDB.updateBooleanColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: booleanDefault(),
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'datetime':
			response = (
				isCreate
					? await tablesDB.createDatetimeColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							array,
						})
					: await tablesDB.updateDatetimeColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'email':
			response = (
				isCreate
					? await tablesDB.createEmailColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							array,
						})
					: await tablesDB.updateEmailColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'enum':
			response = (
				isCreate
					? await tablesDB.createEnumColumn({
							databaseId,
							tableId,
							key,
							elements: getStringListParameter.call(this, 'elements', i),
							required,
							xdefault: stringDefault,
							array,
						})
					: await tablesDB.updateEnumColumn({
							databaseId,
							tableId,
							key,
							elements: getStringListParameter.call(this, 'elements', i),
							required,
							xdefault: stringDefault,
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'float':
			response = (
				isCreate
					? await tablesDB.createFloatColumn({
							databaseId,
							tableId,
							key,
							required,
							min: parseNumericBound('min'),
							max: parseNumericBound('max'),
							xdefault: numberDefault(),
							array,
						})
					: await tablesDB.updateFloatColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: numberDefault(),
							min: parseNumericBound('min'),
							max: parseNumericBound('max'),
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'integer':
			response = (
				isCreate
					? await tablesDB.createIntegerColumn({
							databaseId,
							tableId,
							key,
							required,
							min: parseNumericBound('min'),
							max: parseNumericBound('max'),
							xdefault: numberDefault(),
							array,
						})
					: await tablesDB.updateIntegerColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: numberDefault(),
							min: parseNumericBound('min'),
							max: parseNumericBound('max'),
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'ip':
			response = (
				isCreate
					? await tablesDB.createIpColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							array,
						})
					: await tablesDB.updateIpColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'line':
			response = (
				isCreate
					? await tablesDB.createLineColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: spatialDefault(),
						})
					: await tablesDB.updateLineColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: spatialDefault(),
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'point':
			response = (
				isCreate
					? await tablesDB.createPointColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: spatialDefault(),
						})
					: await tablesDB.updatePointColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: spatialDefault(),
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'polygon':
			response = (
				isCreate
					? await tablesDB.createPolygonColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: spatialDefault(),
						})
					: await tablesDB.updatePolygonColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: spatialDefault(),
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'string':
			response = (
				isCreate
					? await tablesDB.createStringColumn({
							databaseId,
							tableId,
							key,
							size: this.getNodeParameter('size', i, 255) as number,
							required,
							xdefault: stringDefault,
							array,
							encrypt: this.getNodeParameter('encrypt', i, false) as boolean,
						})
					: await tablesDB.updateStringColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							size: (() => {
								const raw = this.getNodeParameter('newSize', i, '') as string;
								if (raw === '') return undefined;
								const parsed = Number(raw);
								if (Number.isNaN(parsed)) {
									throw new NodeOperationError(
										this.getNode(),
										'Parameter "New Size" must be a number',
										{ itemIndex: i },
									);
								}
								return parsed;
							})(),
							newKey,
						})
			) as unknown as IDataObject;
			break;
		case 'url':
			response = (
				isCreate
					? await tablesDB.createUrlColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							array,
						})
					: await tablesDB.updateUrlColumn({
							databaseId,
							tableId,
							key,
							required,
							xdefault: stringDefault,
							newKey,
						})
			) as unknown as IDataObject;
			break;
		default:
			throw new NodeOperationError(this.getNode(), `Unknown column type "${columnType}"`, {
				itemIndex: i,
			});
	}

	return toItems(response, i);
}
