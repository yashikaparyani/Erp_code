import { NextRequest, NextResponse } from 'next/server';

// Frappe API URL (WSL)
const FRAPPE_URL = process.env.FRAPPE_URL || 'http://172.23.104.33:8000';
const DOCTYPE = 'GE%20Tender'; // URL-encoded DocType name

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenderName = encodeURIComponent(decodeURIComponent(id));
    
    const url = `${FRAPPE_URL}/api/resource/${DOCTYPE}/${tenderName}`;
    console.log('Fetching tender from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: false, message: 'Tender not found' },
          { status: 404 }
        );
      }
      const errorText = await response.text();
      console.error('Frappe error response:', errorText);
      throw new Error(`Frappe error: ${response.status}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching tender:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tender' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenderName = encodeURIComponent(decodeURIComponent(id));
    const body = await request.json();

    const url = `${FRAPPE_URL}/api/resource/${DOCTYPE}/${tenderName}`;
    console.log('Updating tender at:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Frappe update error:', errorText);
      throw new Error(`Frappe error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Tender updated successfully'
    });
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update tender' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenderName = encodeURIComponent(decodeURIComponent(id));

    const url = `${FRAPPE_URL}/api/resource/${DOCTYPE}/${tenderName}`;
    console.log('Deleting tender at:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Frappe delete error:', errorText);
      throw new Error(`Frappe error: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Tender deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tender:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete tender' },
      { status: 500 }
    );
  }
}
