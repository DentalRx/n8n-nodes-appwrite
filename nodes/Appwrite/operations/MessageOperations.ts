import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	fetchAllPagesByOffset,
	parseJsonArrayParameter,
	parseJsonParameter,
} from '../GenericFunctions';
import { Query, resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

const PRIORITY_MAP: Record<string, string> = {
	high: 'high',
	normal: 'normal',
};

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
	const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] => {
		const list = Array.isArray(data) ? data : [data];
		return list.map((json) => ({ json, pairedItem: { item: i } }));
	};

	const parseList = (raw: string, name: string): string[] => {
		if (raw.trim() === '') return [];
		if (raw.trim().startsWith('[')) {
			return parseJsonArrayParameter.call(this, raw, name, i).map((e) => String(e));
		}
		return raw
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e !== '');
	};

	const listOrUndefined = (raw: string | undefined, name: string): string[] | undefined => {
		const list = parseList(raw ?? '', name);
		return list.length > 0 ? list : undefined;
	};

	const getRecipients = () => {
		const topics = listOrUndefined(this.getNodeParameter('topics', i, '') as string, 'topics');
		const users = listOrUndefined(this.getNodeParameter('users', i, '') as string, 'users');
		const targets = listOrUndefined(this.getNodeParameter('targets', i, '') as string, 'targets');
		return { topics, users, targets };
	};

	if (operation === 'createEmail') {
		const messageId = resolveId(this.getNodeParameter('messageId', i, '') as string);
		const subject = this.getNodeParameter('subject', i) as string;
		const content = this.getNodeParameter('content', i) as string;
		const { topics, users, targets } = getRecipients();
		if (!topics && !users && !targets) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one of Topic IDs, User IDs, or Target IDs must be provided',
				{ itemIndex: i },
			);
		}
		const options = this.getNodeParameter('options', i, {}) as EmailMessageFields;
		const response = (await appwriteApiRequest.call(
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
					cc: listOrUndefined(options.cc, 'cc'),
					bcc: listOrUndefined(options.bcc, 'bcc'),
					attachments: listOrUndefined(options.attachments, 'attachments'),
					draft: options.draft,
					html: options.html,
					scheduledAt: options.scheduledAt || undefined,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'createPush') {
		const messageId = resolveId(this.getNodeParameter('messageId', i, '') as string);
		const title = this.getNodeParameter('title', i, '') as string;
		const body = this.getNodeParameter('body', i, '') as string;
		const { topics, users, targets } = getRecipients();
		if (!topics && !users && !targets) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one of Topic IDs, User IDs, or Target IDs must be provided',
				{ itemIndex: i },
			);
		}
		const options = this.getNodeParameter('options', i, {}) as PushMessageFields;
		const response = (await appwriteApiRequest.call(
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
							: parseJsonParameter.call(this, options.data, 'data', i),
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
					priority: options.priority === undefined ? undefined : PRIORITY_MAP[options.priority],
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'createSMS') {
		const messageId = resolveId(this.getNodeParameter('messageId', i, '') as string);
		const content = this.getNodeParameter('content', i) as string;
		const { topics, users, targets } = getRecipients();
		if (!topics && !users && !targets) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one of Topic IDs, User IDs, or Target IDs must be provided',
				{ itemIndex: i },
			);
		}
		const options = this.getNodeParameter('options', i, {}) as SmsMessageFields;
		const response = (await appwriteApiRequest.call(
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
		)) as IDataObject;
		return toItems(response);
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
		return toItems({ success: true, messageId });
	}

	if (operation === 'get') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/messaging/messages/${encodeURIComponent(messageId)}`,
			{},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search = (this.getNodeParameter('options', i, {}) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const messages = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					(await appwriteApiRequest.call(
						this,
						'GET',
						'/messaging/messages',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					)) as IDataObject,
				'messages',
			);
			return toItems(messages as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			'/messaging/messages',
			{ qs: { queries: [...queries, Query.limit(limit)], search: searchArg } },
			i,
		)) as IDataObject;
		return toItems(response.messages as IDataObject[]);
	}

	if (operation === 'getManyLogs') {
		// Log entries have no ID, so cursor pagination cannot be used here.
		const messageId = this.getNodeParameter('messageId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const logs = await fetchAllPagesByOffset(
				queries,
				async (pageQueries) =>
					(await appwriteApiRequest.call(
						this,
						'GET',
						`/messaging/messages/${encodeURIComponent(messageId)}/logs`,
						{ qs: { queries: pageQueries } },
						i,
					)) as IDataObject,
				'logs',
			);
			return toItems(logs as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/messaging/messages/${encodeURIComponent(messageId)}/logs`,
			{ qs: { queries: [...queries, Query.limit(limit)] } },
			i,
		)) as IDataObject;
		return toItems(response.logs as IDataObject[]);
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
					(await appwriteApiRequest.call(
						this,
						'GET',
						`/messaging/messages/${encodeURIComponent(messageId)}/targets`,
						{ qs: { queries: pageQueries } },
						i,
					)) as IDataObject,
				'targets',
			);
			return toItems(targets as IDataObject[]);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = (await appwriteApiRequest.call(
			this,
			'GET',
			`/messaging/messages/${encodeURIComponent(messageId)}/targets`,
			{ qs: { queries: [...queries, Query.limit(limit)] } },
			i,
		)) as IDataObject;
		return toItems(response.targets as IDataObject[]);
	}

	if (operation === 'updateEmail') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as EmailMessageFields;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`/messaging/messages/email/${encodeURIComponent(messageId)}`,
			{
				body: {
					topics: listOrUndefined(updateFields.topics, 'topics'),
					users: listOrUndefined(updateFields.users, 'users'),
					targets: listOrUndefined(updateFields.targets, 'targets'),
					subject: updateFields.subject || undefined,
					content: updateFields.content || undefined,
					draft: updateFields.draft,
					html: updateFields.html,
					cc: listOrUndefined(updateFields.cc, 'cc'),
					bcc: listOrUndefined(updateFields.bcc, 'bcc'),
					scheduledAt: updateFields.scheduledAt || undefined,
					attachments: listOrUndefined(updateFields.attachments, 'attachments'),
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'updatePush') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as PushMessageFields;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`/messaging/messages/push/${encodeURIComponent(messageId)}`,
			{
				body: {
					topics: listOrUndefined(updateFields.topics, 'topics'),
					users: listOrUndefined(updateFields.users, 'users'),
					targets: listOrUndefined(updateFields.targets, 'targets'),
					title: updateFields.title || undefined,
					body: updateFields.body || undefined,
					data:
						updateFields.data === undefined
							? undefined
							: parseJsonParameter.call(this, updateFields.data, 'data', i),
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
						updateFields.priority === undefined ? undefined : PRIORITY_MAP[updateFields.priority],
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	if (operation === 'updateSMS') {
		const messageId = this.getNodeParameter('messageId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as SmsMessageFields;
		const response = (await appwriteApiRequest.call(
			this,
			'PATCH',
			`/messaging/messages/sms/${encodeURIComponent(messageId)}`,
			{
				body: {
					topics: listOrUndefined(updateFields.topics, 'topics'),
					users: listOrUndefined(updateFields.users, 'users'),
					targets: listOrUndefined(updateFields.targets, 'targets'),
					content: updateFields.content || undefined,
					draft: updateFields.draft,
					scheduledAt: updateFields.scheduledAt || undefined,
				},
			},
			i,
		)) as IDataObject;
		return toItems(response);
	}

	throw new NodeOperationError(this.getNode(), `Unknown message operation "${operation}"`, {
		itemIndex: i,
	});
}
