import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getCollectionParameter,
	getOptionalResourceId,
	getResourceId,
	getStringListParameter,
	getStringParameter,
	parseStringList,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { resolveId } from '../helpers/appwrite';
import { appwriteApiRequest } from '../transport';

/** The app-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'description',
	'type',
	'enabled',
	'deviceFlow',
	'redirectUris',
	'labels',
	'teamId',
	'userId',
];

interface AppDetail {
	/** The request body key. */
	key: string;
	/** The field's label, for list-parsing messages. */
	label: string;
	/** Whether the field holds a comma-separated list or a JSON array. */
	list?: boolean;
}

/**
 * The Options (create) and Update Fields (update) of an app, by parameter
 * name. The keys are exactly the details PUT /apps/{appId} replaces, which
 * update reads back from the current app.
 */
const APP_DETAILS: Record<string, AppDetail> = {
	appClientType: { key: 'type', label: 'Client Type' },
	appContacts: { key: 'contacts', label: 'Contact Emails', list: true },
	appImages: { key: 'images', label: 'Image URLs', list: true },
	appTags: { key: 'tags', label: 'Tags', list: true },
	clientUri: { key: 'clientUri', label: 'Homepage URL' },
	dataDeletionUrl: { key: 'dataDeletionUrl', label: 'Data Deletion URL' },
	description: { key: 'description', label: 'Description' },
	deviceFlow: { key: 'deviceFlow', label: 'Device Flow' },
	enabled: { key: 'enabled', label: 'Enabled' },
	installationRedirectUrl: { key: 'installationRedirectUrl', label: 'Installation Redirect URL' },
	installationScopes: { key: 'installationScopes', label: 'Installation Scopes' },
	logoUri: { key: 'logoUri', label: 'Logo URL' },
	name: { key: 'name', label: 'Name' },
	postLogoutRedirectUris: {
		key: 'postLogoutRedirectUris',
		label: 'Post-Logout Redirect URIs',
		list: true,
	},
	privacyPolicyUrl: { key: 'privacyPolicyUrl', label: 'Privacy Policy URL' },
	redirectUris: { key: 'redirectUris', label: 'Redirect URIs', list: true },
	supportUrl: { key: 'supportUrl', label: 'Support URL' },
	tagline: { key: 'tagline', label: 'Tagline' },
	termsUrl: { key: 'termsUrl', label: 'Terms of Service URL' },
};

/**
 * Details only Update Fields offer: create takes the name and redirect URIs on
 * the node's face, and its endpoint knows no installation settings.
 */
const UPDATE_ONLY_DETAILS = new Set([
	'installationRedirectUrl',
	'installationScopes',
	'name',
	'redirectUris',
]);

