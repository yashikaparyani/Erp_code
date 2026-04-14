export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, callFrappeResourceJson } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const active = request.nextUrl.searchParams.get('active');
    const result = await callFrappeMethod('get_organizations', {
      active: active || undefined,
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

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.name) {
      return NextResponse.json(
        { success: false, message: 'Organization name is required' },
        { status: 400 },
      );
    }

    const { name, ...updates } = data;
    const result = await callFrappeResourceJson(
      `/api/resource/GE Organization/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        body: updates,
      },
      request,
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Organization updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update organization' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name') || '';
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Organization name is required' },
        { status: 400 },
      );
    }

    await callFrappeResourceJson(
      `/api/resource/GE Organization/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
      request,
    );

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete organization' },
      { status: 500 },
    );
  }
}
