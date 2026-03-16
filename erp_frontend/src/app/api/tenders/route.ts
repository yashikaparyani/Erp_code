import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const filters = status ? [['status', '=', status]] : undefined;
    const result = await callFrappeMethod('get_tenders', {
      filters,
      limit_page_length: limit,
      limit_start: offset,
    }, request);
    
    return NextResponse.json({
      success: true,
      data: result.data || [],
      total: result.total || 0
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch tenders', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const tenderData = {
      tender_number: data.tender_number,
      title: data.title,
      submission_date: data.submission_date,
      status: data.status || 'DRAFT',
      emd_required: data.emd_required ? 1 : 0,
      pbg_required: data.pbg_required ? 1 : 0,
      emd_amount: data.emd_amount || 0,
      pbg_amount: data.pbg_amount || 0,
      estimated_value: data.estimated_value || 0,
      client: data.client || 'DEFAULT-CLIENT',
      organization: data.organization || '',
    };

    const result = await callFrappeMethod('create_tender', {
      data: JSON.stringify(tenderData),
    }, request);

    return NextResponse.json({
      success: true,
      message: result.message || 'Tender created successfully',
      data: result.data
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create tender' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, ...rest } = data;
    const result = await callFrappeMethod('update_tender', {
      name,
      data: JSON.stringify(rest),
    }, request);

    return NextResponse.json({
      success: true,
      message: result.message || 'Tender updated successfully',
      data: result.data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update tender' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name') || '';
    const result = await callFrappeMethod('delete_tender', { name }, request);
    return NextResponse.json({
      success: true,
      message: result.message || 'Tender deleted successfully',
      data: result.data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete tender' },
      { status: 500 }
    );
  }
}
