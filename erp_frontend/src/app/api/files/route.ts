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

    let upstream: Response | null = null;

    const tryFetch = async (candidateUrl?: string | null) => {
      const value = (candidateUrl || '').trim();
      if (!value) return null;
      try {
        return await fetchFrappeResource(value, request);
      } catch {
        return null;
      }
    };

    const basename = (() => {
      const pathOnly = fileUrl.split('?', 1)[0];
      const parts = pathOnly.split('/').filter(Boolean);
      return parts.length ? decodeURIComponent(parts[parts.length - 1]) : '';
    })();
    try {
      upstream = await fetchFrappeResource(fileUrl, request);
    } catch (upstreamErr) {
      // Fallback: sometimes stored links are stale/mixed (public/private path mismatch,
      // mixed case, or File docname references). Try deterministic recovery paths.
      const lowerFileUrl = fileUrl.toLowerCase();
      const looksLikeProxyPath =
        fileUrl.startsWith('/') || /^https?:\/\//i.test(fileUrl) || fileUrl.startsWith('files/');

      // Normalize file paths: convert uppercase /Files/ to /files/ for consistency
      let normalizedFileUrl = fileUrl;
      if (lowerFileUrl.startsWith('/files/')) {
        normalizedFileUrl = '/files/' + fileUrl.substring(7); // Preserve original case of filename
      } else if (lowerFileUrl.startsWith('/private/files/')) {
        normalizedFileUrl = '/private/files/' + fileUrl.substring(15);
      }

      // Try normalized path first
      if (normalizedFileUrl !== fileUrl) {
        upstream = await tryFetch(normalizedFileUrl);
      }

      // If path is public/private, try the opposite path with the same filename.
      if (!upstream && basename) {
        if (lowerFileUrl.startsWith('/files/')) {
          upstream = await tryFetch(`/private/files/${basename}`);
        } else if (lowerFileUrl.startsWith('/private/files/')) {
          upstream = await tryFetch(`/files/${basename}`);
        }
      }

      if (!upstream) {
        const hasSidCookie = Boolean(request.cookies.get('sid')?.value);
        if (!looksLikeProxyPath) {
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
          // Resolve stale URL from File doctype (exact URL match first, then file name).
          const byUrl = await callFrappeMethod<{ file_url?: string }>(
            'frappe.client.get_value',
            {
              doctype: 'File',
              filters: { file_url: normalizedFileUrl },
              fieldname: 'file_url',
            },
            hasSidCookie ? request : undefined,
          );

          const urlFromRecord = byUrl?.file_url;
          if (urlFromRecord) {
            upstream = await tryFetch(urlFromRecord);
          }

          if (!upstream && basename) {
            const byNameList = await callFrappeMethod<Array<{ file_url?: string }>>(
              'frappe.client.get_list',
              {
                doctype: 'File',
                filters: { file_name: basename },
                fields: ['file_url'],
                order_by: 'modified desc',
                limit_page_length: 8,
              },
              hasSidCookie ? request : undefined,
            );

            if (Array.isArray(byNameList)) {
              for (const row of byNameList) {
                const candidateUrl = row?.file_url;
                if (!candidateUrl) continue;
                upstream = await tryFetch(candidateUrl);
                if (upstream) break;
              }
            }
          }

          if (!upstream) {
            throw new Error(
              `File link exists but storage object is missing or moved: ${fileUrl}. Re-upload the document from UI to refresh the file_url.`
            );
          }
        }
      }
    }

    if (!upstream) {
      throw new Error('Failed to load file from upstream');
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
