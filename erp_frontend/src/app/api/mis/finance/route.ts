import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tender = searchParams.get('tender') || '';
    const status = searchParams.get('status') || '';
    const instrument_type = searchParams.get('instrument_type') || '';
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';
    const result = await callFrappeMethod('get_finance_mis', {
      tender, status, instrument_type, from_date, to_date,
    }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching finance MIS:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch finance MIS', data: [] },
      { status: 500 }
    );
  }
}
