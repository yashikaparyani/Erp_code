export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project') || '';
    const site = searchParams.get('site') || '';

    if (!project && !site) {
      return NextResponse.json(
        { success: false, message: 'project or site is required' },
        { status: 400 },
      );
    }

    const result = project
      ? await callFrappeMethod('get_project_dossier', { project }, request)
      : await callFrappeMethod('get_site_dossier', { site }, request);

    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to load dossier' },
      { status: 500 },
    );
  }
}
