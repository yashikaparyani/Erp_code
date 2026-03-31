import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, fetchFrappeResource, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = (searchParams.get('url') || '').trim();
    const download = searchParams.get('download') === '1';

    if (!fileUrl) {
      return NextResponse.json({ success: false, message: 'url is required' }, { status: 400 });
    }

    let upstream: Response;
    try {
      upstream = await fetchFrappeResource(fileUrl, request);
    } catch (upstreamErr) {
      // Fallback: sometimes Attach fields or backend payloads return a `File` docname
      // instead of the actual `/files/...` url. If so, resolve it and try again.
      const looksLikeProxyPath =
        fileUrl.startsWith('/') || /^https?:\/\//i.test(fileUrl) || fileUrl.startsWith('files/');

      if (!looksLikeProxyPath) {
        const hasSidCookie = Boolean(request.cookies.get('sid')?.value);
        const resolved = await callFrappeMethod<{ file_url?: string }>(
          'frappe.client.get_value',
          {
            doctype: 'File',
            filters: { name: fileUrl },
            fieldname: 'file_url',
          },
          hasSidCookie ? request : undefined,
        );

        const resolvedFileUrl = resolved?.file_url;
        if (resolvedFileUrl) {
          upstream = await fetchFrappeResource(resolvedFileUrl, request);
        } else {
          throw upstreamErr;
        }
      } else {
        throw upstreamErr;
      }
    }
    const headers = new Headers();
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');
    const upstreamDisposition = upstream.headers.get('content-disposition');

    headers.set('content-type', contentType);
    if (contentLength) headers.set('content-length', contentLength);
    if (upstreamDisposition && !download) {
      headers.set('content-disposition', upstreamDisposition.replace(/^attachment/i, 'inline'));
    } else if (upstreamDisposition) {
      headers.set('content-disposition', upstreamDisposition);
    } else if (download) {
      headers.set('content-disposition', 'attachment');
    } else {
      headers.set('content-disposition', 'inline');
    }
    headers.set('cache-control', 'private, no-store, max-age=0');

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load file');
  }
}
