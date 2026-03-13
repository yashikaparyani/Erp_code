import { NextRequest, NextResponse } from 'next/server';

// Frappe API URL (WSL)
const FRAPPE_URL = process.env.FRAPPE_URL || 'http://172.23.104.33:8000';
const DOCTYPE = 'GE%20Tender'; // URL-encoded DocType name

// GET - Fetch all tenders using Frappe Resource API
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    // Build filters
    let filters = '';
    if (status) {
      filters = `&filters=[["status","=","${status}"]]`;
    }

    const url = `${FRAPPE_URL}/api/resource/${DOCTYPE}?fields=["name","tender_number","title","client","submission_date","status","emd_amount","pbg_amount","estimated_value","creation","modified"]&limit_page_length=${limit}&limit_start=${offset}&order_by=creation desc${filters}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const result = await response.json();
    
    // Get total count
    const countUrl = `${FRAPPE_URL}/api/resource/${DOCTYPE}?limit_page_length=0${filters}`;
    const countResponse = await fetch(countUrl);
    const countResult = await countResponse.json();
    
    return NextResponse.json({
      success: true,
      data: result.data || [],
      total: countResult.data?.length || 0
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tenders', data: [] },
      { status: 500 }
    );
  }
}

// POST - Create new tender using Frappe Resource API
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Build Frappe-compatible payload
    const tenderData: Record<string, any> = {
      tender_number: data.tender_number,
      title: data.title,
      submission_date: data.submission_date,
      status: data.status || 'DRAFT',
      emd_required: data.emd_required ? 1 : 0,
      pbg_required: data.pbg_required ? 1 : 0,
      emd_amount: data.emd_amount || 0,
      pbg_amount: data.pbg_amount || 0,
      estimated_value: data.estimated_value || 0,
      // Use provided client or default to DEFAULT-CLIENT
      client: data.client || 'DEFAULT-CLIENT',
    };
    
    const response = await fetch(`${FRAPPE_URL}/api/resource/${DOCTYPE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(tenderData),
    });
    
    const result = await response.json();
    
    if (result.data) {
      return NextResponse.json({
        success: true,
        message: 'Tender created successfully',
        data: result.data
      });
    } else {
      // Return detailed error message from Frappe
      const errorMsg = result._server_messages 
        ? JSON.parse(JSON.parse(result._server_messages)[0]).message 
        : result.exc_type || 'Failed to create tender';
      return NextResponse.json({
        success: false,
        message: errorMsg
      }, { status: 400 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create tender' },
      { status: 500 }
    );
  }
}
