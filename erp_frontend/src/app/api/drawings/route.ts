<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('site')) args.site = sp.get('site')!;
    if (sp.get('status')) args.status = sp.get('status')!;
    if (sp.get('client_approval_status')) args.client_approval_status = sp.get('client_approval_status')!;
    const result = await callFrappeMethod('get_drawings', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch drawings', data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_drawing', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Drawing created' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed to create drawing' }, { status: 500 });
  }
}
=======
export { dynamic, GET, POST } from '../engineering/drawings/route';
>>>>>>> 41b381c (improved ui)
