import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, getFrappeAuthHeaders, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

function isAllowedFilePath(fileUrl: string) {
  return fileUrl.startsWith('/files/') || fileUrl.startsWith('/private/files/');
}

export async function GET(request: NextRequest) {
  try {
    const fileUrl = request.nextUrl.searchParams.get('url') || '';
    const filename = request.nextUrl.searchParams.get('filename') || 'attachment';

    if (!fileUrl || !isAllowedFilePath(fileUrl)) {
      return NextResponse.json(
        { success: false, message: 'A valid file URL is required' },
        { status: 400 },
      );
    }

    const response = await fetch(`${FRAPPE_URL}${fileUrl}`, {
      method: 'GET',
      headers: await getFrappeAuthHeaders(request, false),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to download file (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition')
      || `attachment; filename="${filename.replace(/"/g, '')}"`;

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to download file');
  }
}
