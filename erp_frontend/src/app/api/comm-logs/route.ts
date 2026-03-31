import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, uploadFrappeFile, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt']);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function getExtension(filename: string) {
  const cleaned = filename.split('?')[0].trim().toLowerCase();
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const args: Record<string, string> = {};
    if (sp.get('project')) args.project = sp.get('project')!;
    if (sp.get('site')) args.site = sp.get('site')!;
    if (sp.get('comm_type')) args.comm_type = sp.get('comm_type')!;
    if (sp.get('direction')) args.direction = sp.get('direction')!;
    const result = await callFrappeMethod('get_comm_logs', args, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch comm logs', data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let data: Record<string, string | number | null> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      data = {
        linked_project: formData.get('linked_project')?.toString() || '',
        linked_site: formData.get('linked_site')?.toString() || '',
        communication_date: formData.get('communication_date')?.toString() || '',
        communication_type: formData.get('communication_type')?.toString() || '',
        direction: formData.get('direction')?.toString() || '',
        subject: formData.get('subject')?.toString() || '',
        reference_number: formData.get('reference_number')?.toString() || '',
        issue_summary: formData.get('issue_summary')?.toString() || '',
        response_status: formData.get('response_status')?.toString() || '',
        response_detail: formData.get('response_detail')?.toString() || '',
        counterparty_name: formData.get('counterparty_name')?.toString() || '',
        counterparty_role: formData.get('counterparty_role')?.toString() || '',
        summary: formData.get('summary')?.toString() || '',
        follow_up_required: formData.get('follow_up_required') ? 1 : 0,
        follow_up_date: formData.get('follow_up_date')?.toString() || '',
      };

      if (file instanceof File && file.size > 0) {
        const extension = getExtension(file.name);
        if (!ALLOWED_EXTENSIONS.has(extension)) {
          return NextResponse.json(
            { success: false, message: 'Unsupported file type. Allowed: pdf, doc, docx, xls, xlsx, jpg, jpeg, png, txt' },
            { status: 400 },
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { success: false, message: 'File is too large. Max allowed size is 20 MB' },
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

        data.attachment = fileUrl;
      }
    } else {
      data = await request.json();
    }

    const result = await callFrappeMethod('create_comm_log', { data: JSON.stringify(data) }, request);
    return NextResponse.json({ success: true, data: result.data, message: result.message || 'Communication log created' });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to create comm log');
  }
}
