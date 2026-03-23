import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, uploadFrappeFile } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await callFrappeMethod('get_test_reports', {
      project: searchParams.get('project') || '',
      site: searchParams.get('site') || '',
      status: searchParams.get('status') || '',
    }, request);
    return NextResponse.json({ success: true, data: result.data || [], total: result.total || 0 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch test reports', data: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      const reportName = form.get('report_name')?.toString().trim() || '';
      const linkedProject = form.get('linked_project')?.toString().trim() || '';
      const linkedSite = form.get('linked_site')?.toString().trim() || '';
      const testType = form.get('test_type')?.toString().trim() || 'FAT';
      const testDate = form.get('test_date')?.toString().trim() || '';
      const remarks = form.get('remarks')?.toString().trim() || '';

      if (!(file instanceof File)) {
        return NextResponse.json({ success: false, message: 'Please select a report file to upload' }, { status: 400 });
      }
      if (!reportName) {
        return NextResponse.json({ success: false, message: 'Report name is required' }, { status: 400 });
      }
      if (!linkedProject) {
        return NextResponse.json({ success: false, message: 'Linked project is required' }, { status: 400 });
      }

      const uploadBody = new FormData();
      uploadBody.append('file', file);
      uploadBody.append('is_private', '1');

      const uploadResult = await uploadFrappeFile(uploadBody, request);
      const fileUrl = uploadResult?.message?.file_url;

      if (!fileUrl) {
        return NextResponse.json(
          { success: false, message: 'File upload succeeded but no file URL was returned' },
          { status: 500 },
        );
      }

      const docData: Record<string, string> = {
        report_name: reportName,
        linked_project: linkedProject,
        test_type: testType,
        file: fileUrl,
      };
      if (linkedSite) docData.linked_site = linkedSite;
      if (testDate) docData.test_date = testDate;
      if (remarks) docData.remarks = remarks;

      try {
        const result = await callFrappeMethod('create_test_report', { data: JSON.stringify(docData) }, request);
        return NextResponse.json({ success: true, data: result.data, message: 'Test report created' });
      } catch (error) {
        await callFrappeMethod('delete_uploaded_project_file', { file_url: fileUrl }, request).catch(() => null);
        throw error;
      }
    }

    const body = await request.json();
    const { action, name, ...rest } = body;

    if (action === 'approve') {
      const result = await callFrappeMethod('approve_test_report', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Test report approved' });
    }
    if (action === 'reject') {
      const result = await callFrappeMethod('reject_test_report', { name, reason: rest.reason || '' }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Test report rejected' });
    }
    if (action === 'update') {
      const result = await callFrappeMethod('update_test_report', { name, data: JSON.stringify(rest.data || rest) }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Test report updated' });
    }
    if (action === 'delete') {
      const result = await callFrappeMethod('delete_test_report', { name }, request);
      return NextResponse.json({ success: true, data: result.data, message: 'Test report deleted' });
    }

    const result = await callFrappeMethod('create_test_report', { data: JSON.stringify(body) }, request);
    return NextResponse.json({ success: true, data: result.data, message: 'Test report created' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 },
    );
  }
}
