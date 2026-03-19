import { NextRequest, NextResponse } from 'next/server';
import { callRbacMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pack_key = searchParams.get('pack_key') || undefined;
    const include_items = searchParams.get('include_items') ?? '1';

    const result = await callRbacMethod('get_permission_packs', {
      pack_key,
      include_items,
    }, request);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch packs' },
      { status: 500 },
    );
  }
}
