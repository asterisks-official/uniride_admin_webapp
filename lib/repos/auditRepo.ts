import { supabase } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';

// Type aliases for cleaner code
type AuditLogRow = Database['public']['Tables']['admin_audit_log']['Row'];
type AuditLogInsert = Database['public']['Tables']['admin_audit_log']['Insert'];

// Audit log entry interface
export interface AuditLogEntry {
  adminUid: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: {
    before?: any;
    after?: any;
  } | null;
}

// Audit log with formatted data
export interface AuditLog {
  id: string;
  adminUid: string;
  action: string;
  entityType: string;
  entityId: string | null;
  diff: {
    before?: any;
    after?: any;
  } | null;
  createdAt: Date;
}

// Filters for listing audit logs
export interface AuditFilters {
  adminUid?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Pagination parameters
export interface Pagination {
  page: number;
  pageSize: number;
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Repository for managing audit log operations
 * Handles logging of all administrative actions and querying audit history
 */
export class AuditRepository {
  /**
   * Log an administrative action to the audit log
   * @param entry - The audit log entry to record
   * @returns Promise that resolves when the log is recorded
   */
  async logAction(entry: AuditLogEntry): Promise<void> {
    const insertData: AuditLogInsert = {
      admin_uid: entry.adminUid,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      diff: entry.diff ? JSON.parse(JSON.stringify(entry.diff)) : null,
    };

    const { error } = await supabase
      .from('admin_audit_log')
      .insert(insertData);

    if (error) {
      console.error('Failed to log audit action:', error);
      throw new Error(`Failed to log audit action: ${error.message}`);
    }
  }

  /**
   * List audit logs with optional filtering and pagination
   * @param filters - Optional filters to apply
   * @param pagination - Pagination parameters
   * @returns Paginated list of audit logs
   */
  async listAuditLogs(
    filters: AuditFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<AuditLog>> {
    // Build the query with filters
    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.adminUid) {
      query = query.eq('admin_uid', filters.adminUid);
    }

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to list audit logs:', error);
      throw new Error(`Failed to list audit logs: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: (data || []).map(this.mapRowToAuditLog),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get a specific audit log entry by ID
   * @param id - The audit log entry ID
   * @returns The audit log entry or null if not found
   */
  async getAuditLogById(id: string): Promise<AuditLog | null> {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to get audit log:', error);
      throw new Error(`Failed to get audit log: ${error.message}`);
    }

    return this.mapRowToAuditLog(data);
  }

  /**
   * Map database row to AuditLog interface
   * @param row - Database row
   * @returns Formatted AuditLog object
   */
  private mapRowToAuditLog(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      adminUid: row.admin_uid,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      diff: row.diff as { before?: any; after?: any } | null,
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const auditRepo = new AuditRepository();

