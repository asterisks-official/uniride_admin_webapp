import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/security/authGuard';
import { ratingsRepo } from '@/lib/repos/ratingsRepo';
import { generateCSV } from '@/utils/csv';

/**
 * GET /api/export/ratings.csv
 * Export all ratings to CSV format
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization token' } },
        { status: 401 }
      );
    }

    await assertAdmin(token);

    const allRatings: any[] = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await ratingsRepo.listRatings({}, { page, pageSize });
      allRatings.push(...result.data);
      hasMore = page < result.totalPages;
      page++;
    }

    const fields = [
      'id',
      'rideId',
      'raterUid',
      'ratedUid',
      'raterRole',
      'rating',
      'review',
      'tags',
      'isVisible',
      'createdAt',
      'updatedAt',
    ] as any;

    const headers = [
      'ID',
      'Ride ID',
      'Rater UID',
      'Rated UID',
      'Rater Role',
      'Rating',
      'Review',
      'Tags',
      'Visible',
      'Created At',
      'Updated At',
    ];

    const csv = generateCSV(allRatings, fields, headers);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="ratings-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export ratings error:', error);

    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export ratings' } },
      { status: 500 }
    );
  }
}