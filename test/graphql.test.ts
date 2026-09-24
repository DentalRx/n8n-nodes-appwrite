import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

const QUERY = 'query ($id: String!) { usersGet(userId: $id) { _id name } }';

async function run(parameters: INodeParameters, response: IDataObject = { data: {} }) {
	const { context, requests } = createExecuteContext({
		parameters: {
			resource: 'graphql',
			operation: 'executeQuery',
			graphqlQuery: QUERY,
			...parameters,
		},
		respond: () => response,
	});
	const [output] = await node.execute.call(context);
	return { output, requests };
}

describe('GraphQL', () => {
	it('sends the request the way the Appwrite SDKs do', async () => {
		const { requests } = await run({});

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/graphql`);
		expect(requests[0].headers).toMatchObject({ 'x-sdk-graphql': 'true' });
		expect(requests[0].body).toEqual({ query: { query: QUERY } });
	});

	it('sends mutations to the mutation endpoint', async () => {
		const { requests } = await run({ operation: 'executeMutation' });
		expect(requests[0].url).toBe(`${BASE_URL}/graphql/mutation`);
	});

	it('parses variables typed as JSON and passes the operation name', async () => {
		const { requests } = await run({
			options: { variables: '{"id": "u1"}', operationName: 'GetUser' },
		});
		expect(requests[0].body).toEqual({
			query: { query: QUERY, variables: { id: 'u1' }, operationName: 'GetUser' },
		});
	});

	it('accepts variables an expression resolved to an object', async () => {
		const { requests } = await run({ options: { variables: { id: 'u2', limit: 5 } } });
		expect((requests[0].body as IDataObject).query).toEqual({
			query: QUERY,
			variables: { id: 'u2', limit: 5 },
		});
	});

	it('leaves out empty variables', async () => {
		const { requests } = await run({ options: { variables: '{}' } });
		expect(requests[0].body).toEqual({ query: { query: QUERY } });
	});

	it.each([
		['invalid JSON', '{"id": '],
		['a JSON array', '["u1"]'],
	])('stops before sending when the variables are %s', async (_label, variables) => {
		const { context, requests } = createExecuteContext({
			parameters: {
				resource: 'graphql',
				operation: 'executeQuery',
				graphqlQuery: QUERY,
				options: { variables },
			},
		});

		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		expect(requests).toHaveLength(0);
	});

	it('outputs the GraphQL response as one item', async () => {
		const { output } = await run({}, { data: { usersGet: { _id: 'u1', name: 'Ada' } } });
		expect(output).toEqual([
			{ json: { data: { usersGet: { _id: 'u1', name: 'Ada' } } }, pairedItem: { item: 0 } },
		]);
	});

	it('fails the item when the response reports GraphQL errors', async () => {
		const { context } = createExecuteContext({
			parameters: { resource: 'graphql', operation: 'executeQuery', graphqlQuery: QUERY },
			respond: () => ({
				data: null,
				errors: [
					{ message: 'User with the requested ID could not be found.' },
					{ message: 'Second issue' },
				],
			}),
		});

		const failure = await node.execute.call(context).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(NodeApiError);
		expect((failure as NodeApiError).message).toBe(
			'User with the requested ID could not be found.',
		);
		expect((failure as NodeApiError).description).toContain('Second issue');
	});
});
