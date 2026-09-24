import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getManyByOffset, toItems } from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

interface TemplateFields {
	templateMessage?: string;
	templateReplyToEmail?: string;
	templateReplyToName?: string;
	templateSenderEmail?: string;
	templateSenderName?: string;
	templateSubject?: string;
}

export async function executeEmailTemplateOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const templateId = (): string => this.getNodeParameter('emailTemplateType', i) as string;
	// Left empty, Appwrite uses its default locale.
	const locale = (): string | undefined =>
		String(this.getNodeParameter('emailTemplateLocale', i, '') ?? '').trim() || undefined;

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/project/templates/email/${encodeURIComponent(templateId())}`,
			{ qs: { locale: locale() } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const templates = await getManyByOffset.call(
			this,
			async (queries) =>
				await appwriteApiRequest.call(
					this,
					'GET',
					'/project/templates/email',
					{ qs: { queries } },
					i,
				),
			'templates',
			i,
		);
		return toItems(templates, i);
	}

	if (operation === 'update') {
		const fields = this.getNodeParameter('updateFields', i, {}) as TemplateFields;
		// Appwrite keeps every part left out, and clears one sent empty.
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			'/project/templates/email',
			{
				body: {
					templateId: templateId(),
					locale: locale(),
					subject: fields.templateSubject,
					message: fields.templateMessage,
					senderName: fields.templateSenderName,
					senderEmail: fields.templateSenderEmail,
					replyToEmail: fields.templateReplyToEmail,
					replyToName: fields.templateReplyToName,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown email template operation "${operation}"`, {
		itemIndex: i,
	});
}
