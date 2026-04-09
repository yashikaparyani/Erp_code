import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, getFrappeAuthHeaders, jsonErrorResponse } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeaders = await getFrappeAuthHeaders(request, false);
    const response = await fetch(
      `${FRAPPE_URL}/api/method/gov_erp.api.download_site_bulk_upload_template`,
      {
        method: 'GET',
        headers: { ...authHeaders },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => 'Template download failed');
      return NextResponse.json({ success: false, message: text }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || 'attachment; filename="template.xlsx"';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': String(body.byteLength),
      },
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Template download failed');
  }
}
