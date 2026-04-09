export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await callFrappeMethod(
      'get_document_folders',
      {
        project: searchParams.get('project') || '',
        department: searchParams.get('department') || '',
        source: searchParams.get('source') || '',
      },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching document folders:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch folders', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('create_document_folder', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Folder created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create folder' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ...rest } = body;
    const result = await callFrappeMethod('update_document_folder', { name, data: JSON.stringify(rest) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Folder updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || '';
    const result = await callFrappeMethod('delete_document_folder', { name }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Folder deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
