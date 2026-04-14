export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const name = decodeURIComponent(params.id || '');
    const result = await callFrappeMethod('get_project_document', { name }, request);
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to load document' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const name = decodeURIComponent(params.id || '');
    const body = await request.json();
    const action = String(body?.action || '').trim();

    if (action === 'status') {
      const result = await callFrappeMethod(
        'update_document_status',
        { name, status: body?.status || '', reason: body?.reason || '' },
        request,
      );
      return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Document status updated' });
    }

    return NextResponse.json(
      { success: false, message: `Unsupported document action: ${action || 'unknown'}` },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update document' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const name = decodeURIComponent(params.id || '');
    const result = await callFrappeMethod('delete_project_document', { name }, request);
    return NextResponse.json({ success: true, data: result.data || result, message: result.message || 'Document deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 },
    );
  }
}
