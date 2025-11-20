import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/security/authGuard';
import { ridesRepo } from '@/lib/repos/ridesRepo';
import { generateCSV } from '@/utils/csv';

/**
 * GET /api/export/rides.csv
 * Export all rides to CSV format
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

    // Fetch all rides (paginate through all pages)
    const allRides = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await ridesRepo.listRides({}, { page, pageSize });
      allRides.push(...result.data);
      
      hasMore = page < result.totalPages;
      page++;
    }

    // Define fields to export
    const fields = [
      'id',
      'ownerUid',
      'fromLocation',
      'toLocation',
      'departAt',
      'seatsTotal',
      'seatsAvailable',
      'price',
      'vehicleInfo',
      'status',
      'visible',
      'matchedAt',
      'riderUid',
      'passengerUid',
      'confirmationDeadline',
      'riderConfirmedGoing',
      'passengerConfirmedGoing',
      'riderConfirmedCompletion',
      'passengerConfirmedCompletion',
      'cancelledAt',
      'cancelledByUid',
      'cancellationReason',
      'cancellationFee',
      'completedAt',
      'createdAt',
    ];

    const headers = [
      'ID',
      'Owner UID',
      'From Location',
      'To Location',
      'Depart At',
      'Total Seats',
      'Available Seats',
      'Price',
      'Vehicle Info',
      'Status',
      'Visible',
      'Matched At',
      'Rider UID',
      'Passenger UID',
      'Confirmation Deadline',
      'Rider Confirmed Going',
      'Passenger Confirmed Going',
      'Rider Confirmed Completion',
      'Passenger Confirmed Completion',
      'Cancelled At',
      'Cancelled By UID',
      'Cancellation Reason',
      'Cancellation Fee',
      'Completed At',
      'Created At',
    ];

    // Generate CSV
    const csv = generateCSV(allRides, fields as any, headers);

    // Return CSV response with proper headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="rides-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export rides error:', error);
    
    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export rides' } },
      { status: 500 }
    );
  }
}
