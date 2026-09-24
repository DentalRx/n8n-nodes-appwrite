import type { INodeParameters } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import dailyDigest from '../examples/daily-digest-of-new-rows.json';
import formSubmissions from '../examples/save-form-submissions-to-a-table.json';
import storeFile from '../examples/store-a-downloaded-file-in-storage.json';
import packageJson from '../package.json';
import {
	createExecuteContext,
	description,
	node,
	resolveParameters,
	testNode,
} from './helpers/mock-context';
import { BINARY, universalResponse } from './helpers/smoke-cases';

/**
 * The workflows in examples/ are documentation users import, so they must stay
 * in step with the node: every Appwrite node in them has to use parameters the
 * node still shows for its operation, and has to run.
 */

interface WorkflowNode {
	name: string;
	type: string;
	typeVersion: number;
	parameters: Record<string, unknown>;
}

const examples: Array<[string, { name: string; nodes: WorkflowNode[] }]> = [
	['daily-digest-of-new-rows', dailyDigest],
	['save-form-submissions-to-a-table', formSubmissions],
	['store-a-downloaded-file-in-storage', storeFile],
];

const nodeType = `${packageJson.name}.${description.name}`;

describe.each(examples)('examples/%s.json', (_file, workflow) => {
	const appwriteNodes = workflow.nodes.filter((candidate) => candidate.type === nodeType);

	it('uses this package’s node', () => {
		expect(workflow.name).toMatch(/\S/);
		expect(appwriteNodes.length).toBeGreaterThan(0);
		for (const candidate of appwriteNodes) {
			expect(candidate.typeVersion).toBe(description.version);
		}
	});

	it.each(appwriteNodes.map((candidate) => [candidate.name, candidate] as const))(
		'%s only sets parameters its operation shows',
		(_name, candidate) => {
			const parameters = candidate.parameters as INodeParameters;
			const resolved = resolveParameters(parameters);
			for (const name of Object.keys(parameters)) {
				const shown = description.properties.some(
					(property) =>
						property.name === name &&
						NodeHelpers.displayParameter(resolved, property, testNode, description),
				);
				expect(shown, `${candidate.name}: parameter "${name}"`).toBe(true);
			}
		},
	);

	it.each(appwriteNodes.map((candidate) => [candidate.name, candidate] as const))(
		'%s runs',
		async (_name, candidate) => {
			const { context, requests } = createExecuteContext({
				parameters: candidate.parameters as INodeParameters,
				respond: universalResponse,
				binary: BINARY,
			});
			const [output] = await node.execute.call(context);
			expect(output.length).toBeGreaterThan(0);
			expect(requests.length).toBeGreaterThan(0);
		},
	);
});
