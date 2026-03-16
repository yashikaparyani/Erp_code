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

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_tender_result', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender result created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create tender result' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, ...rest } = data;
    const result = await callFrappeMethod('update_tender_result', { name, data: JSON.stringify(rest) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Tender result updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update tender result' },
      { status: 500 }
    );
  }
}
