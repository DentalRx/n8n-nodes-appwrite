import type {
	GenericValue,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildQueries, fetchAllPages, parseJsonArrayParameter } from '../GenericFunctions';
import { Query, extractId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

const RELATION_MUTATE_MAP: Record<string, string> = {
	cascade: 'cascade',
	restrict: 'restrict',
	setNull: 'setNull',
};

/** The column types whose update endpoint does not take a `default`. */
const SPATIAL_COLUMN_TYPES = new Set(['point', 'line', 'polygon']);

const RELATIONSHIP_TYPE_MAP: Record<string, string> = {
	oneToOne: 'oneToOne',
	oneToMany: 'oneToMany',
	manyToOne: 'manyToOne',
	manyToMany: 'manyToMany',
};

export async function executeColumnOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const databaseId = extractId(this.getNodeParameter('databaseId', i) as string, 'database');
	const tableId = extractId(this.getNodeParameter('tableId', i) as string, 'table');
	const columnsPath = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(
		tableId,
	)}/columns`;

	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'get') {
		const key = this.getNodeParameter('key', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`${columnsPath}/${encodeURIComponent(key)}`,
			{},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'delete') {
		const key = this.getNodeParameter('key', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`${columnsPath}/${encodeURIComponent(key)}`,
			{},
			i,
		);
		return toItems({ success: true, databaseId, tableId, key });
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const columns = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					(await appwriteApiRequest.call(
						this,
						'GET',
						columnsPath,
						{ qs: { queries: pageQueries } },
						i,
					)) as IDataObject,
				'columns',
			);
			return toItems(columns as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			columnsPath,
			{ qs: { queries: [...queries, Query.limit(limit)] } },
			i,
		)) as IDataObject;
		return toItems(response.columns as IDataObject[]);
	}

	if (operation !== 'create' && operation !== 'update') {
		throw new NodeOperationError(this.getNode(), `Unknown column operation "${operation}"`, {
			itemIndex: i,
		});
	}

	const columnType = this.getNodeParameter('columnType', i) as string;
	const isCreate = operation === 'create';
	const options = this.getNodeParameter('options', i, {}) as {
		array?: boolean;
		defaultValue?: string;
		encrypt?: boolean;
		max?: number | string;
		min?: number | string;
		newKey?: string;
		newSize?: number | string;
		onDelete?: string;
		twoWay?: boolean;
		twoWayKey?: string;
	};

	// Relationship columns have their own parameter set.
	if (columnType === 'relationship') {
		if (isCreate) {
			const onDelete = RELATION_MUTATE_MAP[options.onDelete ?? 'restrict'];
			const relatedTableId = extractId(
				this.getNodeParameter('relatedTableId', i) as string,
				'table',
			);
			const typeRaw = this.getNodeParameter('relationshipType', i) as string;
			const twoWay = options.twoWay ?? false;
			const relationshipKey = this.getNodeParameter('relationshipKey', i, '') as string;
			const twoWayKey = options.twoWayKey ?? '';
			const response = (await appwriteApiRequest.call(
				this,
				'POST',
				`${columnsPath}/relationship`,
				{
					body: {
						relatedTableId,
						type: RELATIONSHIP_TYPE_MAP[typeRaw],
						twoWay,
						key: relationshipKey === '' ? undefined : relationshipKey,
						twoWayKey: twoWayKey === '' ? undefined : twoWayKey,
						onDelete,
					},
				},
				i,
			)) as IDataObject;
			return toItems(response);
		}

		const key = this.getNodeParameter('key', i) as string;
		const newKeyRaw = options.newKey ?? '';
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${columnsPath}/${encodeURIComponent(key)}/relationship`,
			{
				body: {
					// Appwrite treats onDelete as optional here, so leaving the option
					// out has to omit it rather than restate a default that would
					// overwrite the column's existing referential action.
					onDelete:
						options.onDelete === undefined ? undefined : RELATION_MUTATE_MAP[options.onDelete],
					newKey: newKeyRaw === '' ? undefined : newKeyRaw,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	// All other column types share a common parameter set.
	const key = this.getNodeParameter('key', i) as string;
	const required = this.getNodeParameter('columnRequired', i, false) as boolean;
	const defaultRaw = options.defaultValue ?? '';
	const array = isCreate ? (options.array ?? false) : undefined;
	const newKeyRaw = isCreate ? '' : (options.newKey ?? '');
	const newKey = newKeyRaw === '' ? undefined : newKeyRaw;

	/** POST /tablesdb/{databaseId}/tables/{tableId}/columns/{type} */
	const createColumn = async (type: string, body: IDataObject): Promise<IDataObject> =>
		(await appwriteApiRequest.call(
			this,
			'POST',
			`${columnsPath}/${type}`,
			{ body },
			i,
		)) as IDataObject;

	/**
	 * PATCH /tablesdb/{databaseId}/tables/{tableId}/columns/{type}/{key}
	 *
	 * Appwrite marks `default` required-but-nullable on every scalar column
	 * update, so an absent Default Value has to be sent as an explicit null;
	 * omitting the key is rejected. The spatial types do not require it.
	 */
	const updateColumn = async (type: string, body: IDataObject): Promise<IDataObject> => {
		const payload =
			SPATIAL_COLUMN_TYPES.has(type) || body.default !== undefined
				? body
				: { ...body, default: null };
		return (await appwriteApiRequest.call(
			this,
			'PATCH',
			`${columnsPath}/${type}/${encodeURIComponent(key)}`,
			{ body: payload },
			i,
		)) as IDataObject;
	};

	/** Read a numeric option, reporting problems under the name the user sees. */
	const numericOption = (
		value: number | string | undefined,
		displayName: string,
	): number | undefined => {
		if (value === undefined || value === '') return undefined;
		const parsed = Number(value);
		if (Number.isNaN(parsed)) {
			throw new NodeOperationError(this.getNode(), `Parameter "${displayName}" must be a number`, {
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

	const spatialDefault = (): GenericValue[] | undefined => {
		if (defaultRaw === '') return undefined;
		return parseJsonArrayParameter.call(this, defaultRaw, 'Default Value', i) as GenericValue[];
	};

	const getElements = (): string[] => {
		const raw = this.getNodeParameter('elements', i) as string;
		if (raw.trim().startsWith('[')) {
			return parseJsonArrayParameter.call(this, raw, 'elements', i).map((e) => String(e));
		}
		return raw
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e !== '');
	};

	let response: IDataObject;

	switch (columnType) {
		case 'boolean':
			response = isCreate
				? await createColumn('boolean', {
						key,
						required,
						default: booleanDefault(),
						array,
					})
				: await updateColumn('boolean', {
						required,
						default: booleanDefault(),
						newKey,
					});
			break;
		case 'datetime':
			response = isCreate
				? await createColumn('datetime', {
						key,
						required,
						default: stringDefault,
						array,
					})
				: await updateColumn('datetime', {
						required,
						default: stringDefault,
						newKey,
					});
			break;
		case 'email':
			response = isCreate
				? await createColumn('email', {
						key,
						required,
						default: stringDefault,
						array,
					})
				: await updateColumn('email', {
						required,
						default: stringDefault,
						newKey,
					});
			break;
		case 'enum':
			response = isCreate
				? await createColumn('enum', {
						key,
						elements: getElements(),
						required,
						default: stringDefault,
						array,
					})
				: await updateColumn('enum', {
						elements: getElements(),
						required,
						default: stringDefault,
						newKey,
					});
			break;
		case 'float':
			response = isCreate
				? await createColumn('float', {
						key,
						required,
						min: numericOption(options.min, 'Minimum'),
						max: numericOption(options.max, 'Maximum'),
						default: numberDefault(),
						array,
					})
				: await updateColumn('float', {
						required,
						default: numberDefault(),
						min: numericOption(options.min, 'Minimum'),
						max: numericOption(options.max, 'Maximum'),
						newKey,
					});
			break;
		case 'integer':
			response = isCreate
				? await createColumn('integer', {
						key,
						required,
						min: numericOption(options.min, 'Minimum'),
						max: numericOption(options.max, 'Maximum'),
						default: numberDefault(),
						array,
					})
				: await updateColumn('integer', {
						required,
						default: numberDefault(),
						min: numericOption(options.min, 'Minimum'),
						max: numericOption(options.max, 'Maximum'),
						newKey,
					});
			break;
		case 'ip':
			response = isCreate
				? await createColumn('ip', {
						key,
						required,
						default: stringDefault,
						array,
					})
				: await updateColumn('ip', {
						required,
						default: stringDefault,
						newKey,
					});
			break;
		case 'line':
			response = isCreate
				? await createColumn('line', {
						key,
						required,
						default: spatialDefault(),
					})
				: await updateColumn('line', {
						required,
						default: spatialDefault(),
						newKey,
					});
			break;
		case 'point':
			response = isCreate
				? await createColumn('point', {
						key,
						required,
						default: spatialDefault(),
					})
				: await updateColumn('point', {
						required,
						default: spatialDefault(),
						newKey,
					});
			break;
		case 'polygon':
			response = isCreate
				? await createColumn('polygon', {
						key,
						required,
						default: spatialDefault(),
					})
				: await updateColumn('polygon', {
						required,
						default: spatialDefault(),
						newKey,
					});
			break;
		case 'string':
			response = isCreate
				? await createColumn('string', {
						key,
						size: this.getNodeParameter('size', i, 255) as number,
						required,
						default: stringDefault,
						array,
						encrypt: options.encrypt ?? false,
					})
				: await updateColumn('string', {
						required,
						default: stringDefault,
						size: numericOption(options.newSize, 'New Size'),
						newKey,
					});
			break;
		case 'url':
			response = isCreate
				? await createColumn('url', {
						key,
						required,
						default: stringDefault,
						array,
					})
				: await updateColumn('url', {
						required,
						default: stringDefault,
						newKey,
					});
			break;
		default:
			throw new NodeOperationError(this.getNode(), `Unknown column type "${columnType}"`, {
				itemIndex: i,
			});
	}

	return toItems(response);
}
