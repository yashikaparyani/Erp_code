import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, uploadFrappeFile } from '../../_lib/frappe';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg']);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function getExtension(filename: string) {
  const cleaned = filename.split('?')[0].trim().toLowerCase();
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export async function POST(request: NextRequest) {
  try {
    const incomingForm = await request.formData();
    const file = incomingForm.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'Please select a file to upload' },
        { status: 400 },
      );
    }

    const documentName = incomingForm.get('document_name')?.toString() || '';
    const linkedProject = incomingForm.get('linked_project')?.toString() || '';
    const linkedSite = incomingForm.get('linked_site')?.toString() || '';
    const folder = incomingForm.get('folder')?.toString() || '';
    const category = incomingForm.get('category')?.toString() || '';
    const expiryDate = incomingForm.get('expiry_date')?.toString() || '';
    const remarks = incomingForm.get('remarks')?.toString() || '';
    const extension = getExtension(file.name);

    if (!documentName) {
      return NextResponse.json(
        { success: false, message: 'Document name is required' },
        { status: 400 },
      );
    }

    if (!linkedProject) {
      return NextResponse.json(
        { success: false, message: 'Linked project is required' },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category is required' },
        { status: 400 },
      );
    }

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { success: false, message: 'Unsupported file type. Allowed: pdf, doc, docx, xls, xlsx, jpg, jpeg' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: 'File is too large. Max allowed size is 20 MB' },
        { status: 400 },
      );
    }

    // Step 1: Upload the actual file to Frappe
    const uploadBody = new FormData();
    uploadBody.append('file', file);
    uploadBody.append('is_private', '1');

    const uploadResult = await uploadFrappeFile(uploadBody, request);
    const fileUrl = uploadResult?.message?.file_url;

    if (!fileUrl) {
      console.error('upload_file response missing file_url:', uploadResult);
      return NextResponse.json(
        { success: false, message: 'File upload succeeded but file URL was not returned' },
        { status: 500 },
      );
    }

    // Step 2: Create the GE Project Document record with the real file URL
    const docData: Record<string, string> = {
      document_name: documentName,
      file: fileUrl,
    };
    if (linkedProject) docData.linked_project = linkedProject;
    if (linkedSite) docData.linked_site = linkedSite;
    if (folder) docData.folder = folder;
    if (category) docData.category = category;
    if (expiryDate) docData.expiry_date = expiryDate;
    if (remarks) docData.remarks = remarks;

    let result;
    try {
      result = await callFrappeMethod(
        'upload_project_document',
        { data: JSON.stringify(docData) },
        request,
      );
    } catch (error) {
      try {
        await callFrappeMethod('delete_uploaded_project_file', { file_url: fileUrl }, request);
      } catch (cleanupError) {
        console.error('Failed to clean up orphan uploaded file:', cleanupError);
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      fileUrl,
      message: result.message || 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading project document:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 },
    );
  }
}
