import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

const dashboardMethods: Record<string, string> = {
	om: 'get_om_dashboard',
	accounts: 'get_accounts_dashboard',
	presales: 'get_presales_dashboard',
	'engineering-head': 'get_engineering_head_dashboard',
	execution: 'get_execution_dashboard',
	'project-head': 'get_project_head_dashboard',
	'project-manager': 'get_project_manager_dashboard',
	procurement: 'get_procurement_dashboard',
	stores: 'get_stores_dashboard',
	executive: 'get_executive_dashboard',
};

export async function GET(
	request: NextRequest,
	{ params }: { params: { dashboard: string } },
) {
	try {
		const method = dashboardMethods[params.dashboard];
		if (!method) {
			return NextResponse.json({ success: false, message: 'Dashboard route not found', data: {} }, { status: 404 });
		}

		const searchParams = new URL(request.url).searchParams;
		const args: Record<string, string> = {};
		searchParams.forEach((value, key) => {
			args[key] = value;
		});

		const result = await callFrappeMethod(method, args, request);
		return NextResponse.json({ success: true, data: result.data || {} });
	} catch (error) {
		console.error(`Error fetching ${params.dashboard} dashboard:`, error);
		return NextResponse.json(
			{ success: false, message: error instanceof Error ? error.message : 'Failed to fetch dashboard', data: {} },
			{ status: 500 },
		);
	}
}
