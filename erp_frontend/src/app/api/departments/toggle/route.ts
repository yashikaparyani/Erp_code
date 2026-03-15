import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, message: 'Department name is required' }, { status: 400 });
    }
    const result = await callFrappeMethod('toggle_department', { name: body.name }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error toggling department:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to toggle department' },
      { status: 500 }
    );
  }
}
