import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);

    const [
      tender,
      results,
      reminders,
      surveys,
      boqs,
      costSheets,
      financeRequests,
      checklistTemplates,
      approvals,
    ] = await Promise.all([
      callFrappeMethod('get_tender', { name: tenderName }, request),
      callFrappeMethod('get_tender_results', { tender: tenderName }, request),
      callFrappeMethod('get_tender_reminders', { tender: tenderName }, request),
      callFrappeMethod('get_surveys', { tender: tenderName }, request),
      callFrappeMethod('get_boqs', { tender: tenderName }, request),
      callFrappeMethod('get_cost_sheets', { tender: tenderName }, request),
      callFrappeMethod('get_finance_requests', { tender: tenderName }, request),
      callFrappeMethod('get_tender_checklists', {}, request),
      callFrappeMethod('get_tender_approvals', { tender: tenderName }, request),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tender: tender.data || null,
        results: results.data || [],
        reminders: reminders.data || [],
        surveys: surveys.data || [],
        boqs: boqs.data || [],
        costSheets: costSheets.data || [],
        financeRequests: financeRequests.data || [],
        checklistTemplates: checklistTemplates.data || [],
        approvals: approvals.data || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load tender workspace',
      },
      { status: 500 },
    );
  }
}
