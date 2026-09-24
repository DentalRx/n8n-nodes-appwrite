import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { DNS_RECORD_TYPES } from '../descriptions/DomainDescription';
import {
	getCollectionParameter,
	getResourceId,
	getStringListParameter,
	lookupEnum,
	parseStringList,
	simplifyItems,
	toItems,
} from '../GenericFunctions';
import {
	ORGANIZATION_CREDENTIAL,
	organizationApiRequest,
	organizationGetMany,
} from '../helpers/organization';
import { appwriteApiRequestBinary } from '../transport';

/** The domain-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'domain',
	'registrar',
	'nameservers',
	'expire',
	'renewal',
	'autoRenewal',
	'transferStatus',
	'teamId',
];

/** The DNS-record-model fields most workflows read, for the Simplify toggle. */
const RECORD_SIMPLIFY_FIELDS = [
	'$id',
	'type',
	'name',
	'value',
	'ttl',
	'priority',
	'weight',
	'port',
	'comment',
	'lock',
];

/** Each record type's name as Appwrite writes it (e.g. `CNAME`), by its path segment. */
const RECORD_TYPES: Record<string, string> = Object.fromEntries(
	DNS_RECORD_TYPES.map((type) => [type.value, type.name]),
);

/** The record types that carry a priority, and the one that also carries a weight and port. */
const PRIORITY_TYPES = ['mx', 'srv'];
const SERVICE_TYPE = 'srv';

interface RecordFields {
	comment?: unknown;
	dnsRecordPort?: number;
	dnsRecordPriority?: number;
	dnsRecordWeight?: number;
	name?: unknown;
	ttl?: number;
	value?: unknown;
}

