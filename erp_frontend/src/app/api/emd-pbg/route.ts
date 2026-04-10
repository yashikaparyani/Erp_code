export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tender = searchParams.get('tender');
    const type = searchParams.get('type'); // EMD or PBG
    const result = await callFrappeMethod('get_emd_pbg_instruments', {
      tender: tender || '',
      instrument_type: type || '',
    }, request);
    
    return NextResponse.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('Error fetching EMD/PBG instruments:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch instruments', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.instrument_type) {
      return NextResponse.json(
        { success: false, message: 'Instrument type is required' },
        { status: 400 }
      );
    }
    
    const payload = {
      instrument_type: body.instrument_type, // EMD or PBG
      linked_tender: body.linked_tender,
      amount: body.amount || 0,
      instrument_number: body.instrument_number,
      bank_name: body.bank_name,
      issue_date: body.issue_date,
      expiry_date: body.expiry_date,
      status: body.status || 'Pending',
      refund_status: body.refund_status,
      refund_date: body.refund_date,
      refund_reference: body.refund_reference,
      refund_remarks: body.refund_remarks,
      remarks: body.remarks,
    };
    const result = await callFrappeMethod('create_emd_pbg_instrument', {
      data: JSON.stringify(payload),
    }, request);
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Instrument created successfully'
    });
  } catch (error) {
    console.error('Error creating instrument:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create instrument' },
      { status: 500 }
    );
  }
}
