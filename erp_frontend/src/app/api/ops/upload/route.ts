import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, uploadFrappeFile, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'dwg', 'dxf']);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Methods allowed to be called with file upload */
const UPLOAD_METHODS = new Set([
  'create_drawing',
  'create_project_document',
]);

function getExtension(filename: string): string {
  const cleaned = filename.split('?')[0].trim().toLowerCase();
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const method = formData.get('method')?.toString().trim() || '';
    const dataRaw = formData.get('data')?.toString() || '{}';
    const file = formData.get('file');

    if (!method) {
      return NextResponse.json({ success: false, message: 'method is required' }, { status: 400 });
    }

    if (!UPLOAD_METHODS.has(method)) {
      return NextResponse.json(
        { success: false, message: `Method not allowed for file upload: ${method}` },
        { status: 400 },
      );
    }

    let data: Record<string, string>;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid data JSON' }, { status: 400 });
    }

    // Upload file if present
    if (file && file instanceof File && file.size > 0) {
      const ext = getExtension(file.name);
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { success: false, message: `Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, message: 'File is too large. Max allowed size is 25 MB' },
          { status: 400 },
        );
      }

      const uploadBody = new FormData();
      uploadBody.append('file', file);
      uploadBody.append('is_private', '1');

      const uploadResult = await uploadFrappeFile(uploadBody, request);
      const fileUrl = uploadResult?.message?.file_url;

      if (!fileUrl) {
        return NextResponse.json(
          { success: false, message: 'File upload succeeded but file URL was not returned' },
          { status: 500 },
        );
      }

      data.file_url = fileUrl;
    }

    const result = await callFrappeMethod(method, { data: JSON.stringify(data) }, request);
    return NextResponse.json({
      success: true,
      data: result?.data ?? result,
      message: result?.message || 'Record created',
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to upload and create record');
  }
}
