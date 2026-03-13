import { NextResponse } from 'next/server';

// Frappe API URL (WSL)
const FRAPPE_URL = process.env.FRAPPE_URL || 'http://172.23.104.33:8000';
const DOCTYPE = 'GE%20Tender'; // URL-encoded DocType name

export async function GET() {
  try {
    // Fetch all tenders to calculate stats
    const response = await fetch(`${FRAPPE_URL}/api/resource/${DOCTYPE}?fields=["status","estimated_value"]&limit_page_length=0`, {
      headers: { 'Accept': 'application/json' },
    });
    
    const result = await response.json();
    const tenders = result.data || [];
    
    // Calculate stats
    let totalPipeline = 0;
    let wonCount = 0;
    let submittedCount = 0;
    let draftCount = 0;
    let totalCount = 0;
    
    tenders.forEach((tender: any) => {
      if (tender.status !== 'CANCELLED') {
        totalCount++;
        if (tender.status !== 'LOST') {
          totalPipeline += parseFloat(tender.estimated_value || 0);
        }
      }
      
      if (tender.status === 'WON') wonCount++;
      if (tender.status === 'SUBMITTED') submittedCount++;
      if (tender.status === 'DRAFT') draftCount++;
    });

    return NextResponse.json({
      success: true,
      data: {
        total_pipeline: totalPipeline,
        total_count: totalCount,
        won_count: wonCount,
        submitted_count: submittedCount,
        draft_count: draftCount
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: true,
      data: {
        total_pipeline: 0,
        total_count: 0,
        won_count: 0,
        submitted_count: 0,
        draft_count: 0
      }
    });
  }
}
