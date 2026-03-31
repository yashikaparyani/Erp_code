import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await callFrappeMethod('get_project', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch project' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await callFrappeMethod(
      'update_project',
      { name: decodeURIComponent(id), data: JSON.stringify(body) },
      request,
    );
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Project updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await callFrappeMethod('delete_project', { name: decodeURIComponent(id) }, request);
    return NextResponse.json({ success: true, message: result.message || 'Project deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete project' },
      { status: 500 },
    );
  }
}
