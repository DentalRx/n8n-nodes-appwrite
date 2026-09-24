import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getResourceId,
	getStringListParameter,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/**
 * The webhook-model fields most workflows read, for the Simplify toggle. The
 * basic authentication password is left out on purpose.
 */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'url',
	'events',
	'enabled',
	'tls',
	'authUsername',
	'attempts',
	'logs',
	'$updatedAt',
];

interface WebhookSettings {
	authPassword?: string;
	authUsername?: string;
	enabled?: boolean;
	events?: string;
	name?: string;
	tls?: boolean;
	url?: string;
	webhookSecret?: string;
}

export async function executeWebhookOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: create and the list operation act on no existing webhook.
	const webhookPath = (): string =>
		`/webhooks/${encodeURIComponent(getResourceId.call(this, 'webhookId', i, 'webhook', 'Webhook'))}`;

	const simplified = (data: IDataObject | IDataObject[]) =>
		(this.getNodeParameter('simplify', i, false) as boolean)
			? simplifyItems(data, SIMPLIFY_FIELDS)
			: data;

	if (operation === 'create') {
		const options = this.getNodeParameter('options', i, {}) as WebhookSettings;
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/webhooks',
			{
				body: {
					webhookId: resolveId(this.getNodeParameter('webhookId', i, '') as string),
					name: this.getNodeParameter('name', i) as string,
					url: this.getNodeParameter('url', i) as string,
					events: getStringListParameter.call(this, 'webhookEvents', i, 'Events'),
					enabled: options.enabled,
					tls: options.tls,
					authUsername: options.authUsername,
					authPassword: options.authPassword,
					// An empty secret would fail Appwrite's 8-character minimum; leaving
					// it out makes Appwrite generate one, as the field promises.
					secret: options.webhookSecret || undefined,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const webhookId = getResourceId.call(this, 'webhookId', i, 'webhook', 'Webhook');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/webhooks/${encodeURIComponent(webhookId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, webhookId }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', webhookPath(), {}, i);
		return toItems(simplified(response), i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const webhooks = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/webhooks',
						{ qs: { queries: pageQueries } },
						i,
					),
				'webhooks',
				i,
			);
			return toItems(simplified(webhooks as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/webhooks',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(simplified(response.webhooks as IDataObject[]), i);
	}

	if (operation === 'update') {
		const path = webhookPath();
		const updateFields = this.getNodeParameter('updateFields', i, {}) as WebhookSettings;
		// PUT /webhooks/{id} is a full replace: every setting left out of the
		// body is reset to Appwrite's default, which would re-enable a disabled
		// webhook, turn certificate verification off and drop its basic
		// authentication. Read the webhook first and resend what the user did
		// not change.
		const current = await appwriteApiRequest.call(this, 'GET', path, {}, i);
		// A webhook always needs a name, a URL and events, so leaving one of
		// them blank keeps the current value instead of emptying it. Blank basic
		// authentication credentials do clear, which is how it is turned off.
		const events =
			updateFields.events === undefined
				? []
				: parseStringList.call(this, updateFields.events, 'Events', i);
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			path,
			{
				body: {
					name: updateFields.name || (current.name as string | undefined),
					url: updateFields.url || (current.url as string | undefined),
					events: events.length > 0 ? events : (current.events as string[] | undefined),
					enabled: updateFields.enabled ?? (current.enabled as boolean | undefined),
					tls: updateFields.tls ?? (current.tls as boolean | undefined),
					authUsername: updateFields.authUsername ?? (current.authUsername as string | undefined),
					authPassword: updateFields.authPassword ?? (current.authPassword as string | undefined),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateSecret') {
		const secret = this.getNodeParameter('webhookSecret', i, '') as string;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${webhookPath()}/secret`,
			{ body: { secret: secret === '' ? undefined : secret } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown webhook operation "${operation}"`, {
		itemIndex: i,
	});
}
