import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_po_from_comparison', { name: body.name || body.comparison_name || '' }, request);
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Purchase order created from comparison',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create purchase order from comparison',
      },
      { status: 500 },
    );
  }
}