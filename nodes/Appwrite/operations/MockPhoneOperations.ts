import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getManyByOffset, toItems } from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

export async function executeMockPhoneOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// A mock phone number is identified by the number itself.
	const phone = (): string => {
		const number = String(this.getNodeParameter('phone', i) ?? '').trim();
		if (number === '') {
			throw new NodeOperationError(this.getNode(), "The 'Phone Number' parameter is empty", {
				description: 'Enter the mock phone number, such as +12065550100.',
				itemIndex: i,
			});
		}
		return number;
	};
	const phonePath = (): string => `/project/mock-phones/${encodeURIComponent(phone())}`;
	const otp = (): string => String(this.getNodeParameter('mockPhoneCode', i) ?? '').trim();

	if (operation === 'create') {
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/project/mock-phones',
			{ body: { number: phone(), otp: otp() } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		await appwriteApiRequest.call(this, 'DELETE', phonePath(), {}, i);
		return toItems({ deleted: true, phone: phone() }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', phonePath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const mockNumbers = await getManyByOffset.call(
			this,
			async (queries) =>
				await appwriteApiRequest.call(this, 'GET', '/project/mock-phones', { qs: { queries } }, i),
			'mockNumbers',
			i,
		);
		return toItems(mockNumbers, i);
	}

	if (operation === 'update') {
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			phonePath(),
			{ body: { otp: otp() } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown mock phone operation "${operation}"`, {
		itemIndex: i,
	});
}
