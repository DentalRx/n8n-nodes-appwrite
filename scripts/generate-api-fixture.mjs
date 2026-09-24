#!/usr/bin/env node
// Derives test/fixtures/appwrite-api.json from Appwrite's official OpenAPI
// document (https://github.com/appwrite/specs), keeping only what the contract
// test checks: for every server-side operation, its method and path, the query
// and body parameters it accepts (with their enum values and, for the body,
// their JSON types), and the parameters each SDK method on it requires.
//
// Usage: node scripts/generate-api-fixture.mjs <path-to-open-api3-X.json>
// e.g.   git clone --depth 1 https://github.com/appwrite/specs /tmp/specs
//        node scripts/generate-api-fixture.mjs /tmp/specs/specs/2.3.x/open-api3-2.3.x.json

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [specPath] = process.argv.slice(2);
if (!specPath) {
	console.error('Usage: node scripts/generate-api-fixture.mjs <path-to-open-api3-X.json>');
	process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));

/**
 * The enum values a schema allows (directly or for its array items), or null.
 * Newer specs describe an enum as a `oneOf` of single-value alternatives.
 */
function enumOf(schema) {
	for (const candidate of [schema, schema?.items]) {
		if (Array.isArray(candidate?.enum)) return candidate.enum;
		if (Array.isArray(candidate?.oneOf)) {
			const values = candidate.oneOf.flatMap((alternative) => alternative.enum ?? []);
			if (values.length > 0) return values;
		}
	}
	return null;
}

const operations = {};
for (const [path, methods] of Object.entries(spec.paths)) {
	for (const [method, operation] of Object.entries(methods)) {
		const meta = operation['x-appwrite'] ?? {};
		if (!(meta.platforms ?? []).includes('server')) continue;

		const pathParams = new Set();
		const query = {};
		for (const parameter of operation.parameters ?? []) {
			if (parameter.in === 'path') pathParams.add(parameter.name);
			if (parameter.in === 'query') query[parameter.name] = enumOf(parameter.schema);
		}

		const content = operation.requestBody?.content ?? {};
		const bodySchema = Object.values(content)[0]?.schema ?? {};
		const body = {};
		const bodyTypes = {};
		for (const [name, schema] of Object.entries(bodySchema.properties ?? {})) {
			body[name] = enumOf(schema);
			// JSON bodies keep their types: Appwrite rejects the number 7 where
			// its validator expects the text "7".
			if (schema.type) bodyTypes[name] = schema.nullable ? `${schema.type}?` : schema.type;
		}

		// One SDK method per variant; operations served by several SDK methods
		// (createRow and createRows share POST .../rows) list each one's
		// required parameters separately.
		const inRequest = (name) => !pathParams.has(name);
		const variants = (
			meta.methods ?? [
				{
					name: operation.operationId,
					required: [
						...(bodySchema.required ?? []),
						...(operation.parameters ?? []).filter((p) => p.required).map((p) => p.name),
					],
				},
			]
		).map((variant) => ({
			name: variant.name,
			required: [...new Set((variant.required ?? []).filter(inRequest))].sort(),
		}));

		// An endpoint is only deprecated when every SDK method on it is: POST
		// /messaging/messages/sms is flagged because its old createSms alias is,
		// while createSMS on the same endpoint is current.
		const deprecated = meta.methods
			? meta.methods.every((variant) => variant.deprecated)
			: Boolean(operation.deprecated);

		operations[`${method.toUpperCase()} ${path}`] = {
			id: operation.operationId,
			...(deprecated ? { deprecated: true } : {}),
			query,
			body,
			bodyTypes,
			variants,
		};
	}
}

const output = {
	source: 'https://github.com/appwrite/specs',
	version: spec.info?.version,
	operations: Object.fromEntries(Object.entries(operations).sort(([a], [b]) => a.localeCompare(b))),
};

const target = join(dirname(fileURLToPath(import.meta.url)), '../test/fixtures/appwrite-api.json');
writeFileSync(target, `${JSON.stringify(output, null, '\t')}\n`);
console.log(
	`Wrote ${Object.keys(operations).length} operations (Appwrite ${output.version}) to ${target}`,
);
