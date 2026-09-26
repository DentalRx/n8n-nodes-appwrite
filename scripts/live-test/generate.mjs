#!/usr/bin/env node
// Builds the live test workflow. Turns a suite file from suites/ into batches
// of n8n MCP `update_workflow` operations that add one Appwrite node per step
// to a test workflow, each suite a chain off a node named "Run", ending in a
// Summary Code node that reports every step's outcome. See README.md.
//
// Usage: npm run build
//        LIVE_CREDENTIAL_ID=<n8n credential ID> LIVE_CREDENTIAL_NAME=<its name> \
//          node scripts/live-test/generate.mjs <suite file> <first row> [--start-after "<node name>"]
//
// Every step is checked against the node's description before anything is
// written: the operation must exist, each field set must be shown for the
// values given, and every required field must be filled.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { NodeHelpers } = require('n8n-workflow');
const { Appwrite } = require(join(HERE, '../../dist/nodes/Appwrite/Appwrite.node.js'));

const TYPE = '@dentalrx/n8n-nodes-appwrite.appwrite';
const DESCRIPTION = new Appwrite().description;
const NODE_TYPE = { description: DESCRIPTION };
const FAKE_NODE = { name: 'Appwrite', type: TYPE, typeVersion: 1, parameters: {} };
const SETTINGS = { executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput' };
const BATCH_SIZE = 99;

function operationsOf(resource) {
	const property = DESCRIPTION.properties.find(
		(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes(resource),
	);
	return (property?.options ?? []).map((option) => option.value);
}

function shownProperties(parameters) {
	const resolved =
		NodeHelpers.getNodeParameters(
			DESCRIPTION.properties,
			parameters,
			true,
			false,
			FAKE_NODE,
			NODE_TYPE,
		) ?? {};
	return {
		resolved,
		shown: DESCRIPTION.properties.filter((p) =>
			NodeHelpers.displayParameter(resolved, p, FAKE_NODE, NODE_TYPE),
		),
	};
}

function appwriteNode(step, credentials, errors) {
	const [resource, operation] = step.op.split('.');
	if (!operationsOf(resource).includes(operation)) {
		errors.push(`${step.name}: unknown operation ${step.op}`);
		return null;
	}
	const parameters = { resource, operation, ...(step.set ?? {}) };
	// Resource locators given a plain value are set By ID.
	for (const prop of shownProperties(parameters).shown) {
		const value = parameters[prop.name];
		if (prop.type === 'resourceLocator' && value !== undefined && typeof value !== 'object') {
			parameters[prop.name] = { __rl: true, mode: 'id', value };
		}
	}
	const { resolved, shown } = shownProperties(parameters);
	const shownNames = new Set(shown.map((p) => p.name));
	for (const key of Object.keys(step.set ?? {})) {
		if (!shownNames.has(key))
			errors.push(`${step.name}: ${key} is not shown for ${step.op} with these values`);
	}
	for (const prop of shown.filter((p) => p.required)) {
		const value = resolved[prop.name];
		if (value === '' || value === undefined || (value?.__rl && value.value === '')) {
			errors.push(`${step.name}: required ${prop.name} is empty`);
		}
	}
	return { type: TYPE, typeVersion: 1, parameters, credentials };
}

function summaryCode(names) {
	return `const names = ${JSON.stringify(names)};
const out = [];
for (const node of names) {
	try {
		const items = $(node).all();
		const j = items[0]?.json ?? {};
		if (j.error) out.push({ json: { node, ok: false, error: String(j.error).slice(0, 200), description: String(j.description ?? '').slice(0, 300), httpCode: j.httpCode ?? null } });
		else out.push({ json: { node, ok: true, items: items.length, binary: Object.keys(items[0]?.binary ?? {}).join(','), sample: JSON.stringify(j).slice(0, 200) } });
	} catch (e) {
		out.push({ json: { node, ok: false, error: 'not executed: ' + e.message } });
	}
}
return out;`;
}

/**
 * The operations that add the suites' nodes, from row `rowStart` of the
 * canvas. With `startAfter`, nodes up to and including that one are taken to
 * be in the workflow already, and the rest continue from it.
 */
export function build(suites, { credentials, rowStart = 0, startAfter } = {}) {
	const errors = [];
	const ops = [];
	const groups = [];
	const names = new Set();
	let skipping = Boolean(startAfter);
	suites.forEach((suite, row) => {
		const y = 240 + (rowStart + row) * 220;
		let previous = 'Run';
		const testNames = [];
		const groupNodes = [];
		[...suite.steps, { name: 'Summary', summary: true }].forEach((step, index) => {
			const name = `${suite.key}: ${step.name}`;
			if (names.has(name)) errors.push(`duplicate node name ${name}`);
			names.add(name);
			let node;
			if (step.op) node = appwriteNode(step, credentials, errors);
			else if (step.wait)
				node = { type: 'n8n-nodes-base.wait', typeVersion: 1.1, parameters: { amount: step.wait } };
			else if (step.code)
				node = { type: 'n8n-nodes-base.code', typeVersion: 2, parameters: { jsCode: step.code } };
			else if (step.raw) node = step.raw;
			else if (step.summary)
				node = {
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					parameters: { jsCode: summaryCode(testNames) },
				};
			if (!node) return;
			if (step.op) testNames.push(name);
			groupNodes.push(name);
			if (!skipping) {
				ops.push({ type: 'addNode', node: { name, position: [440 + index * 240, y], ...node } });
				if (!step.summary)
					ops.push({ type: 'setNodeSettings', nodeName: name, settings: SETTINGS });
				ops.push({ type: 'addConnection', source: previous, target: name });
			}
			if (skipping && name === startAfter) skipping = false;
			previous = name;
		});
		groups.push({ name: suite.title, nodeNames: groupNodes });
	});
	if (skipping) errors.push(`--start-after node "${startAfter}" is not in these suites`);
	return { errors, ops, groups };
}

async function main() {
	const args = process.argv.slice(2);
	const startAfterIndex = args.indexOf('--start-after');
	const startAfter = startAfterIndex >= 0 ? args.splice(startAfterIndex, 2)[1] : undefined;
	const [file, rowStart = '0'] = args;
	const { LIVE_CREDENTIAL_ID: id, LIVE_CREDENTIAL_NAME: name } = process.env;
	if (!file || !id || !name) {
		console.error(
			'Usage: LIVE_CREDENTIAL_ID=<id> LIVE_CREDENTIAL_NAME=<name> node scripts/live-test/generate.mjs <suite file> <first row> [--start-after "<node name>"]',
		);
		process.exit(1);
	}
	const { default: suites } = await import(pathToFileURL(resolve(file)).href);
	const { errors, ops, groups } = build(suites, {
		credentials: { appwriteApi: { id, name } },
		rowStart: Number(rowStart),
		startAfter,
	});
	if (errors.length) {
		console.error(`ERRORS:\n${errors.join('\n')}`);
		process.exit(1);
	}
	const outDir = join(HERE, 'out', basename(file).replace(/\.m?js$/, ''));
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });
	for (let i = 0; i * BATCH_SIZE < ops.length; i++) {
		writeFileSync(
			join(outDir, `ops-${i}.json`),
			JSON.stringify(ops.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)),
		);
	}
	writeFileSync(join(outDir, 'groups.json'), JSON.stringify(groups));
	const nodes = ops.filter((op) => op.type === 'addNode').length;
	console.log(
		`${nodes} nodes, ${ops.length} operations in ${Math.ceil(ops.length / BATCH_SIZE)} batches: ${outDir}`,
	);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
	await main();
