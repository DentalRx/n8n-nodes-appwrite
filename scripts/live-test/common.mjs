// Helpers the suite files share.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RUN = '$execution.id';

/** An ID unique to this run, e.g. id('db') -> db<executionId>. */
export const id = (prefix) => `={{ '${prefix}' + ${RUN} }}`;
/** A field of an earlier node's first output item. */
export const ref = (node, field = '$id') => `={{ $('${node}').first().json.${field} }}`;
export const email = (prefix) => `={{ '${prefix}' + ${RUN} + '@example.com' }}`;
export const phone = (area) => `={{ '+1${area}555' + String(${RUN}).slice(-4).padStart(4, '0') }}`;
export const payload = (name) => readFileSync(join(HERE, 'payload', name), 'utf8').trim();

const TOTP_LIB = readFileSync(join(HERE, 'totp.js'), 'utf8').replace(/export \{[^}]*\};\s*$/, '');
/** Code for a Code node that computes the current TOTP code for an authenticator made by `node`. */
export const totpCode = (node) => `${TOTP_LIB}
const secret = $('${node}').first().json.secret;
return [{ json: { otp: totp(base32(secret), Date.now() / 1000) } }];`;
