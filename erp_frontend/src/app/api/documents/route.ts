import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || '';
    const project = searchParams.get('project') || '';
    const category = searchParams.get('category') || '';
    const source = searchParams.get('source') || '';
    const useCustom = source === 'custom' || Boolean(project) || Boolean(category);
    const result = await callFrappeMethod(
      useCustom ? 'get_project_documents' : 'get_documents',
      useCustom ? { folder, project, category } : { folder },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch documents', data: [] },
      { status: 500 }
    );
  }
}
