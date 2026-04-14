import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '@/app/api/_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('customer')) args.customer = sp.get('customer')!;
    if (sp.get('status')) args.status = sp.get('status')!;
    const result = await callFrappeMethod('get_proforma_invoices', args, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load proformas');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('create_proforma_invoice', { data: JSON.stringify(body) }, request);
    return NextResponse.json(result);
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create proforma');
  }
}
