import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project') || '';
    const days = searchParams.get('days') || '30';
    const result = await callFrappeMethod('get_expiring_documents', { project, days }, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch expiring documents', data: [] },
      { status: 500 }
    );
  }
}
