import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getCollectionParameter,
	getStringListParameter,
	parseJsonArrayParameter,
	simplifyItems,
	toItems,
} from '../GenericFunctions';
import {
	ORGANIZATION_CREDENTIAL,
	organizationApiRequest,
	organizationGetMany,
} from '../helpers/organization';

/** The organization-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'$createdAt',
	'name',
	'total',
	'status',
	'billingPlan',
	'billingEmail',
	'billingBudget',
	'billingNextInvoiceDate',
	'markedForDeletion',
];

/** The membership-model fields most workflows read, for the Simplify toggle. */
const MEMBERSHIP_SIMPLIFY_FIELDS = [
	'$id',
	'userId',
	'userName',
	'userEmail',
	'teamId',
	'roles',
	'invited',
	'joined',
	'confirm',
	'mfa',
];

export async function executeOrganizationOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// An expression can resolve a text field to a number.
	const text = (name: string): string => String(this.getNodeParameter(name, i) ?? '');
	const simplified = (data: IDataObject | IDataObject[], fields: string[]) =>
		toItems(
			(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data,
			i,
		);

	// The ID of a sub-record in the path: an empty one would send the request
	// to the list endpoint instead, so it stops the item with a clear message.
	const pathId = (name: string, label: string): string => {
		const id = text(name).trim();
		if (id === '') {
			throw new NodeOperationError(this.getNode(), `The '${label}' parameter is empty`, {
				description: `Enter the ID of the ${label.replace(/ ID$/, '').toLowerCase()}.`,
				itemIndex: i,
			});
		}
		return id;
	};
	const membershipId = (): string => pathId('membershipId', 'Membership ID');
	const membershipPath = (): string =>
		`/organization/memberships/${encodeURIComponent(membershipId())}`;
	const installationId = (): string => pathId('installationId', 'Installation ID');
	const installationPath = (): string =>
		`/organization/installations/${encodeURIComponent(installationId())}`;

	// Appwrite takes the details as a string holding a JSON array, not as the array itself.
	const authorizationDetails = (values: { authorizationDetails?: unknown }): string | undefined =>
		values.authorizationDetails === undefined
			? undefined
			: JSON.stringify(
					parseJsonArrayParameter.call(
						this,
						values.authorizationDetails,
						'Authorization Details',
						i,
					),
				);

	if (operation === 'createInstallation') {
		const options = getCollectionParameter.call(this, 'options', i) as IDataObject;
		const response = await organizationApiRequest.call(
			this,
			'POST',
			'/organization/installations',
			{
				body: {
					appId: text('installationAppId'),
					authorizationDetails: authorizationDetails(options),
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'createMembership') {
		const email = text('email');
		const userId = text('organizationUserId');
		const phone = text('phone');
		if (email === '' && userId === '' && phone === '') {
			throw new NodeOperationError(this.getNode(), 'No one to invite to the organization', {
				description: 'Set at least one of Email, User ID, or Phone.',
				itemIndex: i,
			});
		}
		const options = getCollectionParameter.call(this, 'options', i) as {
			name?: unknown;
			url?: unknown;
		};
		const name = String(options.name ?? '');
		const url = String(options.url ?? '');
		const response = await organizationApiRequest.call(
			this,
			'POST',
			'/organization/memberships',
			{
				body: {
					email: email === '' ? undefined : email,
					userId: userId === '' ? undefined : userId,
					phone: phone === '' ? undefined : phone,
					roles: getStringListParameter.call(this, 'roles', i, 'Roles'),
					url: url === '' ? undefined : url,
					name: name === '' ? undefined : name,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'delete') {
		// The organization is the one the credential names, so name it in the
		// output the way other deletes name the record they removed.
		const { organizationId } = await this.getCredentials(ORGANIZATION_CREDENTIAL);
		await organizationApiRequest.call(this, 'DELETE', '/organization', {}, i);
		return toItems({ deleted: true, organizationId: String(organizationId ?? '') }, i);
	}

	if (operation === 'deleteInstallation') {
		await organizationApiRequest.call(this, 'DELETE', installationPath(), {}, i);
		return toItems({ deleted: true, installationId: installationId() }, i);
	}

	if (operation === 'deleteMembership') {
		await organizationApiRequest.call(this, 'DELETE', membershipPath(), {}, i);
		return toItems({ deleted: true, membershipId: membershipId() }, i);
	}

	if (operation === 'get') {
		const response = await organizationApiRequest.call(this, 'GET', '/organization', {}, i);
		return simplified(response, SIMPLIFY_FIELDS);
	}

	if (operation === 'getInstallation') {
		const response = await organizationApiRequest.call(this, 'GET', installationPath(), {}, i);
		return toItems(response, i);
	}

	if (operation === 'getManyInstallations') {
		return toItems(
			await organizationGetMany.call(this, '/organization/installations', 'installations', i),
			i,
		);
	}

	if (operation === 'getManyMemberships') {
		const search = String(
			(getCollectionParameter.call(this, 'options', i) as { search?: unknown }).search ?? '',
		);
		const memberships = await organizationGetMany.call(
			this,
			'/organization/memberships',
			'memberships',
			i,
			search === '' ? undefined : search,
		);
		return simplified(memberships, MEMBERSHIP_SIMPLIFY_FIELDS);
	}

	if (operation === 'getMembership') {
		const response = await organizationApiRequest.call(this, 'GET', membershipPath(), {}, i);
		return simplified(response, MEMBERSHIP_SIMPLIFY_FIELDS);
	}

	if (operation === 'updateInstallation') {
		const updateFields = getCollectionParameter.call(this, 'updateFields', i) as IDataObject;
		const response = await organizationApiRequest.call(
			this,
			'PUT',
			installationPath(),
			{ body: { authorizationDetails: authorizationDetails(updateFields) } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateMembership') {
		const roles = getStringListParameter.call(this, 'roles', i, 'Roles');
		const response = await organizationApiRequest.call(
			this,
			'PATCH',
			membershipPath(),
			{ body: { roles } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateName') {
		const response = await organizationApiRequest.call(
			this,
			'PUT',
			'/organization',
			{ body: { name: text('name') } },
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown organization operation "${operation}"`, {
		itemIndex: i,
	});
}
