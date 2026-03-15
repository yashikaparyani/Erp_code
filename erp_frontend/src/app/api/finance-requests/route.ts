import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const instrument_type = searchParams.get('instrument_type') || '';
    const tender = searchParams.get('tender') || '';
    const result = await callFrappeMethod('get_finance_requests', {
      status, instrument_type, tender,
    }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching finance requests:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch finance requests', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_emd_pbg_instrument', {
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error creating finance request:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create finance request' },
      { status: 500 }
    );
  }
}
