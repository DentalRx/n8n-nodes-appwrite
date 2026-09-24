import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPagesByOffset,
	getStringParameter,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

/** The activity-event fields most workflows read, for the Simplify toggle: who did what, when. */
const SIMPLIFY_FIELDS = [
	'$id',
	'event',
	'time',
	'actorType',
	'actorId',
	'actorName',
	'actorEmail',
	'resourceType',
	'resourceId',
	'ip',
];

export async function executeActivityOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const simplified = (data: IDataObject | IDataObject[]) =>
		(this.getNodeParameter('simplify', i, false) as boolean)
			? simplifyItems(data, SIMPLIFY_FIELDS)
			: data;

	if (operation === 'getEvent') {
		const eventId = getStringParameter.call(this, 'eventId', i);
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`/activities/events/${encodeURIComponent(eventId)}`,
			{},
			i,
		);
		return toItems(simplified(response), i);
	}

	if (operation === 'getManyEvents') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			// Activity events are audit log entries, so they are paged by offset
			// like Appwrite's other audit logs: every Appwrite list endpoint accepts
			// an offset, while cursors over the audit store are not documented.
			const events = await fetchAllPagesByOffset.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(
						this,
						'GET',
						'/activities/events',
						{ qs: { queries: pageQueries } },
						i,
					),
				'events',
				i,
			);
			return toItems(simplified(events as IDataObject[]), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			'/activities/events',
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(simplified(response.events as IDataObject[]), i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown activity operation "${operation}"`, {
		itemIndex: i,
	});
}
