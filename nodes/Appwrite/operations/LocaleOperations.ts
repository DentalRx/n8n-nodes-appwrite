import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Locale } from 'node-appwrite';

export async function executeLocaleOperation(
	this: IExecuteFunctions,
	locale: Locale,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'get') {
		const response = await locale.get();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getManyContinents') {
		const response = await locale.listContinents();
		return toItems(response.continents as unknown as IDataObject[]);
	}

	if (operation === 'getManyCountries') {
		const response = await locale.listCountries();
		return toItems(response.countries as unknown as IDataObject[]);
	}

	if (operation === 'getManyCurrencies') {
		const response = await locale.listCurrencies();
		return toItems(response.currencies as unknown as IDataObject[]);
	}

	if (operation === 'getManyEuCountries') {
		const response = await locale.listCountriesEU();
		return toItems(response.countries as unknown as IDataObject[]);
	}

	if (operation === 'getManyLanguages') {
		const response = await locale.listLanguages();
		return toItems(response.languages as unknown as IDataObject[]);
	}

	if (operation === 'getManyLocaleCodes') {
		const response = await locale.listCodes();
		return toItems(response.localeCodes as unknown as IDataObject[]);
	}

	if (operation === 'getManyPhoneCodes') {
		const response = await locale.listCountriesPhones();
		return toItems(response.phones as unknown as IDataObject[]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown locale operation "${operation}"`, {
		itemIndex: i,
	});
}
