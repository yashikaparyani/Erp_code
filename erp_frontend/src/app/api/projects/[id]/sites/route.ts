import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/projects/[id]/sites
 * Body: { initial_sites: { site_name: string; site_code: string }[] }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await callFrappeMethod('add_project_sites', {
      project: decodeURIComponent(id),
      data: body,
    }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Sites added' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to add sites' },
      { status: 500 },
    );
  }
}
