export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, uploadFrappeFile } from '../../../_lib/frappe';

const DOCTYPE_NAME = 'GE Tender';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);
    const incomingForm = await request.formData();
    const file = incomingForm.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'Please select a file to upload' }, { status: 400 });
    }

    const uploadBody = new FormData();
    uploadBody.append('file', file);
    uploadBody.append('doctype', DOCTYPE_NAME);
    uploadBody.append('docname', tenderName);
    uploadBody.append('fieldname', 'tender_document');
    uploadBody.append('is_private', '0');

    const uploadResult = await uploadFrappeFile(uploadBody, request);
    const fileUrl = uploadResult?.message?.file_url;

    if (!fileUrl) {
      return NextResponse.json({ success: false, message: 'Upload succeeded but file URL was not returned' }, { status: 500 });
    }

    await callFrappeMethod('update_tender', {
      name: tenderName,
      data: JSON.stringify({ tender_document: fileUrl }),
    }, request);

    return NextResponse.json({ success: true, fileUrl, message: 'Tender document uploaded successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to upload tender document' },
      { status: 500 },
    );
  }
}
