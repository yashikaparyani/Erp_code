export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partyType = searchParams.get('type'); // CLIENT, VENDOR, BOTH
    const active = searchParams.get('active');
    const result = await callFrappeMethod('get_parties', {
      party_type: partyType || undefined,
      active: active || undefined,
    }, request);
    
    return NextResponse.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('Parties API error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch parties', data: [] },
      { status: 500 }
    );
  }
}

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
    const result = await callFrappeMethod('create_party', {
      data: JSON.stringify(partyData),
    }, request);

    return NextResponse.json({
      success: true,
      message: result.message || 'Party created successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Create party error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to create party' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, ...rest } = data;
    const result = await callFrappeMethod('update_party', {
      name,
      data: JSON.stringify(rest),
    }, request);

    return NextResponse.json({
      success: true,
      message: result.message || 'Party updated successfully',
      data: result.data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update party' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name') || '';
    const result = await callFrappeMethod('delete_party', { name }, request);
    return NextResponse.json({
      success: true,
      message: result.message || 'Party deleted successfully',
      data: result.data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete party' },
      { status: 500 }
    );
  }
}
