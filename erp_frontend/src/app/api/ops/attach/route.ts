import { NextRequest, NextResponse } from 'next/server';
import { uploadFrappeFile, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx',
  'csv', 'dwg', 'dxf', 'zip', 'rar', 'txt',
]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function getExtension(filename: string): string {
  const cleaned = filename.split('?')[0].trim().toLowerCase();
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const doctype = formData.get('doctype')?.toString().trim() || '';
    const docname = formData.get('docname')?.toString().trim() || '';
    const file = formData.get('file');

    if (!doctype || !docname) {
      return NextResponse.json(
        { success: false, message: 'doctype and docname are required' },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, message: 'A file is required' },
        { status: 400 },
      );
    }

    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, message: `Unsupported file type: .${ext}` },
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
    uploadBody.append('doctype', doctype);
    uploadBody.append('docname', docname);

    const uploadResult = await uploadFrappeFile(uploadBody, request);
    const fileUrl = uploadResult?.message?.file_url;

    return NextResponse.json({
      success: true,
      file_url: fileUrl || null,
      message: 'File attached',
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to attach file');
  }
}