export async function executeDomainOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Resolved on first use: creating and listing domains act on no existing domain.
	const domainId = (): string => getResourceId.call(this, 'domainId', i, 'domain', 'Domain');
	const domainPath = (): string => `/domains/${encodeURIComponent(domainId())}`;
	const recordId = (): string => getResourceId.call(this, 'dnsRecordId', i, 'record', 'Record');
	const recordPath = (): string => `${domainPath()}/records/${encodeURIComponent(recordId())}`;
	const presetPath = (): string =>
		`${domainPath()}/presets/${encodeURIComponent(String(this.getNodeParameter('domainPreset', i)))}`;
	const simplified = (data: IDataObject | IDataObject[], fields: string[]) =>
		toItems(
			(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data,
			i,
		);
	/** The chosen record type, as the path segment of its endpoints (e.g. `cname`). */
	const recordType = (): string => {
		const type = String(this.getNodeParameter('dnsRecordType', i));
		lookupEnum(this, RECORD_TYPES, type, 'record type', i);
		return type;
	};

	/**
	 * The body of a record's create or update request: the name, value, TTL and
	 * comment every type takes, plus the priority, weight and port of the types
	 * that have them. Fields the user left out fall back to `current`.
	 */
	const recordBody = (type: string, fields: RecordFields, current: IDataObject = {}) => {
		const pick = (key: keyof RecordFields, currentKey: string) =>
			fields[key] === undefined ? current[currentKey] : fields[key];
		const text = (value: unknown) =>
			value === undefined || value === null ? undefined : String(value);
		const body: IDataObject = {
			name: text(pick('name', 'name')),
			value: text(pick('value', 'value')),
			ttl: pick('ttl', 'ttl'),
			comment: text(pick('comment', 'comment')),
		};
		if (PRIORITY_TYPES.includes(type)) body.priority = pick('dnsRecordPriority', 'priority');
		if (type === SERVICE_TYPE) {
			body.weight = pick('dnsRecordWeight', 'weight');
			body.port = pick('dnsRecordPort', 'port');
		}
		return body;
	};

	if (operation === 'create') {
		// A domain belongs to an organization, which Appwrite calls a team: the
		// one the credential's key belongs to.
		const { organizationId } = await this.getCredentials(ORGANIZATION_CREDENTIAL);
		const response = await organizationApiRequest.call(
			this,
			'POST',
			'/domains',
			{
				body: {
					teamId: String(organizationId ?? ''),
					domain: String(this.getNodeParameter('domain', i) ?? '').trim(),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createPreset') {
		const response = await organizationApiRequest.call(this, 'POST', presetPath(), {}, i);
		return toItems((response.dnsRecords ?? []) as IDataObject[], i);
	}

	if (operation === 'createRecord') {
		const type = recordType();
		const options = getCollectionParameter.call(this, 'options', i) as { comment?: unknown };
		const fields: RecordFields = {
			name: this.getNodeParameter('name', i),
			value: this.getNodeParameter('value', i),
			ttl: this.getNodeParameter('ttl', i) as number,
			comment: options.comment,
		};
		if (PRIORITY_TYPES.includes(type)) {
			fields.dnsRecordPriority = this.getNodeParameter('dnsRecordPriority', i) as number;
		}
		if (type === SERVICE_TYPE) {
			fields.dnsRecordWeight = this.getNodeParameter('dnsRecordWeight', i) as number;
			fields.dnsRecordPort = this.getNodeParameter('dnsRecordPort', i) as number;
		}
		const response = await organizationApiRequest.call(
			this,
			'POST',
			`${domainPath()}/records/${type}`,
			{ body: recordBody(type, fields) },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		const id = domainId();
		await organizationApiRequest.call(this, 'DELETE', `/domains/${encodeURIComponent(id)}`, {}, i);
		return toItems({ deleted: true, domainId: id }, i);
	}

	if (operation === 'deleteRecord') {
		await organizationApiRequest.call(this, 'DELETE', recordPath(), {}, i);
		return toItems({ deleted: true, domainId: domainId(), dnsRecordId: recordId() }, i);
	}

	if (operation === 'get') {
		const response = await organizationApiRequest.call(this, 'GET', domainPath(), {}, i);
		return simplified(response, SIMPLIFY_FIELDS);
	}

	if (operation === 'getMany') {
		const search = String(
			(getCollectionParameter.call(this, 'options', i) as { search?: unknown }).search ?? '',
		);
		const domains = await organizationGetMany.call(
			this,
			'/domains',
			'domains',
			i,
			search === '' ? undefined : search,
		);
		return simplified(domains, SIMPLIFY_FIELDS);
	}

	if (operation === 'getManyRecords') {
		const records = await organizationGetMany.call(
			this,
			`${domainPath()}/records`,
			'dnsRecords',
			i,
		);
		return simplified(records, RECORD_SIMPLIFY_FIELDS);
	}

	if (operation === 'getPreset') {
		const response = await organizationApiRequest.call(this, 'GET', presetPath(), {}, i);
		return simplified((response.dnsRecords ?? []) as IDataObject[], RECORD_SIMPLIFY_FIELDS);
	}

	if (operation === 'getRecord') {
		const response = await organizationApiRequest.call(this, 'GET', recordPath(), {}, i);
		return simplified(response, RECORD_SIMPLIFY_FIELDS);
	}

	if (operation === 'getTransferStatus') {
		const response = await organizationApiRequest.call(
			this,
			'GET',
			`${domainPath()}/transfers/status`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'getZone') {
		// The zone file comes back as plain text, which is read as bytes and
		// decoded here rather than left to JSON parsing to pass through.
		const id = domainId();
		const zone = await appwriteApiRequestBinary.call(
			this,
			'GET',
			`/domains/${encodeURIComponent(id)}/zone`,
			{ credentialType: ORGANIZATION_CREDENTIAL },
			i,
		);
		return toItems({ domainId: id, zone: Buffer.from(zone).toString('utf8') }, i);
	}

	if (operation === 'listPrices') {
		const domains = getStringListParameter.call(this, 'domainNames', i, 'Domain Names');
		if (domains.length === 0) {
			throw new NodeOperationError(this.getNode(), "The 'Domain Names' parameter is empty", {
				description: 'Enter at least one domain name to check, such as example.com.',
				itemIndex: i,
			});
		}
		const options = getCollectionParameter.call(this, 'options', i) as {
			domainPeriodYears?: number;
			domainRegistrationType?: string;
		};
		const response = await organizationApiRequest.call(
			this,
			'GET',
			'/domains/prices',
			{
				qs: {
					domains,
					periodYears: options.domainPeriodYears,
					registrationType: options.domainRegistrationType,
				},
			},
			i,
		);
		return toItems((response.prices ?? []) as IDataObject[], i);
	}

	if (operation === 'updateNameservers') {
		const options = getCollectionParameter.call(this, 'options', i) as {
			domainNameservers?: unknown;
		};
		const nameservers =
			options.domainNameservers === undefined
				? []
				: parseStringList.call(this, options.domainNameservers, 'Nameservers', i);
		// Appwrite sets its own nameservers when the list is left out.
		const response = await organizationApiRequest.call(
			this,
			'PATCH',
			`${domainPath()}/nameservers`,
			{ body: { nameservers: nameservers.length > 0 ? nameservers : undefined } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateRecord') {
		const type = recordType();
		const path = recordPath();
		const updateFields = getCollectionParameter.call(this, 'updateFields', i) as RecordFields;
		// The update endpoints require the name, value and TTL (and the priority,
		// weight and port of the types that have them) every time: read the
		// record first and resend whatever the user did not change. A record's
		// type is part of the endpoint and cannot change, so it must match.
		const current = await organizationApiRequest.call(this, 'GET', path, {}, i);
		const currentType = String(current.type ?? '').toLowerCase();
		if (currentType !== type && currentType in RECORD_TYPES) {
			throw new NodeOperationError(
				this.getNode(),
				`The record is a ${RECORD_TYPES[currentType]} record, not ${RECORD_TYPES[type]}`,
				{ description: `Set 'Record Type' to ${RECORD_TYPES[currentType]}.`, itemIndex: i },
			);
		}
		const response = await organizationApiRequest.call(
			this,
			'PUT',
			`${domainPath()}/records/${type}/${encodeURIComponent(recordId())}`,
			{ body: recordBody(type, updateFields, current) },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateTeam') {
		const response = await organizationApiRequest.call(
			this,
			'PATCH',
			`${domainPath()}/team`,
			{ body: { teamId: String(this.getNodeParameter('domainOrganizationId', i) ?? '') } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateZone') {
		const response = await organizationApiRequest.call(
			this,
			'PUT',
			`${domainPath()}/zone`,
			{ body: { content: String(this.getNodeParameter('content', i) ?? '') } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'verifyNameservers') {
		const response = await organizationApiRequest.call(
			this,
			'PATCH',
			`${domainPath()}/nameservers/verification`,
			{},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown domain operation "${operation}"`, {
		itemIndex: i,
	});
}
