import { NextRequest, NextResponse } from 'next/server';

// Frappe API URL (WSL)
const FRAPPE_URL = process.env.FRAPPE_URL || 'http://172.23.104.33:8000';
const DOCTYPE = 'GE%20Party'; // URL-encoded DocType name

// GET - Fetch all parties (clients/vendors)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partyType = searchParams.get('type'); // CLIENT, VENDOR, BOTH
    const active = searchParams.get('active');
    
    let filters: string[] = [];
    if (partyType) {
      // CLIENT can be CLIENT or BOTH, VENDOR can be VENDOR or BOTH
      if (partyType === 'CLIENT') {
        filters.push('["party_type","in",["CLIENT","BOTH"]]');
      } else if (partyType === 'VENDOR') {
        filters.push('["party_type","in",["VENDOR","BOTH"]]');
      } else {
        filters.push(`["party_type","=","${partyType}"]`);
      }
    }
    if (active === '1' || active === 'true') {
      filters.push('["active","=",1]');
    }
    
    const filterStr = filters.length > 0 ? `&filters=[${filters.join(',')}]` : '';
    
    const url = `${FRAPPE_URL}/api/resource/${DOCTYPE}?fields=["name","party_name","party_type","gstin","pan","phone","email","city","state","active"]&order_by=party_name asc${filterStr}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('Parties API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch parties', data: [] },
      { status: 500 }
    );
  }
}

// POST - Create new party
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const partyData = {
      party_name: data.party_name,
      party_type: data.party_type || 'CLIENT', // CLIENT, VENDOR, BOTH
      gstin: data.gstin || '',
      pan: data.pan || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      pincode: data.pincode || '',
      bank_name: data.bank_name || '',
      account_no: data.account_no || '',
      ifsc: data.ifsc || '',
      active: 1
    };
    
    const response = await fetch(`${FRAPPE_URL}/api/resource/${DOCTYPE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(partyData),
    });
    
    const result = await response.json();
    
    if (result.data) {
      return NextResponse.json({
        success: true,
        message: 'Party created successfully',
        data: result.data
      });
    } else {
      const errorMsg = result._server_messages 
        ? JSON.parse(JSON.parse(result._server_messages)[0]).message 
        : result.exc_type || 'Failed to create party';
      return NextResponse.json({
        success: false,
        message: errorMsg
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Create party error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create party' },
      { status: 500 }
    );
  }
}
