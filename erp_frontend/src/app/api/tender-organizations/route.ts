export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const tender = request.nextUrl.searchParams.get('tender') || '';
    const result = await callFrappeMethod('get_tender_organizations', { tender }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch tender organizations', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_tender_organization', {
      data: JSON.stringify(data),
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Organization linked to tender' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to link organization' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name') || '';
    if (!name) {
      return NextResponse.json({ success: false, message: 'name is required' }, { status: 400 });
    }
    const result = await callFrappeMethod('delete_tender_organization', { name }, request);
    return NextResponse.json({ success: true, message: result.message || 'Organization removed from tender' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to remove organization' },
      { status: 500 },
    );
  }
}
