export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const name = decodeURIComponent(params.id);
    const result = await callFrappeMethod('get_statutory_ledger', { name }, request);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load statutory ledger');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const name = decodeURIComponent(params.id);
    const body = await request.json();
    const result = await callFrappeMethod(
      'update_statutory_ledger',
      { name, data: JSON.stringify(body) },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Statutory ledger updated' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to update statutory ledger');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const name = decodeURIComponent(params.id);
    const result = await callFrappeMethod('delete_statutory_ledger', { name }, request);
    return NextResponse.json({ success: true, data: result.data || null, message: result.message || 'Statutory ledger deleted' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to delete statutory ledger');
  }
}
