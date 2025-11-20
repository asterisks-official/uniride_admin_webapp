import { supabase } from '@/lib/supabase/server';
import { auditRepo } from './auditRepo';
import { Database, ReportStatus, ReportCategory, ReportSeverity, ReporterRole } from '@/lib/supabase/types';

// Type aliases
type ReportRow = Database['public']['Tables']['reports']['Row'];

// Type definitions
export interface Report {
  id: string;
  reporterUid: string;
  reportedUserUid: string | null;
  rideId: string | null;
  category: ReportCategory;
  severity: ReportSeverity;
  description: string;
  reporterRole: ReporterRole;
  status: ReportStatus;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface ReportFilters {
  status?: ReportStatus;
  reportedUserUid?: string;
  category?: ReportCategory;
  severity?: ReportSeverity;
  reporterRole?: ReporterRole;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Repository for managing report operations
 * Handles report data from Supabase including listings, details, and moderation actions
 */
export class ReportsRepository {
  /**
   * List reports with filters and pagination
   * @param filters - Optional filters for status, reported user, category, severity, and reporter role
   * @param pagination - Pagination parameters
   * @returns Paginated list of reports
   */
  async listReports(
    filters: ReportFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<Report>> {
    // Build query with filters
    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' });

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply reported user filter
    if (filters.reportedUserUid) {
      query = query.eq('reported_user_uid', filters.reportedUserUid);
    }

    // Apply category filter
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    // Apply severity filter
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    // Apply reporter role filter
    if (filters.reporterRole) {
      query = query.eq('reporter_role', filters.reporterRole);
    }

    // Apply pagination and ordering
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to list reports:', error);
      throw new Error(`Failed to list reports: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: (data || []).map(this.mapRowToReport),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get a single report by ID with complete details
   * @param id - Report ID
   * @returns Report details or null if not found
   */
  async getReportById(id: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to get report:', error);
      throw new Error(`Failed to get report: ${error.message}`);
    }

    return this.mapRowToReport(data);
  }

  /**
   * Resolve a report with admin notes
   * @param id - Report ID
   * @param adminNotes - Note explaining the resolution
   * @param adminUid - Admin performing the resolution
   */
  async resolveReport(
    id: string,
    adminNotes: string,
    adminUid: string
  ): Promise<void> {
    // Get current report data for audit log
    const beforeReport = await this.getReportById(id);
    if (!beforeReport) {
      throw new Error('Report not found');
    }

    // Update report
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'resolved' as ReportStatus,
        admin_notes: adminNotes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to resolve report:', error);
      throw new Error(`Failed to resolve report: ${error.message}`);
    }

    // Get updated report data
    const afterReport = await this.getReportById(id);

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'resolve_report',
      entityType: 'report',
      entityId: id,
      diff: {
        before: {
          status: beforeReport.status,
          adminNotes: beforeReport.adminNotes,
        },
        after: {
          status: afterReport?.status,
          adminNotes: adminNotes,
          resolvedAt: afterReport?.resolvedAt,
        },
      },
    });
  }

  /**
   * Update report status to under_review
   * @param id - Report ID
   * @param adminNotes - Optional notes about the review
   * @param adminUid - Admin performing the action
   */
  async reviewReport(
    id: string,
    adminNotes: string,
    adminUid: string
  ): Promise<void> {
    // Get current report data for audit log
    const beforeReport = await this.getReportById(id);
    if (!beforeReport) {
      throw new Error('Report not found');
    }

    // Update report
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'under_review' as ReportStatus,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to review report:', error);
      throw new Error(`Failed to review report: ${error.message}`);
    }

    // Get updated report data
    const afterReport = await this.getReportById(id);

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'review_report',
      entityType: 'report',
      entityId: id,
      diff: {
        before: {
          status: beforeReport.status,
          adminNotes: beforeReport.adminNotes,
        },
        after: {
          status: afterReport?.status,
          adminNotes: adminNotes,
        },
      },
    });
  }

  /**
   * Dismiss a report with reason
   * @param id - Report ID
   * @param reason - Reason for dismissal
   * @param adminUid - Admin performing the dismissal
   */
  async dismissReport(
    id: string,
    reason: string,
    adminUid: string
  ): Promise<void> {
    // Get current report data for audit log
    const beforeReport = await this.getReportById(id);
    if (!beforeReport) {
      throw new Error('Report not found');
    }

    // Update report
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'dismissed' as ReportStatus,
        admin_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to dismiss report:', error);
      throw new Error(`Failed to dismiss report: ${error.message}`);
    }

    // Get updated report data
    const afterReport = await this.getReportById(id);

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'dismiss_report',
      entityType: 'report',
      entityId: id,
      diff: {
        before: {
          status: beforeReport.status,
          adminNotes: beforeReport.adminNotes,
        },
        after: {
          status: afterReport?.status,
          dismissalReason: reason,
        },
      },
    });
  }

  /**
   * Map database row to Report interface
   */
  private mapRowToReport(row: ReportRow): Report {
    return {
      id: row.id,
      reporterUid: row.reporter_uid,
      reportedUserUid: row.reported_user_uid,
      rideId: row.ride_id,
      category: row.category,
      severity: row.severity,
      description: row.description,
      reporterRole: row.reporter_role,
      status: row.status,
      adminNotes: row.admin_notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    };
  }
}

// Export singleton instance
export const reportsRepo = new ReportsRepository();
