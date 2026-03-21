import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../../_lib/frappe';

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
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to build employee mapping preview',
      },
      { status: 500 },
    );
  }
}
