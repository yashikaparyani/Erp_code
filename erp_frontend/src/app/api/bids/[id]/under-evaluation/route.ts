import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../../_lib/frappe';
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await callPresalesMethod('mark_bid_under_evaluation', { name: params.id }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
