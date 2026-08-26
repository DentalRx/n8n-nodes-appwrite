import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { appwriteApiRequest } from '../transport';

import { toItems } from '../GenericFunctions';

/** Every health check is a plain GET; only the certificate check takes a parameter. */
function healthPath(operation: string): string | undefined {
	switch (operation) {
		case 'get':
			return '/health';
		case 'getAntivirus':
			return '/health/anti-virus';
		case 'getCache':
			return '/health/cache';
		case 'getCertificate':
			return '/health/certificate';
		case 'getDatabase':
			return '/health/db';
		case 'getPubSub':
			return '/health/pubsub';
		case 'getStorage':
			return '/health/storage';
		case 'getStorageLocal':
			return '/health/storage/local';
		case 'getTime':
			return '/health/time';
		default:
			return undefined;
	}
}

export async function executeHealthOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const path = healthPath(operation);
	if (path === undefined) {
		throw new NodeOperationError(this.getNode(), `Unknown health operation "${operation}"`, {
			itemIndex: i,
		});
	}

	const qs: IDataObject = {};
	if (operation === 'getCertificate') {
		const { domain = '' } = this.getNodeParameter('options', i, {}) as { domain?: string };
		qs.domain = domain === '' ? undefined : domain;
	}

	const response = await appwriteApiRequest.call(this, 'GET', path, { qs }, i);
	return toItems(response, i);
}
