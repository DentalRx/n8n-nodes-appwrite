import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Health } from 'node-appwrite';

export async function executeHealthOperation(
	this: IExecuteFunctions,
	health: Health,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	if (operation === 'get') {
		const response = await health.get();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getAntivirus') {
		const response = await health.getAntivirus();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getCache') {
		const response = await health.getCache();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getCertificate') {
		const domain = this.getNodeParameter('domain', i, '') as string;
		const response = await health.getCertificate({
			domain: domain === '' ? undefined : domain,
		});
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getDatabase') {
		const response = await health.getDB();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getPubSub') {
		const response = await health.getPubSub();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getStorage') {
		const response = await health.getStorage();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getStorageLocal') {
		const response = await health.getStorageLocal();
		return toItems(response as unknown as IDataObject);
	}

	if (operation === 'getTime') {
		const response = await health.getTime();
		return toItems(response as unknown as IDataObject);
	}

	throw new NodeOperationError(this.getNode(), `Unknown health operation "${operation}"`, {
		itemIndex: i,
	});
}
