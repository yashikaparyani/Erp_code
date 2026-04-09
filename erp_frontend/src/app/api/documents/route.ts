export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || '';
    const project = searchParams.get('project') || '';
    const site = searchParams.get('site') || '';
    const category = searchParams.get('category') || '';
    const latestOnly = searchParams.get('latest_only') || '';
    const source = searchParams.get('source') || '';
    const stage = searchParams.get('stage') || '';
    const reference_doctype = searchParams.get('reference_doctype') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const useCustom = source === 'custom' || Boolean(project) || Boolean(category) || Boolean(site) || Boolean(latestOnly) || Boolean(stage) || Boolean(reference_doctype) || Boolean(subcategory);
    let result;
    if (useCustom) {
      result = await callFrappeMethod(
        'get_project_documents',
        { folder, project, site, category, latest_only: latestOnly, stage, reference_doctype, subcategory },
        request,
      );
    } else {
      result = await callFrappeMethod('get_documents', { folder }, request);
    }
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch documents', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await callFrappeMethod('upload_project_document', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Document uploaded' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}
