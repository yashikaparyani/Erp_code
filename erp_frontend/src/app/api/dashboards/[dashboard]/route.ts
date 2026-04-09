export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(
	request: NextRequest,
	{ params }: { params: { dashboard: string } },
) {
	try {
		if (!params.dashboard) {
			return NextResponse.json({ success: false, message: 'Dashboard route not found', data: {} }, { status: 404 });
		}

		const searchParams = new URL(request.url).searchParams;
		const args: Record<string, string> = {};
		searchParams.forEach((value, key) => {
			args[key] = value;
		});

		let result;
		switch (params.dashboard) {
			case 'om':
				result = await callFrappeMethod('get_om_dashboard', args, request);
				break;
			case 'accounts':
				result = await callFrappeMethod('get_accounts_dashboard', args, request);
				break;
			case 'presales':
				result = await callFrappeMethod('get_presales_dashboard', args, request);
				break;
			case 'engineering-head':
				result = await callFrappeMethod('get_engineering_head_dashboard', args, request);
				break;
			case 'execution':
				result = await callFrappeMethod('get_execution_dashboard', args, request);
				break;
			case 'project-head':
				result = await callFrappeMethod('get_project_head_dashboard', args, request);
				break;
			case 'project-manager':
				result = await callFrappeMethod('get_project_manager_dashboard', args, request);
				break;
			case 'procurement':
				result = await callFrappeMethod('get_procurement_dashboard', args, request);
				break;
			case 'stores':
				result = await callFrappeMethod('get_stores_dashboard', args, request);
				break;
			case 'executive':
				result = await callFrappeMethod('get_executive_dashboard', args, request);
				break;
			case 'director':
				result = await callFrappeMethod('get_director_dashboard', args, request);
				break;
			default:
				return NextResponse.json({ success: false, message: 'Dashboard route not found', data: {} }, { status: 404 });
		}

		return NextResponse.json({ success: true, data: result.data || {} });
	} catch (error) {
		console.error(`Error fetching ${params.dashboard} dashboard:`, error);
		return NextResponse.json(
			{ success: false, message: error instanceof Error ? error.message : 'Failed to fetch dashboard', data: {} },
			{ status: 500 },
		);
	}
}
