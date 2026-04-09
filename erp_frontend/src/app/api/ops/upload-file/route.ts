import { NextRequest, NextResponse } from 'next/server';
import { uploadFrappeFile, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set(['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function getExtension(filename: string): string {
  const cleaned = filename.split('?')[0].trim().toLowerCase();
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

/**
 * Upload a file to Frappe and return the file_url.
 * Used for bulk-upload workflows where the file_url is then passed to
 * a separate RPC method via /api/ops.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 });
    }

    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, message: `Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: 'File is too large. Max allowed size is 10 MB' },
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

    return NextResponse.json({ success: true, data: { file_url: fileUrl } });
  } catch (error: any) {
    return jsonErrorResponse(error, 'File upload failed');
  }
}
