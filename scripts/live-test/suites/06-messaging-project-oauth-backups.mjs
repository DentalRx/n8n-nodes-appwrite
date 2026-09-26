import { id, ref, RUN, email, phone } from '../common.mjs';

const PW = 'Passw0rd!Test-123';
const P = (t) => id(`p${t}`);
const off = { enabled: false };
const providers = [
	[
		'smtp',
		{
			smtpHost: 'smtp.example.com',
			options: { ...off, port: 587, fromEmail: 'noreply@example.com', fromName: 'Test' },
		},
	],
	['sendgrid', { options: { ...off, apiKey: 'fake-key', fromEmail: 'noreply@example.com' } }],
	[
		'mailgun',
		{
			options: {
				...off,
				apiKey: 'fake-key',
				domain: 'mg.example.com',
				fromEmail: 'noreply@example.com',
			},
		},
	],
	['resend', { options: { ...off, apiKey: 'fake-key', fromEmail: 'noreply@example.com' } }],
	[
		'ses',
		{
			options: {
				...off,
				accessKey: 'fake-access',
				secretKey: 'fake-secret',
				region: 'us-east-1',
				fromEmail: 'noreply@example.com',
			},
		},
	],
	[
		'twilio',
		{ options: { ...off, accountSid: 'ACfake', authToken: 'fake', from: '+15550100000' } },
	],
	['vonage', { options: { ...off, apiKey: 'fake', apiSecret: 'fake', from: '+15550100001' } }],
	['telesign', { options: { ...off, customerId: 'fake', apiKey: 'fake', from: '+15550100002' } }],
	['textmagic', { options: { ...off, username: 'fake', apiKey: 'fake', from: '+15550100003' } }],
	['msg91', { options: { ...off, templateId: 'fake', senderId: 'fake', authKey: 'fake' } }],
	[
		'fcm',
		{ options: { ...off, serviceAccountJSON: '{"type":"service_account","project_id":"fake"}' } },
	],
	[
		'apns',
		{
			options: {
				...off,
				authKey: 'fake',
				authKeyId: 'fake',
				teamId: 'fake',
				bundleId: 'com.example.app',
				sandbox: true,
			},
		},
	],
	['appwrite', { options: { ...off } }],
];
const JWT = ref('OAuth: User JWT', 'jwt');
const APP = id('app');
const SECRET_VALUE = ref('OAuth: Create Secret', 'secret');
const pick = (node, ...fields) =>
	`={{ (() => { const j = $('${node}').first().json; for (const f of ${JSON.stringify(fields)}) { const v = f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), j); if (v) return v; } const u = String(j.redirectUrl ?? j.redirect ?? j.url ?? j.location ?? ''); return (u.match(/[?&]code=([^&]+)/) ?? [])[1] ?? ''; })() }}`;
const unknown = 'no-such-database';
const ded = (op, extra = {}) => ({
	name: `${op} (unknown ID)`,
	op: `dedicatedDatabase.${op}`,
	set: { databaseEngine: 'postgresql', dedicatedDatabaseId: unknown, ...extra },
});

