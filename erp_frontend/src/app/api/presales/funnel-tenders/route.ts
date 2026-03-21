import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, any> = {};
    const params = [
      'funnel_color','user_color_slot','search','assignee','client','organization',
      'status','go_no_go','technical','bid_status','emd_status',
      'enquiry_pending','pu_nzd',
      'submission_date_from','submission_date_to',
      'bid_opening_from','bid_opening_to',
      'pre_bid_meeting_from','pre_bid_meeting_to',
      'corrigendum_date_from','corrigendum_date_to',
      'created_from','created_to',
      'overdue_only','due_this_week','due_this_month',
      'value_min','value_max','emd_min','emd_max',
      'pbg_percent_min','pbg_percent_max',
      'sort_by','sort_dir','page','limit',
    ];
    for (const p of params) {
      const v = sp.get(p);
      if (v !== null) args[p] = v;
    }
    const result = await callPresalesMethod('get_funnel_tenders', args, request);
    return NextResponse.json({ success: true, data: result.data, total: result.total, page: result.page, limit: result.limit });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch tenders', data: [] },
      { status: 500 }
    );
  }
}
