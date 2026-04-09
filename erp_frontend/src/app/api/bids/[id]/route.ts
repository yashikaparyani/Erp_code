export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await callPresalesMethod('get_bid', { name: params.id }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch bid' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const result = await callPresalesMethod('update_bid', { name: params.id, data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update bid' },
      { status: 500 }
    );
  }
}
