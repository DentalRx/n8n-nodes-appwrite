import { id, ref, email, phone, totpCode } from '../common.mjs';

const PW = 'Passw0rd!Test-123';
const PW2 = 'N3w-Passw0rd!Test';
const JWT = ref('Account: Server JWT', 'jwt');
const SECRET = ref('Account: Server Session', 'secret');
const PHONE_A = phone('647');
const PHONE_B = phone('905');

export default [
	{
		key: 'Account',
		title: 'Account (acting as a signed-in user)',
		steps: [
			{
				name: 'Register Web Platform',
				op: 'platform.create',
				set: {
					platformType: 'web',
					name: 'Example (test redirects)',
					platformIdentifier: 'example.com',
					platformId: id('wp'),
				},
			},
			{
				name: 'Create Mock Phone A',
				op: 'mockPhone.create',
				set: { phone: PHONE_A, mockPhoneCode: '123456' },
			},
			{
				name: 'Create Mock Phone B',
				op: 'mockPhone.create',
				set: { phone: PHONE_B, mockPhoneCode: '123456' },
			},
			{
				name: 'Sign Up',
				op: 'account.create',
				set: {
					userId: id('au'),
					email: email('au'),
					password: PW,
					options: { name: 'Account User' },
				},
			},
			{
				name: 'Email Password Session',
				op: 'account.createEmailPasswordSession',
				set: { email: email('au'), password: PW },
			},
			{ name: 'Server Session', op: 'user.createSession', set: { userId: id('au') } },
			{
				name: 'Server JWT',
				op: 'user.createJWT',
				set: {
					userId: id('au'),
					options: { sessionId: ref('Account: Server Session'), duration: 3600 },
				},
			},
			{ name: 'Get Account', op: 'account.get', set: { accountJwt: JWT } },
			{
				name: 'Get Account (session secret)',
				op: 'account.get',
				set: { accountAuthentication: 'session', accountSessionSecret: SECRET },
			},
			{
				name: 'Update Name',
				op: 'account.updateName',
				set: { accountJwt: JWT, name: 'Renamed Account' },
			},
			{
				name: 'Update Prefs',
				op: 'account.updatePrefs',
				set: { accountJwt: JWT, prefs: '{"lang":"en"}' },
			},
			{ name: 'Get Prefs', op: 'account.getPrefs', set: { accountJwt: JWT } },
			{
				name: 'Update Email',
				op: 'account.updateEmail',
				set: { accountJwt: JWT, email: email('au2-'), password: PW },
			},
			{
				name: 'Update Phone',
				op: 'account.updatePhone',
				set: { accountJwt: JWT, phone: PHONE_A, password: PW },
			},
			{
				name: 'Update Password',
				op: 'account.updatePassword',
				set: { accountJwt: JWT, password: PW2, options: { oldPassword: PW } },
			},
			{ name: 'Get Many Sessions', op: 'account.getManySessions', set: { accountJwt: JWT } },
			{
				name: 'Get Current Session',
				op: 'account.getSession',
				set: { accountJwt: JWT, sessionId: 'current' },
			},
			{
				name: 'Get Session By ID',
				op: 'account.getSession',
				set: { accountJwt: JWT, sessionId: ref('Account: Email Password Session') },
			},
			{
				name: 'Update Session',
				op: 'account.updateSession',
				set: { accountJwt: JWT, sessionId: 'current' },
			},
			{ name: 'Get Many Identities', op: 'account.getManyIdentities', set: { accountJwt: JWT } },
			{
				name: 'Delete Identity (unknown ID)',
				op: 'account.deleteIdentity',
				set: { accountJwt: JWT, identityId: 'no-such-identity' },
			},
			{ name: 'Get Many Consents', op: 'account.getManyConsents', set: { accountJwt: JWT } },
			{
				name: 'Get Consent (unknown ID)',
				op: 'account.getConsent',
				set: { accountJwt: JWT, consentId: 'no-such-consent' },
			},
			{
				name: 'Get Many Consent Tokens (unknown consent)',
				op: 'account.getManyConsentTokens',
				set: { accountJwt: JWT, consentId: 'no-such-consent' },
			},
			{
				name: 'Get Consent Token (unknown ID)',
				op: 'account.getConsentToken',
				set: { accountJwt: JWT, consentId: 'no-such-consent', consentTokenId: 'no-such-token' },
			},
			{
				name: 'Delete Consent Token (unknown ID)',
				op: 'account.deleteConsentToken',
				set: { accountJwt: JWT, consentId: 'no-such-consent', consentTokenId: 'no-such-token' },
			},
			{
				name: 'Delete Consent (unknown ID)',
				op: 'account.deleteConsent',
				set: { accountJwt: JWT, consentId: 'no-such-consent' },
			},
			{
				name: 'Create Email Verification',
				op: 'account.createEmailVerification',
				set: { accountJwt: JWT, url: 'https://example.com/verify' },
			},
			{
				name: 'Complete Email Verification (bad secret)',
				op: 'account.completeEmailVerification',
				set: { userId: id('au'), accountSecret: 'bad-secret' },
			},
			{
				name: 'Create Phone Verification',
				op: 'account.createPhoneVerification',
				set: { accountJwt: JWT },
			},
			{
				name: 'Complete Phone Verification',
				op: 'account.completePhoneVerification',
				set: { userId: id('au'), accountSecret: '123456' },
			},
			{ name: 'Get MFA Factors', op: 'account.getMfaFactors', set: { accountJwt: JWT } },
			{
				name: 'Create MFA Authenticator',
				op: 'account.createMfaAuthenticator',
				set: { accountJwt: JWT },
			},
			{ name: 'TOTP 1', code: totpCode('Account: Create MFA Authenticator') },
			{
				name: 'Verify MFA Authenticator',
				op: 'account.verifyMfaAuthenticator',
				set: { accountSessionSecret: SECRET, accountOtp: ref('Account: TOTP 1', 'otp') },
			},
			{
				name: 'Create MFA Recovery Codes',
				op: 'account.createMfaRecoveryCodes',
				set: { accountJwt: JWT },
			},
			{
				name: 'Enable MFA',
				op: 'account.updateMfa',
				set: { accountSessionSecret: SECRET, accountMfa: true },
			},
			{
				name: 'Create MFA Challenge',
				op: 'account.createMfaChallenge',
				set: { accountJwt: JWT, accountMfaFactor: 'totp' },
			},
			{
				name: 'Server Get MFA Challenge',
				op: 'user.getMfaChallenge',
				set: { userId: id('au'), mfaChallengeId: ref('Account: Create MFA Challenge') },
			},
			{ name: 'Wait For Next TOTP Window', wait: 31 },
			{ name: 'TOTP 2', code: totpCode('Account: Create MFA Authenticator') },
			{
				name: 'Complete MFA Challenge',
				op: 'account.completeMfaChallenge',
				set: {
					accountSessionSecret: SECRET,
					challengeId: ref('Account: Create MFA Challenge'),
					accountOtp: ref('Account: TOTP 2', 'otp'),
				},
			},
			{
				name: 'Get MFA Recovery Codes',
				op: 'account.getMfaRecoveryCodes',
				set: { accountSessionSecret: SECRET },
			},
			{
				name: 'Regenerate MFA Recovery Codes',
				op: 'account.regenerateMfaRecoveryCodes',
				set: { accountSessionSecret: SECRET },
			},
			{
				name: 'Delete MFA Authenticator',
				op: 'account.deleteMfaAuthenticator',
				set: { accountSessionSecret: SECRET },
			},
			{
				name: 'Create MFA Authenticator Again',
				op: 'account.createMfaAuthenticator',
				set: { accountJwt: JWT },
			},
			{
				name: 'Server Delete MFA Authenticator',
				op: 'user.deleteMfaAuthenticator',
				set: { userId: id('au') },
			},
			{
				name: 'Disable MFA',
				op: 'account.updateMfa',
				set: { accountSessionSecret: SECRET, accountMfa: false },
			},
			{
				name: 'Create Email Token',
				op: 'account.createEmailToken',
				set: { userId: id('ae'), email: email('ae') },
			},
			{
				name: 'Create Magic URL Token',
				op: 'account.createMagicUrlToken',
				set: {
					userId: id('am'),
					email: email('am'),
					options: { url: 'https://example.com/magic' },
				},
			},
			{
				name: 'Create Phone Token',
				op: 'account.createPhoneToken',
				set: { userId: id('ap'), phone: PHONE_B },
			},
			{
				name: 'Create Session From Token',
				op: 'account.createSession',
				set: { userId: id('ap'), accountSecret: '123456' },
			},
			{ name: 'Create Anonymous Session', op: 'account.createAnonymousSession' },
			{
				name: 'Create Recovery',
				op: 'account.createRecovery',
				set: { email: email('au2-'), url: 'https://example.com/recover' },
			},
			{
				name: 'Complete Recovery (bad secret)',
				op: 'account.completeRecovery',
				set: { userId: id('au'), accountSecret: 'bad-secret', password: 'Another-Passw0rd!' },
			},
			{
				name: 'Get OAuth2 Login URL',
				op: 'account.getOAuth2LoginUrl',
				set: { oauth2Provider: 'github', accountSuccessUrl: 'https://example.com/ok' },
			},
			{
				name: 'ID Token Session (invalid token)',
				op: 'account.createIdTokenSession',
				set: { accountIdTokenProvider: 'google', accountIdToken: 'not-a-real-id-token' },
			},
			{
				name: 'Delete Session',
				op: 'account.deleteSession',
				set: { accountJwt: JWT, sessionId: ref('Account: Email Password Session') },
			},
			{ name: 'Server Session AP', op: 'user.createSession', set: { userId: id('ap') } },
			{
				name: 'Server JWT AP',
				op: 'user.createJWT',
				set: { userId: id('ap'), options: { sessionId: ref('Account: Server Session AP') } },
			},
			{
				name: 'Delete Sessions',
				op: 'account.deleteSessions',
				set: { accountJwt: ref('Account: Server JWT AP', 'jwt') },
			},
			{ name: 'Block Account', op: 'account.updateStatus', set: { accountJwt: JWT } },
			{ name: 'Delete User AU', op: 'user.delete', set: { userId: id('au') } },
			{ name: 'Delete User AE', op: 'user.delete', set: { userId: id('ae') } },
			{ name: 'Delete User AM', op: 'user.delete', set: { userId: id('am') } },
			{ name: 'Delete User AP', op: 'user.delete', set: { userId: id('ap') } },
			{
				name: 'Delete Anonymous User',
				op: 'user.delete',
				set: { userId: ref('Account: Create Anonymous Session', 'userId') },
			},
			{ name: 'Delete Mock Phone A', op: 'mockPhone.delete', set: { phone: PHONE_A } },
			{ name: 'Delete Mock Phone B', op: 'mockPhone.delete', set: { phone: PHONE_B } },
			{ name: 'Delete Web Platform', op: 'platform.delete', set: { platformId: id('wp') } },
		],
	},
];
