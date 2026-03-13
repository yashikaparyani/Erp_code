import { NextRequest, NextResponse } from 'next/server';

// Frappe API URL (WSL)
const FRAPPE_URL = process.env.FRAPPE_URL || 'http://172.23.104.33:8000';
const DOCTYPE = 'GE%20EMD%20PBG%20Instrument'; // URL-encoded DocType name

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tender = searchParams.get('tender');
    const type = searchParams.get('type'); // EMD or PBG
    
    let filters = '';
    const filterParts = [];
    
    if (tender) {
      filterParts.push(`["linked_tender","=","${tender}"]`);
    }
    if (type) {
      filterParts.push(`["instrument_type","=","${type}"]`);
    }
    
    if (filterParts.length > 0) {
      filters = `&filters=[${filterParts.join(',')}]`;
    }
    
    const url = `${FRAPPE_URL}/api/resource/${DOCTYPE}?fields=["*"]${filters}&order_by=creation desc`;
    console.log('Fetching instruments from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Frappe error: ${response.status}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('Error fetching EMD/PBG instruments:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch instruments', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.instrument_type) {
      return NextResponse.json(
        { success: false, message: 'Instrument type is required' },
        { status: 400 }
      );
    }
    
    const payload = {
      instrument_type: body.instrument_type, // EMD or PBG
      linked_tender: body.linked_tender,
      amount: body.amount || 0,
      instrument_number: body.instrument_number,
      bank_name: body.bank_name,
      issue_date: body.issue_date,
      expiry_date: body.expiry_date,
      status: body.status || 'Pending',
      remarks: body.remarks,
    };

    const url = `${FRAPPE_URL}/api/resource/${DOCTYPE}`;
    console.log('Creating instrument at:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Frappe error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Instrument created successfully'
    });
  } catch (error) {
    console.error('Error creating instrument:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create instrument' },
      { status: 500 }
    );
  }
}
