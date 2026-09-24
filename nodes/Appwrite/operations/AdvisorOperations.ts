import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueries,
	fetchAllPages,
	getStringParameter,
	simplifyItems,
	toItems,
	withLimit,
} from '../GenericFunctions';
import { appwriteApiRequest } from '../transport';

/**
 * The report-model fields most workflows read, for the Simplify toggle. The
 * nested insights are left out: Get Many Insights lists them one per item.
 */
const REPORT_SIMPLIFY_FIELDS = [
	'$id',
	'title',
	'type',
	'targetType',
	'target',
	'categories',
	'summary',
	'analyzedAt',
	'appId',
	'$createdAt',
];

/** The insight-model fields most workflows read, for the Simplify toggle. */
const INSIGHT_SIMPLIFY_FIELDS = [
	'$id',
	'reportId',
	'type',
	'severity',
	'status',
	'title',
	'summary',
	'resourceType',
	'resourceId',
	'analyzedAt',
];

export async function executeAdvisorOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const reportPath = (): string =>
		`/reports/${encodeURIComponent(getStringParameter.call(this, 'reportId', i))}`;

	const simplified = (data: IDataObject | IDataObject[], fields: string[]) =>
		(this.getNodeParameter('simplify', i, false) as boolean) ? simplifyItems(data, fields) : data;

	/** Get Many for reports and a report's insights, which differ only in path and model. */
	const getMany = async (path: string, listKey: string, fields: string[]) => {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const queries = buildQueries.call(this, i);

		if (returnAll) {
			const list = await fetchAllPages.call(
				this,
				queries,
				async (pageQueries) =>
					await appwriteApiRequest.call(this, 'GET', path, { qs: { queries: pageQueries } }, i),
				listKey,
				i,
			);
			return toItems(simplified(list as IDataObject[], fields), i);
		}

		const limit = this.getNodeParameter('limit', i, 50) as number;
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			path,
			{ qs: { queries: withLimit(queries, limit) } },
			i,
		);
		return toItems(simplified(response[listKey] as IDataObject[], fields), i);
	};

	if (operation === 'deleteReport') {
		const reportId = getStringParameter.call(this, 'reportId', i);
		await appwriteApiRequest.call(
			this,
			'DELETE',
			`/reports/${encodeURIComponent(reportId)}`,
			{},
			i,
		);
		return toItems({ deleted: true, reportId }, i);
	}

	if (operation === 'getInsight') {
		const insightId = getStringParameter.call(this, 'insightId', i);
		const response = await appwriteApiRequest.call(
			this,
			'GET',
			`${reportPath()}/insights/${encodeURIComponent(insightId)}`,
			{},
			i,
		);
		return toItems(simplified(response, INSIGHT_SIMPLIFY_FIELDS), i);
	}

	if (operation === 'getManyInsights') {
		return await getMany(`${reportPath()}/insights`, 'insights', INSIGHT_SIMPLIFY_FIELDS);
	}

	if (operation === 'getManyReports') {
		return await getMany('/reports', 'reports', REPORT_SIMPLIFY_FIELDS);
	}

	if (operation === 'getReport') {
		const response = await appwriteApiRequest.call(this, 'GET', reportPath(), {}, i);
		return toItems(simplified(response, REPORT_SIMPLIFY_FIELDS), i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown Advisor operation "${operation}"`, {
		itemIndex: i,
	});
}
