import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callPresalesMethod('get_presales_color_config', {}, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch color config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callPresalesMethod('update_presales_color_config', {
      slot: body.slot,
      color: body.color,
      label: body.label,
      description: body.description || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update color config' },
      { status: 500 }
    );
  }
}