export async function executeAppOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const appId = (): string => getResourceId.call(this, 'appId', i, 'app', 'App');
	const appPath = (): string => `/apps/${encodeURIComponent(appId())}`;
	const installationPath = (): string =>
		`${appPath()}/installations/${encodeURIComponent(getStringParameter.call(this, 'installationId', i))}`;
	const keyPath = (): string =>
		`${appPath()}/keys/${encodeURIComponent(getStringParameter.call(this, 'appKeyId', i))}`;
	const secretPath = (): string =>
		`${appPath()}/secrets/${encodeURIComponent(getStringParameter.call(this, 'appSecretId', i))}`;

	const simplified = (data: IDataObject | IDataObject[]) =>
		this.getNodeParameter('simplify', i, false) ? simplifyItems(data, SIMPLIFY_FIELDS) : data;

	/** The details set in a collection, under their body keys. */
	const details = (values: IDataObject, forCreate: boolean): IDataObject => {
		const body: IDataObject = {};
		for (const [name, value] of Object.entries(values)) {
			const detail = APP_DETAILS[name];
			if (detail === undefined || value === undefined) continue;
			if (forCreate && UPDATE_ONLY_DETAILS.has(name)) continue;
			// An app cannot be renamed to nothing; a blank Name keeps the current one.
			if (name === 'name' && value === '') continue;
			body[detail.key] = detail.list
				? parseStringList.call(this, value as string, detail.label, i)
				: value;
		}
		return body;
	};

	/** One Get Many operation: a page up to Limit, or every page for Return All. */
	const getMany = async (path: string, listKey: string): Promise<IDataObject[]> => {
		const queries = buildQueries.call(this, i);
		const fetchPage = async (pageQueries: string[]) =>
			await appwriteApiRequest.call(this, 'GET', path, { qs: { queries: pageQueries } }, i);

		if (this.getNodeParameter('returnAll', i, false) as boolean) {
			return (await fetchAllPages.call(this, queries, fetchPage, listKey, i)) as IDataObject[];
		}
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await fetchPage(withLimit(queries, limit));
		return response[listKey] as IDataObject[];
	};

	if (operation === 'create') {
		const teamId = getOptionalResourceId.call(this, 'teamId', i, 'team');
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/apps',
			{
				body: {
					appId: resolveId(getStringParameter.call(this, 'appId', i, '')),
					name: getStringParameter.call(this, 'name', i),
					// Required by Appwrite even when empty.
					redirectUris: getStringListParameter.call(this, 'redirectUris', i, 'Redirect URIs'),
					teamId: teamId === '' ? undefined : teamId,
					...details(getCollectionParameter.call(this, 'options', i), true),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createInstallationToken') {
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${installationPath()}/tokens`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createKey' || operation === 'createSecret') {
		const collection = operation === 'createKey' ? 'keys' : 'secrets';
		const response = await appwriteApiRequest.call(
			this,
			'POST',
			`${appPath()}/${collection}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const id = appId();
		await appwriteApiRequest.call(this, 'DELETE', `/apps/${encodeURIComponent(id)}`, {}, i);
		return toItems({ deleted: true, appId: id }, i);
	}

	if (operation === 'deleteInstallation') {
		await appwriteApiRequest.call(this, 'DELETE', installationPath(), {}, i);
		return toItems(
			{
				deleted: true,
				appId: appId(),
				installationId: getStringParameter.call(this, 'installationId', i),
			},
			i,
		);
	}

	if (operation === 'deleteKey') {
		await appwriteApiRequest.call(this, 'DELETE', keyPath(), {}, i);
		return toItems(
			{ deleted: true, appId: appId(), keyId: getStringParameter.call(this, 'appKeyId', i) },
			i,
		);
	}

	if (operation === 'deleteSecret') {
		await appwriteApiRequest.call(this, 'DELETE', secretPath(), {}, i);
		return toItems(
			{
				deleted: true,
				appId: appId(),
				secretId: getStringParameter.call(this, 'appSecretId', i),
			},
			i,
		);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', appPath(), {}, i);
		return toItems(simplified(response), i);
	}

	if (operation === 'getInstallation') {
		const response = await appwriteApiRequest.call(this, 'GET', installationPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getKey') {
		const response = await appwriteApiRequest.call(this, 'GET', keyPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getMany') {
		return toItems(simplified(await getMany('/apps', 'apps')), i);
	}

	if (operation === 'getManyInstallationScopes' || operation === 'getManyOAuth2Scopes') {
		const kind = operation === 'getManyInstallationScopes' ? 'installations' : 'oauth2';
		const response = await appwriteApiRequest.call(this, 'GET', `/apps/scopes/${kind}`, {}, i);
		return toItems(response.scopes as IDataObject[], i);
	}

	if (operation === 'getManyInstallations') {
		return toItems(await getMany(`${appPath()}/installations`, 'installations'), i);
	}

	if (operation === 'getManyKeys') {
		return toItems(await getMany(`${appPath()}/keys`, 'keys'), i);
	}

	if (operation === 'getManySecrets') {
		return toItems(await getMany(`${appPath()}/secrets`, 'secrets'), i);
	}

	if (operation === 'getSecret') {
		const response = await appwriteApiRequest.call(this, 'GET', secretPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'revokeTokens') {
		const id = appId();
		await appwriteApiRequest.call(this, 'DELETE', `/apps/${encodeURIComponent(id)}/tokens`, {}, i);
		return toItems({ revoked: true, appId: id }, i);
	}

	if (operation === 'transfer') {
		const teamId = getResourceId.call(this, 'teamId', i, 'team', 'Team');
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${appPath()}/team`,
			{ body: { teamId } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'update') {
		const path = appPath();
		// PUT /apps/{appId} is a full replace: a detail left out of the body is
		// reset to its default rather than kept, which would wipe the redirect
		// URIs, scopes and consent-screen details. Read the app first and resend
		// everything the user did not change.
		const current = await appwriteApiRequest.call(this, 'GET', path, {}, i);
		const body: IDataObject = {};
		for (const { key } of Object.values(APP_DETAILS)) body[key] = current[key];
		Object.assign(body, details(getCollectionParameter.call(this, 'updateFields', i), false));

		const response = await appwriteApiRequest.call(this, 'PUT', path, { body }, i);
		return toItems(response, i);
	}

	if (operation === 'updateLabels') {
		const labels = getStringListParameter.call(this, 'labels', i, 'Labels');
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			`${appPath()}/labels`,
			{ body: { labels } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown app operation "${operation}"`, {
		itemIndex: i,
	});
}
