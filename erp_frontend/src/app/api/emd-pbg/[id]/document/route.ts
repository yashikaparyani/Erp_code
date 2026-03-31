import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, uploadFrappeFile } from '../../../_lib/frappe';

const DOCTYPE_NAME = 'GE EMD PBG Instrument';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const instrumentName = decodeURIComponent(id);
    const incomingForm = await request.formData();
    const file = incomingForm.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'Please select a file to upload' },
        { status: 400 },
      );
    }

    const uploadBody = new FormData();
    uploadBody.append('file', file);
    uploadBody.append('doctype', DOCTYPE_NAME);
    uploadBody.append('docname', instrumentName);
    uploadBody.append('fieldname', 'instrument_document');
    uploadBody.append('is_private', '0');

    const uploadResult = await uploadFrappeFile(uploadBody, request);
    const fileUrl = uploadResult?.message?.file_url;

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, message: 'Upload succeeded but file URL was not returned' },
        { status: 500 },
      );
    }

    await callFrappeMethod(
      'frappe.client.set_value',
      {
        doctype: DOCTYPE_NAME,
        name: instrumentName,
        fieldname: 'instrument_document',
        value: fileUrl,
      },
      request,
    );

    return NextResponse.json({
      success: true,
      fileUrl,
      message: 'Instrument document uploaded successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to upload instrument document' },
      { status: 500 },
    );
  }
}
