import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

import { buildQueries, fetchAllPages, withLimit } from '../GenericFunctions';
import type { AppwriteContext, AppwriteCredentialType, AppwriteRequestOptions } from '../transport';
import { appwriteApiRequest } from '../transport';

/**
 * The organization-level resources act on an Appwrite organization (its
 * projects, members, and domains) rather than on one project, so they
 * authenticate with an organization API key, the Appwrite Organization API
 * credential. Every other resource uses the project's credential.
 */
export const ORGANIZATION_CREDENTIAL: AppwriteCredentialType = 'appwriteOrganizationApi';

/** The Resource dropdown values of the organization-level resources. */
export const ORGANIZATION_RESOURCES = ['domain', 'organization', 'organizationProject'];

/** Make an authenticated request with the organization API key that returns a JSON object. */
export async function organizationApiRequest(
	this: AppwriteContext,
	method: IHttpRequestMethods,
	path: string,
	options: AppwriteRequestOptions = {},
	itemIndex?: number,
): Promise<IDataObject> {
	return await appwriteApiRequest.call(
		this,
		method,
		path,
		{ ...options, credentialType: ORGANIZATION_CREDENTIAL },
		itemIndex,
	);
}

/**
 * Run a Get Many against an organization list endpoint, from the operation's
 * Return All, Limit and Queries fields: every page for Return All, otherwise
 * one page of up to Limit entries.
 */
export async function organizationGetMany(
	this: IExecuteFunctions,
	path: string,
	listKey: string,
	itemIndex: number,
	search?: string,
): Promise<IDataObject[]> {
	const queries = buildQueries.call(this, itemIndex);
	const fetchPage = async (pageQueries: string[]) =>
		await organizationApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: pageQueries, search } },
			itemIndex,
		);

	if (this.getNodeParameter('returnAll', itemIndex, false) as boolean) {
		const all = await fetchAllPages.call(this, queries, fetchPage, listKey, itemIndex);
		return all as IDataObject[];
	}
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const response = await fetchPage(withLimit(queries, limit));
	return (response[listKey] ?? []) as IDataObject[];
}
