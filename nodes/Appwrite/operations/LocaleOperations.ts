import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { appwriteApiRequest } from '../transport';

/** Each locale operation is a plain GET whose results live under one response key. */
const LOCALE_OPERATIONS: Record<string, { path: string; listKey?: string }> = {
	get: { path: '/locale' },
	getManyContinents: { path: '/locale/continents', listKey: 'continents' },
	getManyCountries: { path: '/locale/countries', listKey: 'countries' },
	getManyCurrencies: { path: '/locale/currencies', listKey: 'currencies' },
	getManyEuCountries: { path: '/locale/countries/eu', listKey: 'countries' },
	getManyLanguages: { path: '/locale/languages', listKey: 'languages' },
	getManyLocaleCodes: { path: '/locale/codes', listKey: 'localeCodes' },
	getManyPhoneCodes: { path: '/locale/countries/phones', listKey: 'phones' },
};

export async function executeLocaleOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	const target = LOCALE_OPERATIONS[operation];
	if (target === undefined) {
		throw new NodeOperationError(this.getNode(), `Unknown locale operation "${operation}"`, {
			itemIndex: i,
		});
	}

	const response = await appwriteApiRequest.call(this, 'GET', target.path, {}, i);

	if (target.listKey === undefined) return toItems(response);
	return toItems((response[target.listKey] ?? []) as IDataObject[]);
}
