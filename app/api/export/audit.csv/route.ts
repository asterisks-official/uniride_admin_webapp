import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/security/authGuard';
import { auditRepo } from '@/lib/repos/auditRepo';
import { generateCSV } from '@/utils/csv';

/**
 * GET /api/export/audit.csv
 * Export all audit logs to CSV format
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

    // Fetch all audit logs (paginate through all pages)
    const allLogs = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await auditRepo.listAuditLogs({}, { page, pageSize });
      allLogs.push(...result.data);
      
      hasMore = page < result.totalPages;
      page++;
    }

    // Flatten the diff object for CSV export
    const flattenedLogs = allLogs.map(log => ({
      id: log.id,
      adminUid: log.adminUid,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      diffBefore: log.diff?.before ? JSON.stringify(log.diff.before) : '',
      diffAfter: log.diff?.after ? JSON.stringify(log.diff.after) : '',
      createdAt: log.createdAt,
    }));

    // Define fields to export
    const fields = [
      'id',
      'adminUid',
      'action',
      'entityType',
      'entityId',
      'diffBefore',
      'diffAfter',
      'createdAt',
    ];

    const headers = [
      'ID',
      'Admin UID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Before State',
      'After State',
      'Created At',
    ];

    // Generate CSV
    const csv = generateCSV(flattenedLogs, fields as any, headers);

    // Return CSV response with proper headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="audit-log-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export audit logs error:', error);
    
    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export audit logs' } },
      { status: 500 }
    );
  }
}
