import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/security/authGuard';
import { reportsRepo } from '@/lib/repos/reportsRepo';
import { generateCSV } from '@/utils/csv';

/**
 * GET /api/export/reports.csv
 * Export all reports to CSV format
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization token' } },
        { status: 401 }
      );
    }

    await assertAdmin(token);

    // Fetch all reports (paginate through all pages)
    const allReports = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await reportsRepo.listReports({}, { page, pageSize });
      allReports.push(...result.data);
      
      hasMore = page < result.totalPages;
      page++;
    }

    // Define fields to export
    const fields = [
      'id',
      'reporterUid',
      'reportedUserUid',
      'rideId',
      'category',
      'severity',
      'description',
      'reporterRole',
      'status',
      'adminNotes',
      'createdAt',
      'updatedAt',
      'resolvedAt',
    ];

    const headers = [
      'ID',
      'Reporter UID',
      'Reported User UID',
      'Ride ID',
      'Category',
      'Severity',
      'Description',
      'Reporter Role',
      'Status',
      'Admin Notes',
      'Created At',
      'Updated At',
      'Resolved At',
    ];

    // Generate CSV
    const csv = generateCSV(allReports, fields as any, headers);

    // Return CSV response with proper headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="reports-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export reports error:', error);
    
    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export reports' } },
      { status: 500 }
    );
  }
}
