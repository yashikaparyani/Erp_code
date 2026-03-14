import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_tender_results', {
      tender: searchParams.get('tender') || '',
      result_stage: searchParams.get('result_stage') || '',
      is_fresh: searchParams.get('is_fresh') || '',
    }, request);

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch tender results', data: [] },
      { status: 500 }
    );
  }
}
