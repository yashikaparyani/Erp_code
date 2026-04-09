import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, getFrappeAuthHeaders, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

/** Methods that return binary file responses (XLSX, CSV, etc.) */
const DOWNLOAD_METHODS = new Set([
  'download_site_bulk_upload_template',
]);

export async function GET(request: NextRequest) {
  try {
    const method = request.nextUrl.searchParams.get('method')?.trim() || '';

    if (!method) {
      return NextResponse.json({ success: false, message: 'method query param is required' }, { status: 400 });
    }

    if (!DOWNLOAD_METHODS.has(method)) {
      return NextResponse.json(
        { success: false, message: `Method not allowed for download: ${method}` },
        { status: 400 },
      );
    }

    const qualifiedMethod = `gov_erp.api.${method}`;
    const authHeaders = await getFrappeAuthHeaders(request, false);

    const response = await fetch(`${FRAPPE_URL}/api/method/${qualifiedMethod}`, {
      method: 'GET',
      headers: { ...authHeaders },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Download failed');
      return NextResponse.json({ success: false, message: text }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition || 'attachment; filename="template.xlsx"',
        'Content-Length': String(body.byteLength),
      },
    });
  } catch (error: any) {
    return jsonErrorResponse(error, 'Template download failed');
  }
}
