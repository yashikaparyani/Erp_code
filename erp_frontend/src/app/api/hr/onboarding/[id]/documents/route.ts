import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse, uploadFrappeFile } from '../../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get('file');
    const rowIndex = Number(form.get('rowIndex'));

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'Please select a file to upload' }, { status: 400 });
    }

    if (!Number.isInteger(rowIndex) || rowIndex < 0) {
      return NextResponse.json({ success: false, message: 'A valid document row is required' }, { status: 400 });
    }

    const onboardingName = decodeURIComponent(id);
    const uploadBody = new FormData();
    uploadBody.append('file', file);
    uploadBody.append('is_private', '1');

    const uploadResult = await uploadFrappeFile(uploadBody, request);
    const fileUrl = uploadResult?.message?.file_url;

    if (!fileUrl) {
      return NextResponse.json({ success: false, message: 'File upload did not return a file URL' }, { status: 500 });
    }

    const onboarding = await callFrappeMethod('get_onboarding', { name: onboardingName }, request);
    const documents = Array.isArray(onboarding.data?.documents)
      ? onboarding.data.documents.map((row: Record<string, unknown>) => ({ ...row }))
      : [];

    if (!documents[rowIndex]) {
      return NextResponse.json({ success: false, message: 'Document row not found' }, { status: 404 });
    }

    documents[rowIndex].file = fileUrl;
    documents[rowIndex].verification_status = 'PENDING';
    documents[rowIndex].verified_by = '';
    documents[rowIndex].verified_on = '';

    let result;
    try {
      result = await callFrappeMethod(
        'update_onboarding',
        { name: onboardingName, data: JSON.stringify({ documents }) },
        request,
      );
    } catch (error) {
      await callFrappeMethod('delete_uploaded_project_file', { file_url: fileUrl }, request).catch(() => null);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      fileUrl,
      message: result.message || 'Document uploaded successfully',
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to upload onboarding document');
  }
}
