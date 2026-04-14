import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const result = await callFrappeMethod('get_penalty_deduction', { name }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch penalty' },
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
      'update_penalty_deduction',
      { name: decodeURIComponent(id), data: JSON.stringify(body) },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Penalty updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update penalty' },
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
    const result = await callFrappeMethod('delete_penalty_deduction', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Penalty deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete penalty' },
      { status: 500 },
    );
  }
}
