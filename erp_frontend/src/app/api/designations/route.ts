export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_designations', {}, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching designations:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch designations', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.designation_name) {
      return NextResponse.json({ success: false, message: 'Designation name is required' }, { status: 400 });
    }
    const result = await callFrappeMethod('create_designation', {
      data: JSON.stringify(body),
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error creating designation:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create designation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.new_name) {
      return NextResponse.json({ success: false, message: 'name and new_name are required' }, { status: 400 });
    }
    const result = await callFrappeMethod('rename_designation', {
      name: body.name,
      new_name: body.new_name,
    }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to rename designation' },
      { status: 500 }
    );
  }
}
