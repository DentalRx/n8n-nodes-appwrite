import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { toItems } from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

export async function executeEmbeddingOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'createTextEmbeddings') {
		// One text per item is the usual case; an expression returning an array
		// embeds a batch in one request. A string is never split, since commas
		// and brackets are ordinary content in text to embed.
		const raw = this.getNodeParameter('embeddingText', i) as unknown;
		const texts = Array.isArray(raw) ? raw.map((text) => String(text)) : [String(raw ?? '')];
		const options = this.getNodeParameter('options', i, {}) as { embeddingModel?: string };

		const response = await appwriteApiRequest.call(
			this,
			'POST',
			'/embeddings/text',
			{ body: { texts, model: options.embeddingModel } },
			i,
		);
		const embeddings = (response.embeddings ?? []) as IDataObject[];

		// Appwrite reports a failed text in-band, as an entry with an empty
		// vector and an `error`, so that one bad text does not sink a batch.
		// When nothing was embedded, stop the item instead of passing empty
		// vectors downstream.
		const failed = embeddings.filter((entry) => typeof entry.error === 'string' && entry.error);
		if (embeddings.length > 0 && failed.length === embeddings.length) {
			throw new NodeOperationError(this.getNode(), 'Appwrite could not embed the text', {
				description: `Appwrite answered: ${String(failed[0].error)}. On a self-hosted instance, check that the embeddings service is running (the "embedding" Docker Compose profile).`,
				itemIndex: i,
			});
		}

		return toItems(embeddings, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown embedding operation "${operation}"`, {
		itemIndex: i,
	});
}
