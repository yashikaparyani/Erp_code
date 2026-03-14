import { NextRequest, NextResponse } from 'next/server';

const FRAPPE_URL = process.env.FRAPPE_URL || 'http://172.23.104.33:8000';
const DOCTYPE = 'GE%20Tender';
const DOCTYPE_NAME = 'GE Tender';

function getFrappeAuthHeader(): Record<string, string> {
  const apiKey = process.env.FRAPPE_API_KEY;
  const apiSecret = process.env.FRAPPE_API_SECRET;

  if (apiKey && apiSecret) {
    return {
      Authorization: `token ${apiKey}:${apiSecret}`,
    };
  }

  return {};
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenderName = decodeURIComponent(id);
    const encodedTenderName = encodeURIComponent(tenderName);

    const incomingForm = await request.formData();
    const file = incomingForm.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'Please select a file to upload' },
        { status: 400 }
      );
    }

    const uploadBody = new FormData();
    uploadBody.append('file', file);
    uploadBody.append('doctype', DOCTYPE_NAME);
    uploadBody.append('docname', tenderName);
    uploadBody.append('fieldname', 'rfp_document');
    uploadBody.append('is_private', '0');

    const uploadResponse = await fetch(`${FRAPPE_URL}/api/method/upload_file`, {
      method: 'POST',
      headers: {
        ...getFrappeAuthHeader(),
      },
      body: uploadBody,
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('Frappe upload_file error:', uploadError);

      let message = 'Failed to upload file to server';
      if (uploadError.includes('PermissionError')) {
        message = 'Frappe denied upload permission. Configure FRAPPE_API_KEY and FRAPPE_API_SECRET in .env.local for authenticated upload.';
      }

      return NextResponse.json(
        { success: false, message },
        { status: 500 }
      );
    }

    const uploadResult = await uploadResponse.json();
    const fileUrl = uploadResult?.message?.file_url;

    if (!fileUrl) {
      console.error('upload_file response missing file_url:', uploadResult);
      return NextResponse.json(
        { success: false, message: 'Upload succeeded but file URL was not returned' },
        { status: 500 }
      );
    }

    const updateResponse = await fetch(`${FRAPPE_URL}/api/resource/${DOCTYPE}/${encodedTenderName}`, {
      method: 'PUT',
      headers: {
        ...getFrappeAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rfp_document: fileUrl,
      }),
    });

    if (!updateResponse.ok) {
      const updateError = await updateResponse.text();
      console.error('Tender update error after upload:', updateError);
      return NextResponse.json(
        { success: false, message: 'File uploaded but failed to link with tender' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      message: 'RFP document uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading RFP document:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload RFP document' },
      { status: 500 }
    );
  }
}
