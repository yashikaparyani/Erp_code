export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, fetchFrappeResource, uploadFrappeFile } from '../../_lib/frappe';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg']);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function getExtension(filename: string) {
  const cleaned = filename.split('?')[0].trim().toLowerCase();
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

function normalizePathCase(url: string) {
  const trimmed = (url || '').trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('/files/')) return '/files/' + trimmed.substring(7);
  if (lower.startsWith('/private/files/')) return '/private/files/' + trimmed.substring(15);
  return trimmed;
}

function addCandidateUrl(candidates: string[], seen: Set<string>, candidate?: string | null) {
  const value = normalizePathCase((candidate || '').trim());
  if (!value) return;
  if (!seen.has(value)) {
    seen.add(value);
    candidates.push(value);
  }
}

async function pickReachableUrl(candidates: string[], request: NextRequest) {
  for (const candidate of candidates) {
    try {
      await fetchFrappeResource(candidate, request);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return '';
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
    const sourceDocument = incomingForm.get('source_document')?.toString() || '';
    const status = incomingForm.get('status')?.toString() || '';
    const assignedTo = incomingForm.get('assigned_to')?.toString() || '';
    const acceptedBy = incomingForm.get('accepted_by')?.toString() || '';
    const dueDate = incomingForm.get('due_date')?.toString() || '';
    const blockerReason = incomingForm.get('blocker_reason')?.toString() || '';
    const escalatedTo = incomingForm.get('escalated_to')?.toString() || '';
    const approvedRejectedBy = incomingForm.get('approved_rejected_by')?.toString() || '';
    const closureNote = incomingForm.get('closure_note')?.toString() || '';
    const remarks = incomingForm.get('remarks')?.toString() || '';
    const referenceDoctype = incomingForm.get('reference_doctype')?.toString() || '';
    const referenceName = incomingForm.get('reference_name')?.toString() || '';
    const extension = getExtension(file.name);

    if (!documentName) {
      return NextResponse.json(
        { success: false, message: 'Document name is required' },
        { status: 400 },
      );
    }

    if (!linkedProject && !linkedSite && !(referenceDoctype && referenceName)) {
      return NextResponse.json(
        { success: false, message: 'Linked project, linked site, or a reference record is required' },
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

    // Step 2: Resolve to a reachable file URL before creating the document record.
    const candidates: string[] = [];
    const seen = new Set<string>();
    addCandidateUrl(candidates, seen, fileUrl);

    const normalizedUploaded = normalizePathCase(fileUrl);
    if (normalizedUploaded.startsWith('/files/')) {
      addCandidateUrl(candidates, seen, `/private/files/${normalizedUploaded.substring(7)}`);
    } else if (normalizedUploaded.startsWith('/private/files/')) {
      addCandidateUrl(candidates, seen, `/files/${normalizedUploaded.substring(15)}`);
    }

    try {
      const nearby = await callFrappeMethod<Array<{ file_url?: string }>>(
        'frappe.client.get_list',
        {
          doctype: 'File',
          filters: { file_name: file.name },
          fields: ['file_url'],
          order_by: 'modified desc',
          limit_page_length: 12,
        },
        request,
      );
      if (Array.isArray(nearby)) {
        for (const row of nearby) addCandidateUrl(candidates, seen, row?.file_url);
      }
    } catch {
      // Non-fatal; we'll still attempt with direct upload URL candidates.
    }

    const reachableFileUrl = await pickReachableUrl(candidates, request);
    if (!reachableFileUrl) {
      return NextResponse.json(
        {
          success: false,
          message: `Upload created a stale link. None of the resolved URLs are readable for file ${file.name}. Please retry once; if it repeats, run document-link repair.`,
        },
        { status: 500 },
      );
    }

    // Step 3: Create the GE Project Document record with a verified file URL
    const docData: Record<string, string> = {
      document_name: documentName,
      file: reachableFileUrl,
    };
    if (linkedProject) docData.linked_project = linkedProject;
    if (linkedSite) docData.linked_site = linkedSite;
    if (referenceDoctype) docData.reference_doctype = referenceDoctype;
    if (referenceName) docData.reference_name = referenceName;
    if (folder) docData.folder = folder;
    if (category) docData.category = category;
    if (expiryDate) docData.expiry_date = expiryDate;
    if (sourceDocument) docData.source_document = sourceDocument;
    if (status) docData.status = status;
    if (assignedTo) docData.assigned_to = assignedTo;
    if (acceptedBy) docData.accepted_by = acceptedBy;
    if (dueDate) docData.due_date = dueDate;
    if (blockerReason) docData.blocker_reason = blockerReason;
    if (escalatedTo) docData.escalated_to = escalatedTo;
    if (approvedRejectedBy) docData.approved_rejected_by = approvedRejectedBy;
    if (closureNote) docData.closure_note = closureNote;
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
        await callFrappeMethod('delete_uploaded_project_file', { file_url: reachableFileUrl }, request);
      } catch (cleanupError) {
        console.error('Failed to clean up orphan uploaded file:', cleanupError);
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      fileUrl: reachableFileUrl,
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
