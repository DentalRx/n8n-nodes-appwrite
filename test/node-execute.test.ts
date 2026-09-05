import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node, testNode } from './helpers/mock-context';

describe('Appwrite.execute', () => {
	it('runs the selected operation once per input item and pairs the output', async () => {
		const { context, requests } = createExecuteContext({
			parameters: { resource: 'database', operation: 'get', databaseId: 'main' },
			items: [{ json: { a: 1 } }, { json: { a: 2 } }],
			respond: () => ({ $id: 'main', name: 'Main' }),
		});

		const [output] = await node.execute.call(context);

		expect(requests.map((request) => request.url)).toEqual([
			`${BASE_URL}/tablesdb/main`,
			`${BASE_URL}/tablesdb/main`,
		]);
		expect(output).toEqual([
			{ json: { $id: 'main', name: 'Main' }, pairedItem: { item: 0 } },
			{ json: { $id: 'main', name: 'Main' }, pairedItem: { item: 1 } },
		]);
	});

	it('propagates failures when Continue On Fail is off', async () => {
		const { context } = createExecuteContext({
			parameters: { resource: 'database', operation: 'get', databaseId: 'main' },
			respond: () => {
				throw new NodeApiError(testNode, { message: 'Database not found', code: 404 });
			},
		});

		await expect(node.execute.call(context)).rejects.toThrow(NodeApiError);
	});

	it('emits an error item carrying the Appwrite message when Continue On Fail is on', async () => {
		const { context } = createExecuteContext({
			parameters: { resource: 'database', operation: 'get', databaseId: 'main' },
			items: [{ json: {} }, { json: {} }],
			continueOnFail: true,
			respond: (_request, index) => {
				if (index === 0) {
					throw new NodeApiError(
						testNode,
						{ message: 'Database not found', code: 404, type: 'database_not_found' },
						{ httpCode: '404', description: 'Database not found' },
					);
				}
				return { $id: 'main' };
			},
		});

		const [output] = await node.execute.call(context);

		expect(output).toHaveLength(2);
		expect(output[0].pairedItem).toEqual({ item: 0 });
		expect(output[0].json.error).toEqual(expect.any(String));
		expect(output[0].json.description).toBe('Database not found');
		expect(output[0].json.httpCode).toBe('404');
		expect(output[1]).toEqual({ json: { $id: 'main' }, pairedItem: { item: 1 } });
	});

	it('flattens Get Many results into one item per record', async () => {
		const { context } = createExecuteContext({
			parameters: { resource: 'database', operation: 'getMany', limit: 2 },
			respond: () => ({ total: 2, databases: [{ $id: 'a' }, { $id: 'b' }] }),
		});

		const [output] = await node.execute.call(context);
		expect(output.map((item) => item.json)).toEqual([{ $id: 'a' }, { $id: 'b' }]);
	});
});
