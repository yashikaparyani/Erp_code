export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, callRawFrappeMethod } from '../../_lib/frappe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const result = await callRawFrappeMethod(
      `frappe.client.get?doctype=GE%20EMD%20PBG%20Instrument&name=${encodeURIComponent(name)}`,
      request,
      'GET',
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch instrument' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await callFrappeMethod(
      'update_emd_pbg_instrument',
      {
        name: decodeURIComponent(id),
        data: JSON.stringify(body || {}),
      },
      request,
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update instrument' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await callFrappeMethod(
      'delete_emd_pbg_instrument',
      {
        name: decodeURIComponent(id),
      },
      request,
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete instrument' },
      { status: 500 },
    );
  }
}
