import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { BASE_URL, createExecuteContext, node } from './helpers/mock-context';

const embedding = (error = ''): IDataObject => ({
	model: 'nomic-embed-text',
	dimension: 3,
	embedding: error === '' ? [0.1, 0.2, 0.3] : [],
	error,
});

function context(parameters: INodeParameters, embeddings: IDataObject[] = [embedding()]) {
	return createExecuteContext({
		parameters: { resource: 'embedding', operation: 'createTextEmbeddings', ...parameters },
		respond: () => ({ total: embeddings.length, embeddings }),
	});
}

describe('Embedding', () => {
	it('embeds a text as-is, without splitting it on commas', async () => {
		const { context: ctx, requests } = context({
			embeddingText: 'Red, green, and ["blue"]',
			options: { embeddingModel: 'all-minilm' },
		});

		const [output] = await node.execute.call(ctx);

		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe(`${BASE_URL}/embeddings/text`);
		expect(requests[0].body).toEqual({ texts: ['Red, green, and ["blue"]'], model: 'all-minilm' });
		expect(output).toEqual([{ json: embedding(), pairedItem: { item: 0 } }]);
	});

	it('embeds an array from an expression in one request, one item per text', async () => {
		const { context: ctx, requests } = context({ embeddingText: ['first', 'second'] }, [
			embedding(),
			embedding(),
		]);

		const [output] = await node.execute.call(ctx);

		expect(requests).toHaveLength(1);
		expect(requests[0].body).toEqual({ texts: ['first', 'second'] });
		expect(output).toHaveLength(2);
	});

	it('keeps a batch whose texts only partly failed', async () => {
		const { context: ctx } = context({ embeddingText: ['a', 'b'] }, [
			embedding(),
			embedding('Error while generating embedding'),
		]);

		const [output] = await node.execute.call(ctx);
		expect(output.map((item) => item.json.error)).toEqual(['', 'Error while generating embedding']);
	});

	it('fails the item when no text could be embedded', async () => {
		const { context: ctx } = context({ embeddingText: 'hello' }, [
			embedding('Error while generating embedding'),
		]);

		const failure = await node.execute.call(ctx).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(NodeOperationError);
		expect((failure as NodeOperationError).description).toContain(
			'Error while generating embedding',
		);
	});
});
