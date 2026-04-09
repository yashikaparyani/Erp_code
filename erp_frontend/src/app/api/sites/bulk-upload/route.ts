import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sites/bulk-upload
 * Body: { file_url, dry_run, default_project?, default_tender? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callFrappeMethod('bulk_upload_sites', {
      file_url: body.file_url,
      dry_run: body.dry_run ?? 1,
      default_project: body.default_project || undefined,
      default_tender: body.default_tender || undefined,
    }, request);
    return NextResponse.json({ success: true, data: result.data ?? result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Bulk upload failed' },
      { status: 500 },
    );
  }
}
