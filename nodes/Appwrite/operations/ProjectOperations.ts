import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { ProjectPolicy, ProjectPolicyField } from '../descriptions/projectPolicies';
import { PROJECT_POLICIES } from '../descriptions/projectPolicies';
import {
	getCollectionParameter,
	getManyByOffset,
	getStringListParameter,
	getStringParameter,
	lookupEnum,
	parseStringList,
	simplifyItems,
	toItems,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

/** The project-model fields most workflows read, for the Simplify toggle. */
const SIMPLIFY_FIELDS = [
	'$id',
	'name',
	'teamId',
	'region',
	'status',
	'labels',
	'authMethods',
	'services',
	'protocols',
	'smtpEnabled',
];

/**
 * The settings of `PUT /project/oauth2-server`. Each is offered as an
 * `oauth2Server<Setting>` field, sent as `<setting>`, and read back from the
 * project model as `oAuth2Server<Setting>`.
 */
const OAUTH2_SERVER_SETTINGS = [
	'Enabled',
	'AuthorizationUrl',
	'Scopes',
	'AuthorizationDetailsTypes',
	'AccessTokenDuration',
	'RefreshTokenDuration',
	'PublicAccessTokenDuration',
	'PublicRefreshTokenDuration',
	'InstallationAccessTokenDuration',
	'ConfidentialPkce',
	'VerificationUrl',
	'UserCodeLength',
	'UserCodeFormat',
	'DeviceCodeDuration',
	'DefaultScopes',
	'InstallationScopes',
];

/** The OAuth2 server settings entered as lists, with their labels. */
const OAUTH2_SERVER_LISTS: Record<string, string> = {
	Scopes: 'Allowed Scopes',
	AuthorizationDetailsTypes: 'Authorization Details Types',
	DefaultScopes: 'Default Scopes',
	InstallationScopes: 'Installation Scopes',
};

const POLICIES: Record<string, ProjectPolicy> = Object.fromEntries(
	PROJECT_POLICIES.map((policy) => [policy.value, policy]),
);

interface SmtpFields {
	smtpEnabled?: boolean;
	smtpHost?: string;
	smtpPassword?: string;
	smtpPort?: number;
	smtpReplyToEmail?: string;
	smtpReplyToName?: string;
	smtpSecure?: string;
	smtpSenderEmail?: string;
	smtpSenderName?: string;
	smtpUsername?: string;
}

export async function executeProjectOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	// Switches that turn one named part of the project on or off.
	const toggle = async (path: string, idParameter: string): Promise<INodeExecutionData[]> => {
		const id = getStringParameter.call(this, idParameter, i);
		const enabled = this.getNodeParameter('enabled', i) as boolean;
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`${path}/${encodeURIComponent(id)}`,
			{ body: { enabled } },
			i,
		);
		return toItems(response, i);
	};

	if (operation === 'delete') {
		// The project is the one the credential points at, so name it in the
		// output the way other deletes name the record they removed.
		const { projectId } = await this.getCredentials('appwriteApi');
		await appwriteApiRequest.call(this, 'DELETE', '/project', {}, i);
		return toItems({ deleted: true, projectId: projectId as string }, i);
	}

	if (operation === 'get') {
		const response = await appwriteApiRequest.call(this, 'GET', '/project', {}, i);
		const simplify = this.getNodeParameter('simplify', i, false) as boolean;
		return toItems(simplify ? simplifyItems(response, SIMPLIFY_FIELDS) : response, i);
	}

	if (operation === 'getManyPolicies') {
		const policies = await getManyByOffset.call(
			this,
			async (queries) =>
				await appwriteApiRequest.call(this, 'GET', '/project/policies', { qs: { queries } }, i),
			'policies',
			i,
		);
		return toItems(policies, i);
	}

	if (operation === 'getPolicy') {
		const policyId = getStringParameter.call(this, 'projectPolicy', i);
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/project/policies/${encodeURIComponent(policyId)}`,
			{},
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'sendTestEmail') {
		const emails = getStringListParameter.call(this, 'testEmailRecipients', i, 'Recipients');
		if (emails.length === 0) {
			throw new NodeOperationError(this.getNode(), "The 'Recipients' parameter is empty", {
				description: 'Enter at least one email address to send the test email to.',
				itemIndex: i,
			});
		}
		await appwriteApiRequest.call(this, 'POST', '/project/smtp/tests', { body: { emails } }, i);
		return toItems({ sent: true, emails }, i);
	}

	if (operation === 'updateAuthMethod') {
		return await toggle('/project/auth-methods', 'authMethod');
	}

	if (operation === 'updateLabels') {
		const labels = getStringListParameter.call(this, 'labels', i, 'Labels');
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			'/project/labels',
			{ body: { labels } },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateOAuth2Server') {
		const updateFields = getCollectionParameter.call(this, 'updateFields', i);
		// PUT replaces the whole configuration and resets anything left out to
		// Appwrite's default, so read the current settings and resend the ones
		// the user did not change.
		const current = await appwriteApiRequest.call(this, 'GET', '/project', {}, i);
		const body: IDataObject = {};
		for (const setting of OAUTH2_SERVER_SETTINGS) {
			const key = setting.charAt(0).toLowerCase() + setting.slice(1);
			const value = updateFields[`oauth2Server${setting}`];
			if (value === undefined) {
				// An unset setting reads back empty; leaving it out lets Appwrite
				// apply its default instead of rejecting the empty value.
				const currentValue = current[`oAuth2Server${setting}`];
				body[key] = currentValue === null || currentValue === '' ? undefined : currentValue;
			} else if (setting in OAUTH2_SERVER_LISTS) {
				body[key] = parseStringList.call(this, value as string, OAUTH2_SERVER_LISTS[setting], i);
			} else {
				body[key] = value;
			}
		}
		const response = await appwriteApiRequest.call(
			this,
			'PUT',
			'/project/oauth2-server',
			{ body },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updatePolicy') {
		const policy = lookupEnum(
			this,
			POLICIES,
			getStringParameter.call(this, 'projectPolicy', i),
			'policy',
			i,
		);
		const toBody = (field: ProjectPolicyField, value: unknown): unknown =>
			field.toBody === undefined ? value : field.toBody(value);

		const body: IDataObject = {};
		for (const field of policy.required) {
			body[field.body] = toBody(
				field,
				this.getNodeParameter(field.property.name, i),
			) as IDataObject[string];
		}
		// Optional settings the user did not add keep their current values.
		const updateFields = getCollectionParameter.call(this, 'updateFields', i);
		for (const field of policy.optional) {
			const value = updateFields[field.property.name];
			if (value !== undefined) body[field.body] = toBody(field, value) as IDataObject[string];
		}
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			`/project/policies/${encodeURIComponent(policy.value)}`,
			{ body },
			i,
		);
		return toItems(response, i);
	}

	if (operation === 'updateProtocol') {
		return await toggle('/project/protocols', 'projectProtocol');
	}

	if (operation === 'updateService') {
		return await toggle('/project/services', 'projectService');
	}

	if (operation === 'updateSmtp') {
		const smtp = getCollectionParameter.call(this, 'updateFields', i) as SmtpFields;
		// Appwrite keeps every setting left out, and clears a text setting sent
		// empty; the host is the exception, as an empty host is rejected.
		const response = await appwriteApiRequest.call(
			this,
			'PATCH',
			'/project/smtp',
			{
				body: {
					enabled: smtp.smtpEnabled,
					host: smtp.smtpHost || undefined,
					port: smtp.smtpPort,
					username: smtp.smtpUsername,
					password: smtp.smtpPassword,
					senderEmail: smtp.smtpSenderEmail,
					senderName: smtp.smtpSenderName,
					replyToEmail: smtp.smtpReplyToEmail,
					replyToName: smtp.smtpReplyToName,
					secure: smtp.smtpSecure,
				},
			},
			i,
		);
		return toItems(response, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown project operation "${operation}"`, {
		itemIndex: i,
	});
}
