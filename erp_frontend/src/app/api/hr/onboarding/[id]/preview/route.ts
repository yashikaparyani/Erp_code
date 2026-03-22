import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod(
      'preview_onboarding_employee_mapping',
      { name: decodeURIComponent(id) },
      request,
    );
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to build employee mapping preview');
  }
}
