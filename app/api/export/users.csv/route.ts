import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/security/authGuard';
import { usersRepo } from '@/lib/repos/usersRepo';
import { generateCSV } from '@/utils/csv';

/**
 * GET /api/export/users.csv
 * Export all users to CSV format
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

    // Fetch all users (paginate through all pages)
    const allUsers = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await usersRepo.listUsers({}, { page, pageSize });
      allUsers.push(...result.data);
      
      hasMore = page < result.totalPages;
      page++;
    }

    // Define fields to export
    const fields = [
      'uid',
      'email',
      'displayName',
      'phoneNumber',
      'role',
      'isRiderVerified',
      'riderVerificationStatus',
      'isBanned',
      'banReason',
      'trustScore',
      'totalRides',
      'completedRides',
      'averageRating',
      'cancellations',
      'lateCancellations',
      'noShows',
      'createdAt',
    ];

    const headers = [
      'UID',
      'Email',
      'Display Name',
      'Phone Number',
      'Role',
      'Rider Verified',
      'Verification Status',
      'Banned',
      'Ban Reason',
      'Trust Score',
      'Total Rides',
      'Completed Rides',
      'Average Rating',
      'Cancellations',
      'Late Cancellations',
      'No Shows',
      'Created At',
    ];

    // Generate CSV
    const csv = generateCSV(allUsers, fields as any, headers);

    // Return CSV response with proper headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export users error:', error);
    
    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export users' } },
      { status: 500 }
    );
  }
}
