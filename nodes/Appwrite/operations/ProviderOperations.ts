import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getResourceId,
	getStringParameter,
	lookupEnum,
	parseJsonParameter,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/**
 * Each provider type, mapped to the path segment of its create and update
 * endpoints (`/messaging/providers/<segment>`).
 */
const PROVIDER_PATHS: Record<string, string> = {
	apns: 'apns',
	appwrite: 'appwrite',
	fcm: 'fcm',
	mailgun: 'mailgun',
	msg91: 'msg91',
	resend: 'resend',
	sendgrid: 'sendgrid',
	ses: 'ses',
	smtp: 'smtp',
	telesign: 'telesign',
	textmagic: 'textmagic',
	twilio: 'twilio',
	vonage: 'vonage',
};

/** Delivery Guarantee choices as MQTT QoS levels; null leaves the choice to each subscriber. */
const QOS_MAP: Record<string, number | null> = {
	atMostOnce: 0,
	atLeastOnce: 1,
	subscriber: null,
};

const ENCRYPTION_MAP: Record<string, string> = {
	none: 'none',
	ssl: 'ssl',
	tls: 'tls',
};

/**
 * Turn a provider type's Options or Update Fields into request body fields.
 * Each collection offers only its own type's settings, named as Appwrite names
 * them, so values pass through apart from the few the editor shows
 * differently. Empty text is left out: Appwrite validates every value it is
 * sent, so an untouched sender email or phone number would otherwise fail.
 */
function settingsBody(this: IExecuteFunctions, settings: IDataObject, i: number): IDataObject {
	const body: IDataObject = {};
	for (const [key, value] of Object.entries(settings)) {
		if (value === '' || value === undefined) continue;
		if (key === 'serviceAccountJSON') {
			body[key] = parseJsonParameter.call(this, value, 'Service Account JSON', i);
		} else if (key === 'qos') {
			body[key] = lookupEnum(this, QOS_MAP, String(value), 'delivery guarantee', i);
		} else if (key === 'encryption') {
			body[key] = lookupEnum(this, ENCRYPTION_MAP, String(value), 'encryption', i);
		} else {
			body[key] = value;
		}
	}
	return body;
}

export async function executeProviderOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	/** The chosen provider type, and the path its create and update endpoints share. */
	const getProviderType = (): { providerType: string; typePath: string } => {
		const providerType = getStringParameter.call(this, 'providerType', i);
		const segment = lookupEnum(this, PROVIDER_PATHS, providerType, 'provider type', i);
		return { providerType, typePath: `/messaging/providers/${segment}` };
	};

	if (operation === 'create') {
		const { providerType, typePath } = getProviderType();
		const options = getCollectionParameter.call(this, 'options', i);
		const body: IDataObject = {
			providerId: resolveId(getStringParameter.call(this, 'providerId', i, '')),
			name: getStringParameter.call(this, 'name', i),
			...settingsBody.call(this, options, i),
		};
		if (providerType === 'smtp') {
			body.host = getStringParameter.call(this, 'smtpHost', i);
		}
		// Appwrite enables a Mailgun provider only once its region is set, even
		// to the default US region, which the Console always sends. Leaving EU
		// Region out means the US region here too.
		if (providerType === 'mailgun') {
			body.isEuRegion ??= false;
		}
		const response = await appwriteApiRequest.call(this, 'POST', typePath, { body }, i);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const providerId = getResourceId.call(this, 'providerId', i, 'provider', 'Provider');
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/messaging/providers/${encodeURIComponent(providerId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, providerId }, i);
	}

	if (operation === 'get') {
		const providerId = getResourceId.call(this, 'providerId', i, 'provider', 'Provider');
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/messaging/providers/${encodeURIComponent(providerId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const search =
			(getCollectionParameter.call(this, 'options', i) as { search?: string }).search ?? '';
		const queries = buildQueries.call(this, i);
		const searchArg = search === '' ? undefined : search;

		if (returnAll) {
			const providers = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/messaging/providers',
						{ qs: { queries: pageQueries, search: searchArg } },
						i,
					),
				'providers',
				i,
			);
			return toItems(providers as IDataObject[], i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/messaging/providers',
			{ qs: { queries: withLimit(queries, limit), search: searchArg } },
			i,
		);
		return toItems(response.providers as IDataObject[], i);
	}

	if (operation === 'update') {
		const providerId = getResourceId.call(this, 'providerId', i, 'provider', 'Provider');
		const { typePath } = getProviderType();
		const updateFields = getCollectionParameter.call(this, 'updateFields', i);
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${typePath}/${encodeURIComponent(providerId)}`,
			{ body: settingsBody.call(this, updateFields, i) },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown provider operation "${operation}"`, {
		itemIndex: i,
	});
}
