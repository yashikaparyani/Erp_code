import { NextRequest, NextResponse } from 'next/server';
import { uploadFrappeFile } from '../../../_lib/frappe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const approvalName = decodeURIComponent(id);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    // Build Frappe upload form
    const frappeForm = new FormData();
    frappeForm.append('file', file, file.name);
    frappeForm.append('doctype', 'GE Tender Approval');
    frappeForm.append('docname', approvalName);
    frappeForm.append('fieldname', 'attached_document');
    frappeForm.append('is_private', '0');

    const result = await uploadFrappeFile(frappeForm, request);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Document attached successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to attach document',
      },
      { status: 500 },
    );
  }
}
