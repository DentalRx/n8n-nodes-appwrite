import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getStringParameter, toItems } from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

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
	if (operation === 'ping') {
		// Appwrite answers a ping with the plain text "Pong!" rather than JSON.
		const response: unknown = await appwriteApiRequest.call(this, 'GET', '/ping', {}, i);
		return toItems(
			typeof response === 'string' ? { message: response } : (response as IDataObject),
			i,
		);
	}

	const path = healthPath(operation);
	if (path === undefined) {
		throw new NodeOperationError(this.getNode(), `Unknown health operation "${operation}"`, {
			itemIndex: i,
		});
	}

	const qs: IDataObject = {};
	if (operation === 'getCertificate') {
		// Appwrite requires the domain, although its 1.8 spec marked it optional.
		qs.domain = getStringParameter.call(this, 'domain', i).trim();
		if (qs.domain === '') {
			throw new NodeOperationError(this.getNode(), 'Enter the domain whose certificate to check', {
				itemIndex: i,
			});
		}
	}

	const response = await appwriteApiRequest.call(this, 'GET', path, { qs }, i);
	return toItems(response, i);
}
