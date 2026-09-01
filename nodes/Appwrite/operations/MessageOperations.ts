import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	lookupEnum,
	parseJsonParameter,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

const PRIORITY_MAP: Record<string, string> = {
	high: 'high',
	normal: 'normal',
};

/** The message-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'providerType',
	'status',
	'scheduledAt',
	'deliveredAt',
	'deliveredTotal',
	'topics',
	'users',
	'targets',
	'$createdAt',
];

interface EmailMessageFields {
	topics?: string;
	users?: string;
	targets?: string;
	subject?: string;
	content?: string;
	draft?: boolean;
	html?: boolean;
	cc?: string;
	bcc?: string;
	scheduledAt?: string;
	attachments?: string;
}

interface PushMessageFields {
	topics?: string;
	users?: string;
	targets?: string;
	title?: string;
	body?: string;
	data?: IDataObject | string;
	action?: string;
	image?: string;
	icon?: string;
	sound?: string;
	color?: string;
	tag?: string;
	badge?: number;
	draft?: boolean;
	scheduledAt?: string;
	contentAvailable?: boolean;
	critical?: boolean;
	priority?: string;
}

interface SmsMessageFields {
	topics?: string;
	users?: string;
	targets?: string;
	content?: string;
	draft?: boolean;
	scheduledAt?: string;
}

export async function executeMessageOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const listOrUndefined = (raw: string | undefined, name: string): string[] | undefined => {
		const list = parseStringList.call(this, raw ?? '', name, i);
		return list.length > 0 ? list : undefined;
	};

	const getRecipients = () => {
		const topics = listOrUndefined(this.getNodeParameter('topics', i, '') as string, 'Topic IDs');
		const users = listOrUndefined(this.getNodeParameter('users', i, '') as string, 'User IDs');
		const targets = listOrUndefined(
			this.getNodeParameter('targets', i, '') as string,
			'Target IDs',
		);
		return { topics, users, targets };
	};

	if (operation === 'createEmail') {
		const messageId = resolveId(this.getNodeParameter('messageId', i, '') as string);
		const subject = this.getNodeParameter('subject', i) as string;
		const content = this.getNodeParameter('content', i) as string;
		const options = this.getNodeParameter('options', i, {}) as EmailMessageFields;
		const { topics, users, targets } = getRecipients();
		if (!topics && !users && !targets && options.draft !== true) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one of Topic IDs, User IDs, or Target IDs must be provided',
				{
					itemIndex: i,
					description:
						'To stage a message without recipients, enable the Draft option and add recipients later with the update operation.',
				},
			);
		}
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/messaging/messages/email',
			{
				body: {
					messageId,
					subject,
					content,
					topics,
					users,
					targets,
					cc: listOrUndefined(options.cc, 'CC'),
					bcc: listOrUndefined(options.bcc, 'BCC'),
					attachments: listOrUndefined(options.attachments, 'Attachments'),
					draft: options.draft,
					html: options.html,
					scheduledAt: options.scheduledAt || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createPush') {
		const messageId = resolveId(this.getNodeParameter('messageId', i, '') as string);
		const title = this.getNodeParameter('title', i, '') as string;
		const body = this.getNodeParameter('body', i, '') as string;
		const options = this.getNodeParameter('options', i, {}) as PushMessageFields;
		const { topics, users, targets } = getRecipients();
		if (!topics && !users && !targets && options.draft !== true) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one of Topic IDs, User IDs, or Target IDs must be provided',
				{
					itemIndex: i,
					description:
						'To stage a message without recipients, enable the Draft option and add recipients later with the update operation.',
				},
			);
		}
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/messaging/messages/push',
			{
				body: {
					messageId,
					title: title === '' ? undefined : title,
					body: body === '' ? undefined : body,
					topics,
					users,
					targets,
					data:
						options.data === undefined
							? undefined
							: parseJsonParameter.call(this, options.data, 'Data', i),
					action: options.action || undefined,
					image: options.image || undefined,
					icon: options.icon || undefined,
					sound: options.sound || undefined,
					color: options.color || undefined,
					tag: options.tag || undefined,
					badge: options.badge,
					draft: options.draft,
					scheduledAt: options.scheduledAt || undefined,
					contentAvailable: options.contentAvailable,
					critical: options.critical,
					priority:
						options.priority === undefined
							? undefined
							: lookupEnum(this, PRIORITY_MAP, options.priority, 'priority', i),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createSMS') {
		const messageId = resolveId(this.getNodeParameter('messageId', i, '') as string);
		const content = this.getNodeParameter('content', i) as string;
		const options = this.getNodeParameter('options', i, {}) as SmsMessageFields;
		const { topics, users, targets } = getRecipients();
		if (!topics && !users && !targets && options.draft !== true) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one of Topic IDs, User IDs, or Target IDs must be provided',
				{
					itemIndex: i,
					description:
						'To stage a message without recipients, enable the Draft option and add recipients later with the update operation.',
				},
			);
		}
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/messaging/messages/sms',
			{
				body: {
					messageId,
					content,
					topics,
					users,
					targets,
					draft: options.draft,
					scheduledAt: options.scheduledAt || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/messaging/messages/${encodeURIComponent(messageId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, messageId }, i);
	}

	if (operation === 'get') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/messaging/messages/${encodeURIComponent(messageId)}`,
			{},
			i,
		);
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		return toItems(simplify ? simplifyItems(response, SIMPLIFY_FIELDS) : response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		const project = (messages: IDataObject[]) =>
			simplify ? (simplifyItems(messages, SIMPLIFY_FIELDS) as IDataObject[]) : messages;

		if (returnAll) {
			const messages = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/messaging/messages',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'messages',
				i,
			);
			return toItems(project(messages as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/messaging/messages',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(project(response.messages as IDataObject[]), i);
	}

	if (operation === 'getManyTargets') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const targets = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						`/messaging/messages/${encodeURIComponent(messageId)}/targets`,
						{ qs: { queries: pageQueries } },
						i,
					),
				'targets',
				i,
			);
			return toItems(targets as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/messaging/messages/${encodeURIComponent(messageId)}/targets`,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(response.targets as IDataObject[], i);
	}

	if (operation === 'updateEmail') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as EmailMessageFields;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/messaging/messages/email/${encodeURIComponent(messageId)}`,
			{
				body: {
					topics: listOrUndefined(updateFields.topics, 'Topic IDs'),
					users: listOrUndefined(updateFields.users, 'User IDs'),
					targets: listOrUndefined(updateFields.targets, 'Target IDs'),
					subject: updateFields.subject || undefined,
					content: updateFields.content || undefined,
					draft: updateFields.draft,
					html: updateFields.html,
					cc: listOrUndefined(updateFields.cc, 'CC'),
					bcc: listOrUndefined(updateFields.bcc, 'BCC'),
					scheduledAt: updateFields.scheduledAt || undefined,
					attachments: listOrUndefined(updateFields.attachments, 'Attachments'),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updatePush') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as PushMessageFields;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/messaging/messages/push/${encodeURIComponent(messageId)}`,
			{
				body: {
					topics: listOrUndefined(updateFields.topics, 'Topic IDs'),
					users: listOrUndefined(updateFields.users, 'User IDs'),
					targets: listOrUndefined(updateFields.targets, 'Target IDs'),
					title: updateFields.title || undefined,
					body: updateFields.body || undefined,
					data:
						updateFields.data === undefined
							? undefined
							: parseJsonParameter.call(this, updateFields.data, 'Data', i),
					action: updateFields.action || undefined,
					image: updateFields.image || undefined,
					icon: updateFields.icon || undefined,
					sound: updateFields.sound || undefined,
					color: updateFields.color || undefined,
					tag: updateFields.tag || undefined,
					badge: updateFields.badge,
					draft: updateFields.draft,
					scheduledAt: updateFields.scheduledAt || undefined,
					contentAvailable: updateFields.contentAvailable,
					critical: updateFields.critical,
					priority:
						updateFields.priority === undefined
							? undefined
							: lookupEnum(this, PRIORITY_MAP, updateFields.priority, 'priority', i),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateSMS') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as SmsMessageFields;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/messaging/messages/sms/${encodeURIComponent(messageId)}`,
			{
				body: {
					topics: listOrUndefined(updateFields.topics, 'Topic IDs'),
					users: listOrUndefined(updateFields.users, 'User IDs'),
					targets: listOrUndefined(updateFields.targets, 'Target IDs'),
					content: updateFields.content || undefined,
					draft: updateFields.draft,
					scheduledAt: updateFields.scheduledAt || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown message operation "${operation}"`, {
		itemIndex: i,
	});
}
