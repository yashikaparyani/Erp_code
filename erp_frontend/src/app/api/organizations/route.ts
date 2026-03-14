import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const active = request.nextUrl.searchParams.get('active');
    const result = await callFrappeMethod('get_organizations', {
      active: active || '',
    }, request);

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch organizations', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_organization', {
      data: JSON.stringify(data),
    }, request);

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Organization created successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create organization' },
      { status: 500 }
    );
  }
}