export default [
	{
		key: 'Msg',
		title: 'Messaging: providers, topics, subscribers, draft messages',
		steps: [
			...providers.map(([t, extra]) => ({
				name: `Create Provider (${t})`,
				op: 'provider.create',
				set: { providerType: t, name: `Test ${t}`, providerId: P(t), ...extra },
			})),
			{ name: 'Get Provider', op: 'provider.get', set: { providerId: P('smtp') } },
			{ name: 'Get Many Providers', op: 'provider.getMany', set: { limit: 20 } },
			{
				name: 'Update Provider',
				op: 'provider.update',
				set: {
					providerId: P('smtp'),
					providerType: 'smtp',
					updateFields: { name: 'Test smtp (renamed)', port: 2525 },
				},
			},
			{
				name: 'Create User',
				op: 'user.create',
				set: {
					userId: id('mu'),
					options: { email: email('mu'), password: PW, name: 'Messaging User' },
				},
			},
			{
				name: 'Create Target',
				op: 'user.createTarget',
				set: {
					userId: id('mu'),
					targetId: id('mt'),
					targetProviderType: 'email',
					targetIdentifier: email('mt'),
					options: { providerId: P('smtp') },
				},
			},
			{
				name: 'Create Topic',
				op: 'topic.create',
				set: { topicId: id('topic'), name: 'Test Topic', subscribe: 'users' },
			},
			{ name: 'Get Topic', op: 'topic.get', set: { topicId: id('topic') } },
			{ name: 'Get Many Topics', op: 'topic.getMany', set: { limit: 5 } },
			{
				name: 'Update Topic',
				op: 'topic.update',
				set: { topicId: id('topic'), updateFields: { name: 'Test Topic (renamed)' } },
			},
			{
				name: 'Create Subscriber',
				op: 'topic.createSubscriber',
				set: { topicId: id('topic'), targetId: id('mt'), subscriberId: id('sub') },
			},
			{
				name: 'Get Subscriber',
				op: 'topic.getSubscriber',
				set: { topicId: id('topic'), subscriberId: id('sub') },
			},
			{
				name: 'Get Many Subscribers',
				op: 'topic.getManySubscribers',
				set: { topicId: id('topic') },
			},
			{
				name: 'Create Email (draft)',
				op: 'message.createEmail',
				set: {
					messageId: id('me'),
					subject: 'Draft email',
					content: 'Hello from the n8n live test',
					targets: id('mt'),
					options: { draft: true },
				},
			},
			{
				name: 'Create SMS (draft)',
				op: 'message.createSMS',
				set: {
					messageId: id('ms'),
					content: 'Draft SMS',
					users: id('mu'),
					options: { draft: true },
				},
			},
			{
				name: 'Create Push (draft)',
				op: 'message.createPush',
				set: {
					messageId: id('mp'),
					title: 'Draft push',
					body: 'Hello',
					topics: id('topic'),
					options: { draft: true, data: '{"source":"n8n"}' },
				},
			},
			{ name: 'Get Message', op: 'message.get', set: { messageId: id('me') } },
			{ name: 'Get Many Messages', op: 'message.getMany', set: { limit: 10 } },
			{ name: 'Get Message Targets', op: 'message.getManyTargets', set: { messageId: id('me') } },
			{
				name: 'Update Email',
				op: 'message.updateEmail',
				set: {
					messageId: id('me'),
					updateFields: { subject: 'Draft email (edited)', draft: true },
				},
			},
			{
				name: 'Update SMS',
				op: 'message.updateSMS',
				set: { messageId: id('ms'), updateFields: { content: 'Draft SMS (edited)', draft: true } },
			},
			{
				name: 'Update Push',
				op: 'message.updatePush',
				set: { messageId: id('mp'), updateFields: { title: 'Draft push (edited)', draft: true } },
			},
			{ name: 'Delete Email', op: 'message.delete', set: { messageId: id('me') } },
			{ name: 'Delete SMS', op: 'message.delete', set: { messageId: id('ms') } },
			{ name: 'Delete Push', op: 'message.delete', set: { messageId: id('mp') } },
			{
				name: 'Delete Subscriber',
				op: 'topic.deleteSubscriber',
				set: { topicId: id('topic'), subscriberId: id('sub') },
			},
			{ name: 'Delete Topic', op: 'topic.delete', set: { topicId: id('topic') } },
			{ name: 'Delete User', op: 'user.delete', set: { userId: id('mu') } },
			...providers.map(([t]) => ({
				name: `Delete Provider (${t})`,
				op: 'provider.delete',
				set: { providerId: P(t) },
			})),
		],
	},
	{
		key: 'Proj',
		title: 'Project settings: platforms, keys, webhooks, variables, templates, firewall',
		steps: [
			{ name: 'Get Project', op: 'project.get' },
			{ name: 'Update Labels', op: 'project.updateLabels', set: { labels: 'test,n8n' } },
			{
				name: 'Disable Auth Method',
				op: 'project.updateAuthMethod',
				set: { authMethod: 'magic-url', enabled: false },
			},
			{
				name: 'Enable Auth Method',
				op: 'project.updateAuthMethod',
				set: { authMethod: 'magic-url', enabled: true },
			},
			{
				name: 'Disable Service',
				op: 'project.updateService',
				set: { projectService: 'graphql', enabled: false },
			},
			{
				name: 'Enable Service',
				op: 'project.updateService',
				set: { projectService: 'graphql', enabled: true },
			},
			{
				name: 'Disable Protocol',
				op: 'project.updateProtocol',
				set: { projectProtocol: 'websocket', enabled: false },
			},
			{
				name: 'Enable Protocol',
				op: 'project.updateProtocol',
				set: { projectProtocol: 'websocket', enabled: true },
			},
			{ name: 'Get Many Policies', op: 'project.getManyPolicies' },
			{ name: 'Get Policy', op: 'project.getPolicy', set: { projectPolicy: 'password-strength' } },
			{
				name: 'Update Policy',
				op: 'project.updatePolicy',
				set: {
					projectPolicy: 'password-strength',
					updateFields: { passwordMinLength: 10, requireNumber: true },
				},
			},
			{
				name: 'Reset Policy',
				op: 'project.updatePolicy',
				set: {
					projectPolicy: 'password-strength',
					updateFields: { passwordMinLength: 8, requireNumber: false },
				},
			},
			{
				name: 'Update SMTP',
				op: 'project.updateSmtp',
				set: {
					updateFields: {
						smtpEnabled: false,
						smtpHost: 'smtp.example.com',
						smtpPort: 587,
						smtpSenderEmail: 'noreply@example.com',
						smtpSenderName: 'Test',
					},
				},
			},
			{
				name: 'Send Test Email (SMTP off)',
				op: 'project.sendTestEmail',
				set: { testEmailRecipients: 'test@example.com' },
			},
			...[
				['web', 'app.example.com'],
				['android', 'com.example.app'],
				['apple', 'com.example.app'],
				['linux', 'example-app'],
				['windows', 'ExampleApp'],
			].map(([t, identifier]) => ({
				name: `Create Platform (${t})`,
				op: 'platform.create',
				set: {
					platformType: t,
					name: `Test ${t}`,
					platformIdentifier: identifier,
					platformId: id(`pl${t}`),
				},
			})),
			{ name: 'Get Platform', op: 'platform.get', set: { platformId: id('plweb') } },
			{ name: 'Get Many Platforms', op: 'platform.getMany' },
			{
				name: 'Update Platform',
				op: 'platform.update',
				set: {
					platformId: id('plweb'),
					platformType: 'web',
					updateFields: { name: 'Test web (renamed)' },
				},
			},
			...['web', 'android', 'apple', 'linux', 'windows'].map((t) => ({
				name: `Delete Platform (${t})`,
				op: 'platform.delete',
				set: { platformId: id(`pl${t}`) },
			})),
			{
				name: 'Create Ephemeral Key',
				op: 'apiKey.createEphemeral',
				set: { keyScopes: 'users.read, health.read', keyDuration: 600 },
			},
			{ name: 'Get Many Keys', op: 'apiKey.getMany' },
			{ name: 'Get Key', op: 'apiKey.get', set: { apiKeyId: 'n8n-full-access' } },
			{
				name: 'Update Key (same name)',
				op: 'apiKey.update',
				set: { apiKeyId: 'n8n-full-access', updateFields: { name: 'n8n Full Access (test)' } },
			},
			{ name: 'Delete Key (unknown ID)', op: 'apiKey.delete', set: { apiKeyId: 'no-such-key' } },
			{
				name: 'Create Webhook',
				op: 'webhook.create',
				set: {
					webhookId: id('wh'),
					name: 'Test Hook',
					url: 'https://example.com/hook',
					webhookEvents: 'users.*.create',
					options: { enabled: false },
				},
			},
			{ name: 'Get Webhook', op: 'webhook.get', set: { webhookId: id('wh') } },
			{ name: 'Get Many Webhooks', op: 'webhook.getMany' },
			{
				name: 'Update Webhook',
				op: 'webhook.update',
				set: {
					webhookId: id('wh'),
					updateFields: { name: 'Test Hook (renamed)', events: 'users.*.create, users.*.delete' },
				},
			},
			{
				name: 'Update Webhook Secret',
				op: 'webhook.updateSecret',
				set: { webhookId: id('wh'), webhookSecret: 'a-new-test-secret-1234567890' },
			},
			{ name: 'Delete Webhook', op: 'webhook.delete', set: { webhookId: id('wh') } },
			{
				name: 'Create Variable',
				op: 'projectVariable.create',
				set: { variableId: id('pv'), key: 'TEST_VAR', value: '1', secret: false },
			},
			{ name: 'Get Variable', op: 'projectVariable.get', set: { variableId: id('pv') } },
			{ name: 'Get Many Variables', op: 'projectVariable.getMany' },
			{
				name: 'Update Variable',
				op: 'projectVariable.update',
				set: { variableId: id('pv'), updateFields: { value: '2' } },
			},
			{ name: 'Delete Variable', op: 'projectVariable.delete', set: { variableId: id('pv') } },
			{
				name: 'Get Email Template',
				op: 'emailTemplate.get',
				set: { emailTemplateType: 'verification', emailTemplateLocale: 'en' },
			},
			{ name: 'Get Many Email Templates', op: 'emailTemplate.getMany' },
			{
				name: 'Update Email Template',
				op: 'emailTemplate.update',
				set: {
					emailTemplateType: 'verification',
					emailTemplateLocale: 'en',
					updateFields: { templateSubject: 'Verify your account (test)' },
				},
			},
			{ name: 'Get OAuth2 Provider', op: 'oauth2Provider.get', set: { oauth2Provider: 'github' } },
			{ name: 'Get Many OAuth2 Providers', op: 'oauth2Provider.getMany' },
			{
				name: 'Update OAuth2 Provider',
				op: 'oauth2Provider.update',
				set: {
					oauth2Provider: 'github',
					updateFields: {
						oauth2ClientId: 'fake-client-id',
						oauth2ClientSecret: 'fake-client-secret',
						enabled: false,
					},
				},
			},
			{
				name: 'Create Mock Phone',
				op: 'mockPhone.create',
				set: { phone: phone('289'), mockPhoneCode: '111111' },
			},
			{ name: 'Get Mock Phone', op: 'mockPhone.get', set: { phone: phone('289') } },
			{ name: 'Get Many Mock Phones', op: 'mockPhone.getMany' },
			{
				name: 'Update Mock Phone',
				op: 'mockPhone.update',
				set: { phone: phone('289'), mockPhoneCode: '222222' },
			},
			{ name: 'Delete Mock Phone', op: 'mockPhone.delete', set: { phone: phone('289') } },
			{
				name: 'Create WAF Rule',
				op: 'wafRule.create',
				set: {
					wafRuleId: id('waf'),
					name: 'Block a test path',
					wafRuleType: 'deny',
					wafResourceType: 'api',
					wafConditionsUi: {
						conditionValues: [
							{
								wafConditionAttribute: 'path',
								wafConditionOperator: 'startsWith',
								wafConditionValue: '/v1/n8n-live-test-blocked',
							},
						],
					},
					options: { enabled: false },
				},
			},
			{ name: 'Get WAF Rule', op: 'wafRule.get', set: { wafRuleId: id('waf') } },
			{ name: 'Get Many WAF Rules', op: 'wafRule.getMany' },
			{
				name: 'Update WAF Rule',
				op: 'wafRule.update',
				set: {
					wafRuleId: id('waf'),
					wafRuleType: 'deny',
					updateFields: { name: 'Block a test path (renamed)', enabled: false },
				},
			},
			{ name: 'Delete WAF Rule', op: 'wafRule.delete', set: { wafRuleId: id('waf') } },
			{
				name: 'Create Proxy Rule',
				op: 'proxyRule.create',
				set: { proxyRuleType: 'api', domain: `={{ 'n8ntest' + ${RUN} + '.example.com' }}` },
			},
			{
				name: 'Get Proxy Rule',
				op: 'proxyRule.get',
				set: { proxyRuleId: ref('Proj: Create Proxy Rule') },
			},
			{ name: 'Get Many Proxy Rules', op: 'proxyRule.getMany' },
			{
				name: 'Verify Domain (no DNS)',
				op: 'proxyRule.verifyDomain',
				set: { proxyRuleId: ref('Proj: Create Proxy Rule') },
			},
			{
				name: 'Purge Cache',
				op: 'proxyRule.purgeCache',
				set: { domain: `={{ 'n8ntest' + ${RUN} + '.example.com' }}`, proxyPurgeType: 'all' },
			},
			{
				name: 'Delete Proxy Rule',
				op: 'proxyRule.delete',
				set: { proxyRuleId: ref('Proj: Create Proxy Rule') },
			},
		],
	},
	{
		key: 'OAuth',
		title: 'OAuth2 server: apps, secrets, keys, installations, authorization flows',
		steps: [
			{
				name: 'Enable OAuth2 Server',
				op: 'project.updateOAuth2Server',
				set: {
					updateFields: {
						oauth2ServerEnabled: true,
						oauth2ServerAuthorizationUrl: 'https://example.com/consent',
						oauth2ServerVerificationUrl: 'https://example.com/device',
						oauth2ServerScopes: 'openid,profile,email',
						oauth2ServerDefaultScopes: 'openid',
					},
				},
			},
			{ name: 'Get Many OAuth2 Scopes', op: 'app.getManyOAuth2Scopes' },
			{ name: 'Get Many Installation Scopes', op: 'app.getManyInstallationScopes' },
			{ name: 'Create Team', op: 'team.create', set: { teamId: id('ot'), name: 'OAuth Team' } },
			{
				name: 'Create Second Team',
				op: 'team.create',
				set: { teamId: id('ot2'), name: 'OAuth Team 2' },
			},
			{
				name: 'Create App',
				op: 'app.create',
				set: {
					appId: APP,
					name: 'Test App',
					redirectUris: 'https://example.com/callback',
					teamId: id('ot'),
					options: {
						appClientType: 'confidential',
						description: 'n8n live test',
						deviceFlow: true,
					},
				},
			},
			{ name: 'Get App', op: 'app.get', set: { appId: APP } },
			{ name: 'Get Many Apps', op: 'app.getMany' },
			{
				name: 'Update App',
				op: 'app.update',
				set: {
					appId: APP,
					updateFields: {
						tagline: 'Testing',
						redirectUris: 'https://example.com/callback, https://example.com/cb2',
					},
				},
			},
			{
				name: 'Update App Labels',
				op: 'app.updateLabels',
				set: { appId: APP, labels: 'test,n8n' },
			},
			{ name: 'Create Secret', op: 'app.createSecret', set: { appId: APP } },
			{
				name: 'Get Secret',
				op: 'app.getSecret',
				set: { appId: APP, appSecretId: ref('OAuth: Create Secret') },
			},
			{ name: 'Get Many Secrets', op: 'app.getManySecrets', set: { appId: APP } },
			{ name: 'Create Key', op: 'app.createKey', set: { appId: APP } },
			{
				name: 'Get Key',
				op: 'app.getKey',
				set: { appId: APP, appKeyId: ref('OAuth: Create Key') },
			},
			{ name: 'Get Many Keys', op: 'app.getManyKeys', set: { appId: APP } },
			{
				name: 'Team Install App',
				op: 'team.createInstallation',
				set: { teamId: id('ot'), appId: APP },
			},
			{
				name: 'Team Get Installation',
				op: 'team.getInstallation',
				set: { teamId: id('ot'), installationId: ref('OAuth: Team Install App') },
			},
			{
				name: 'Team Get Many Installations',
				op: 'team.getManyInstallations',
				set: { teamId: id('ot') },
			},
			{
				name: 'Team Update Installation',
				op: 'team.updateInstallation',
				set: {
					teamId: id('ot'),
					installationId: ref('OAuth: Team Install App'),
					updateFields: { authorizationDetails: '[]' },
				},
			},
			{
				name: 'Second Team Install App',
				op: 'team.createInstallation',
				set: { teamId: id('ot2'), appId: APP },
			},
			{
				name: 'App Get Installation',
				op: 'app.getInstallation',
				set: { appId: APP, installationId: ref('OAuth: Team Install App') },
			},
			{ name: 'App Get Many Installations', op: 'app.getManyInstallations', set: { appId: APP } },
			{
				name: 'Create Installation Token',
				op: 'app.createInstallationToken',
				set: { appId: APP, installationId: ref('OAuth: Team Install App') },
			},
			{
				name: 'Create User',
				op: 'user.create',
				set: {
					userId: id('ou'),
					options: { email: email('ou'), password: PW, name: 'OAuth User' },
				},
			},
			{ name: 'User Session', op: 'user.createSession', set: { userId: id('ou') } },
			{
				name: 'User JWT',
				op: 'user.createJWT',
				set: { userId: id('ou'), options: { sessionId: ref('OAuth: User Session') } },
			},
			{
				name: 'Get Authorization URL',
				op: 'oauth2Server.getAuthorizationUrl',
				set: {
					appId: APP,
					oauth2RedirectUri: 'https://example.com/callback',
					options: { oauth2Scopes: 'openid', oauth2State: 'n8n-state' },
				},
			},
			{
				name: 'Pushed Authorization Request',
				op: 'oauth2Server.createPushedAuthorizationRequest',
				set: {
					appId: APP,
					oauth2RedirectUri: 'https://example.com/callback',
					options: { oauth2Scopes: 'openid' },
				},
			},
			{
				name: 'Start Authorization',
				op: 'oauth2Server.startAuthorization',
				set: {
					accountJwt: JWT,
					appId: APP,
					oauth2RedirectUri: 'https://example.com/callback',
					options: { oauth2Scopes: 'openid', oauth2State: 'n8n-state' },
				},
			},
			{
				name: 'Get Grant',
				op: 'oauth2Server.getGrant',
				set: {
					oauth2GrantId: pick('OAuth: Start Authorization', 'grantId', 'grant.$id', '$id', 'id'),
				},
			},
			{
				name: 'Approve Authorization',
				op: 'oauth2Server.approveAuthorization',
				set: {
					accountJwt: JWT,
					oauth2GrantId: pick('OAuth: Start Authorization', 'grantId', 'grant.$id', '$id', 'id'),
				},
			},
			{
				name: 'Create Token',
				op: 'oauth2Server.createToken',
				set: {
					appId: APP,
					appClientType: 'confidential',
					oauth2ClientSecret: SECRET_VALUE,
					oauth2GrantType: 'authorization_code',
					oauth2Code: pick('OAuth: Approve Authorization', 'code'),
					oauth2RedirectUri: 'https://example.com/callback',
				},
			},
			{
				name: 'Revoke Token',
				op: 'oauth2Server.revokeToken',
				set: {
					appId: APP,
					appClientType: 'confidential',
					oauth2ClientSecret: SECRET_VALUE,
					oauth2Token: pick('OAuth: Create Token', 'access_token', 'accessToken'),
					options: { oauth2TokenTypeHint: 'access_token' },
				},
			},
			{
				name: 'Start Authorization 2',
				op: 'oauth2Server.startAuthorization',
				set: {
					accountJwt: JWT,
					appId: APP,
					oauth2RedirectUri: 'https://example.com/callback',
					options: { oauth2Scopes: 'openid' },
				},
			},
			{
				name: 'Reject Authorization',
				op: 'oauth2Server.rejectAuthorization',
				set: {
					accountJwt: JWT,
					oauth2GrantId: pick('OAuth: Start Authorization 2', 'grantId', 'grant.$id', '$id', 'id'),
				},
			},
			{
				name: 'Device Authorization',
				op: 'oauth2Server.createDeviceAuthorization',
				set: { appId: APP, options: { oauth2Scopes: 'openid' } },
			},
			{
				name: 'Device Grant',
				op: 'oauth2Server.createDeviceGrant',
				set: {
					accountJwt: JWT,
					oauth2UserCode: pick('OAuth: Device Authorization', 'user_code', 'userCode'),
				},
			},
			{ name: 'Revoke App Tokens', op: 'app.revokeTokens', set: { appId: APP } },
			{ name: 'Transfer App', op: 'app.transfer', set: { appId: APP, teamId: id('ot2') } },
			{
				name: 'Team Delete Installation',
				op: 'team.deleteInstallation',
				set: { teamId: id('ot'), installationId: ref('OAuth: Team Install App') },
			},
			{
				name: 'App Delete Installation',
				op: 'app.deleteInstallation',
				set: { appId: APP, installationId: ref('OAuth: Second Team Install App') },
			},
			{
				name: 'Delete Secret',
				op: 'app.deleteSecret',
				set: { appId: APP, appSecretId: ref('OAuth: Create Secret') },
			},
			{
				name: 'Delete Key',
				op: 'app.deleteKey',
				set: { appId: APP, appKeyId: ref('OAuth: Create Key') },
			},
			{ name: 'Delete App', op: 'app.delete', set: { appId: APP } },
			{ name: 'Delete User', op: 'user.delete', set: { userId: id('ou') } },
			{ name: 'Delete Team', op: 'team.delete', set: { teamId: id('ot') } },
			{ name: 'Delete Second Team', op: 'team.delete', set: { teamId: id('ot2') } },
			{
				name: 'Disable OAuth2 Server',
				op: 'project.updateOAuth2Server',
				set: { updateFields: { oauth2ServerEnabled: false } },
			},
		],
	},
	{
		key: 'Backup',
		title: 'Backups: policies, archives, restorations',
		steps: [
			{ name: 'Get Many Policies', op: 'backup.getManyPolicies' },
			{ name: 'Get Many Archives', op: 'backup.getManyArchives' },
			{ name: 'Get Many Restorations', op: 'backup.getManyRestorations' },
			{
				name: 'Create Policy',
				op: 'backup.createPolicy',
				set: {
					policyId: id('pol'),
					backupServices: ['tablesdb'],
					backupRetention: 7,
					backupSchedule: '0 2 * * *',
					options: { name: 'Nightly test', enabled: false },
				},
			},
			{ name: 'Get Policy', op: 'backup.getPolicy', set: { policyId: id('pol') } },
			{
				name: 'Update Policy',
				op: 'backup.updatePolicy',
				set: {
					policyId: id('pol'),
					updateFields: { name: 'Nightly test (renamed)', retention: 3 },
				},
			},
			{ name: 'Delete Policy', op: 'backup.deletePolicy', set: { policyId: id('pol') } },
			{
				name: 'Create Database',
				op: 'database.create',
				set: { databaseId: id('bdb'), name: 'Backup Test DB' },
			},
			{
				name: 'Create Archive',
				op: 'backup.createArchive',
				set: { backupServices: ['tablesdb'], options: { resourceId: id('bdb') } },
			},
			{ name: 'Wait For Archive', wait: 30 },
			{
				name: 'Get Archive',
				op: 'backup.getArchive',
				set: { archiveId: ref('Backup: Create Archive') },
			},
			{
				name: 'Create Restoration',
				op: 'backup.createRestoration',
				set: {
					archiveId: ref('Backup: Create Archive'),
					backupServices: ['tablesdb'],
					options: { newResourceId: id('rdb'), newResourceName: 'Restored Test DB' },
				},
			},
			{
				name: 'Get Restoration',
				op: 'backup.getRestoration',
				set: { restorationId: ref('Backup: Create Restoration') },
			},
			{ name: 'Wait For Restoration', wait: 20 },
			{
				name: 'Delete Archive',
				op: 'backup.deleteArchive',
				set: { archiveId: ref('Backup: Create Archive') },
			},
			{ name: 'Delete Database', op: 'database.delete', set: { databaseId: id('bdb') } },
			{ name: 'Delete Restored Database', op: 'database.delete', set: { databaseId: id('rdb') } },
		],
	},
	{
		key: 'Dedicated',
		title: 'Dedicated databases (no creation: listing and error handling only)',
		steps: [
			{
				name: 'Get Many (PostgreSQL)',
				op: 'dedicatedDatabase.getMany',
				set: { databaseEngine: 'postgresql' },
			},
			{
				name: 'Get Many (MySQL)',
				op: 'dedicatedDatabase.getMany',
				set: { databaseEngine: 'mysql' },
			},
			{
				name: 'Get Many (MongoDB)',
				op: 'dedicatedDatabase.getMany',
				set: { databaseEngine: 'mongodb' },
			},
			{
				name: 'Get Many Specifications',
				op: 'dedicatedDatabase.getManySpecifications',
				set: { databaseEngine: 'postgresql' },
			},
			ded('get'),
			ded('getStatus'),
			ded('getReplicas'),
			ded('getManyOperations'),
			ded('getManyBackups'),
			ded('getManyBackupPolicies'),
			ded('getManyBranches'),
			ded('getManyExtensions'),
			ded('getManyRestorations'),
			ded('getRecoveryWindow'),
			ded('getPooler'),
			ded('getBackup', { backupId: 'no-such-backup' }),
			ded('getBackupPolicy', { backupPolicyId: 'no-such-policy' }),
			ded('getRestoration', { restorationId: 'no-such-restoration' }),
			ded('update', { updateFields: { name: 'Renamed' } }),
			ded('createBackup'),
			ded('createBackupPolicy', { name: 'Nightly', backupSchedule: '0 2 * * *' }),
			ded('createBranch'),
			ded('deleteBackup', { backupId: 'no-such-backup' }),
			ded('deleteBackupPolicy', { backupPolicyId: 'no-such-policy' }),
			ded('deleteBranch', { branchId: 'no-such-branch' }),
			ded('executeSql', { sqlStatement: 'SELECT 1' }),
			ded('installExtension', { extensionName: 'pg_trgm' }),
			ded('uninstallExtension', { extensionName: 'pg_trgm' }),
			ded('migrate'),
			ded('restore', { backupId: 'no-such-backup' }),
			ded('rotateCredentials'),
			ded('triggerFailover'),
			ded('updateBackupPolicy', {
				backupPolicyId: 'no-such-policy',
				updateFields: { name: 'Renamed' },
			}),
			ded('updateBackupStorage', {
				backupStorageBucket: 'bucket',
				backupStorageAccessKey: 'fake',
				backupStorageSecretKey: 'fake',
			}),
			ded('updatePooler', { updateFields: {} }),
			ded('updateMaintenanceWindow', { maintenanceDay: 'sun', maintenanceHourUtc: 3 }),
			ded('upgrade', { targetVersion: '18' }),
			ded('delete'),
		],
	},
	{
		key: 'Audit',
		title: 'Activity events and Advisor reports',
		steps: [
			{ name: 'Get Many Events', op: 'activity.getManyEvents', set: { limit: 5 } },
			{
				name: 'Get Event',
				op: 'activity.getEvent',
				set: { eventId: `={{ $('Audit: Get Many Events').first().json.$id ?? 'no-such-event' }}` },
			},
			{ name: 'Get Many Reports', op: 'advisor.getManyReports' },
			{
				name: 'Get Report',
				op: 'advisor.getReport',
				set: {
					reportId: `={{ $('Audit: Get Many Reports').first().json.$id ?? 'no-such-report' }}`,
				},
			},
			{
				name: 'Get Many Insights',
				op: 'advisor.getManyInsights',
				set: {
					reportId: `={{ $('Audit: Get Many Reports').first().json.$id ?? 'no-such-report' }}`,
				},
			},
			{
				name: 'Get Insight',
				op: 'advisor.getInsight',
				set: {
					reportId: `={{ $('Audit: Get Many Reports').first().json.$id ?? 'no-such-report' }}`,
					insightId: `={{ $('Audit: Get Many Insights').first().json.$id ?? 'no-such-insight' }}`,
				},
			},
			{
				name: 'Delete Report',
				op: 'advisor.deleteReport',
				set: {
					reportId: `={{ $('Audit: Get Many Reports').first().json.$id ?? 'no-such-report' }}`,
				},
			},
		],
	},
];
