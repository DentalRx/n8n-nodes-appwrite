import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { ORGANIZATION_CREDENTIAL } from '../helpers/organization';
import { byName, parentId, searchList, searchListByLabel } from './listSearch';

/**
 * The pickers of the organization-level resources. They list what belongs to
 * the organization, so they authenticate with the organization API key.
 */

export async function searchOrganizationProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchList(
		this,
		'/organization/projects',
		'projects',
		byName,
		filter,
		paginationToken,
		ORGANIZATION_CREDENTIAL,
	);
}

export async function searchOrganizationProjectKeys(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const projectId = parentId(this, 'organizationProjectId', 'project');
	if (projectId === '') return { results: [] };
	// The keys list takes no search parameter, so the typed filter is matched
	// against the names and IDs of each page instead.
	return await searchListByLabel(
		this,
		`/organization/projects/${encodeURIComponent(projectId)}/keys`,
		'keys',
		byName,
		filter,
		paginationToken,
		ORGANIZATION_CREDENTIAL,
	);
}

export async function searchDomains(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// A domain has no name other than the domain itself.
	return await searchList(
		this,
		'/domains',
		'domains',
		(domain) => (domain.domain as string | undefined) ?? '',
		filter,
		paginationToken,
		ORGANIZATION_CREDENTIAL,
	);
}

export async function searchDnsRecords(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const domainId = parentId(this, 'domainId', 'domain');
	if (domainId === '') return { results: [] };
	// A record's name is only the host it answers for, which several records
	// share, so each is labelled with its type and value too, e.g.
	// "www CNAME appwrite.network". The list takes no search parameter, so the
	// typed filter is matched here.
	return await searchListByLabel(
		this,
		`/domains/${encodeURIComponent(domainId)}/records`,
		'dnsRecords',
		(record) =>
			[record.name, record.type, record.value]
				.filter((part) => part !== undefined && part !== null && part !== '')
				.join(' '),
		filter,
		paginationToken,
		ORGANIZATION_CREDENTIAL,
	);
}
