import { supabase } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';
import { auditRepo } from './auditRepo';

// Type aliases for cleaner code
type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationType = Database['public']['Tables']['notifications']['Row']['type'];

// Notification interface
export interface Notification {
  id: string;
  userUid: string;
  type: NotificationType;
  title: string;
  message: string;
  actionData: Record<string, any> | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Broadcast notification payload
export interface BroadcastPayload {
  title: string;
  message: string;
  segment?: string;
  userUids?: string[];
  type?: NotificationType;
  actionData?: Record<string, any>;
}

// Filters for listing notifications
export interface NotificationFilters {
  userUid?: string;
  unreadOnly?: boolean;
}

/**
 * Repository for managing notification operations
 * Handles notification broadcasting, push notifications via OneSignal, and notification management
 */
export class NotificationsRepository {
  /**
   * List notifications with optional filtering
   * @param filters - Optional filters to apply
   * @returns List of notifications
   */
  async listNotifications(filters: NotificationFilters = {}): Promise<Notification[]> {
    // Build the query with filters
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.userUid) {
      query = query.eq('user_uid', filters.userUid);
    }

    if (filters.unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to list notifications:', error);
      throw new Error(`Failed to list notifications: ${error.message}`);
    }

    return (data || []).map(this.mapRowToNotification);
  }

  /**
   * Broadcast notification to targeted users
   * Creates notification records in database and sends push notifications via OneSignal
   * @param payload - Broadcast notification payload
   * @param adminUid - UID of the admin performing the broadcast
   * @returns Promise that resolves when broadcast is complete
   */
  async broadcastNotification(payload: BroadcastPayload, adminUid: string): Promise<void> {
    // Determine target user UIDs
    let targetUserUids: string[] = [];

    if (payload.userUids && payload.userUids.length > 0) {
      // Specific users targeted
      targetUserUids = payload.userUids;
    } else if (payload.segment) {
      // Segment-based targeting (fetch users based on segment)
      targetUserUids = await this.getUserUidsBySegment(payload.segment);
    } else {
      // Broadcast to all users
      targetUserUids = await this.getAllUserUids();
    }

    if (targetUserUids.length === 0) {
      throw new Error('No target users found for broadcast');
    }

    // Create notification records for all targeted users
    const notificationInserts: NotificationInsert[] = targetUserUids.map((userUid) => ({
      user_uid: userUid,
      type: (payload.type || 'admin_broadcast') as NotificationType,
      title: payload.title,
      message: payload.message,
      action_data: payload.actionData ? JSON.parse(JSON.stringify(payload.actionData)) : null,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notificationInserts as any);

    if (insertError) {
      console.error('Failed to insert notification records:', insertError);
      throw new Error(`Failed to insert notification records: ${insertError.message}`);
    }

    // Send push notifications via OneSignal
    try {
      await this.sendPushNotification(
        targetUserUids,
        payload.title,
        payload.message,
        payload.actionData
      );
    } catch (error) {
      // Log push notification failure but don't fail the entire operation
      console.error('Failed to send push notifications:', error);
    }

    // Log the broadcast action to audit log
    await auditRepo.logAction({
      adminUid,
      action: 'broadcast_notification',
      entityType: 'notification',
      entityId: null,
      diff: {
        after: {
          title: payload.title,
          message: payload.message,
          targetCount: targetUserUids.length,
          segment: payload.segment,
        },
      },
    });
  }

  /**
   * Mark a notification as read
   * @param id - Notification ID
   * @returns Promise that resolves when notification is marked as read
   */
  async markAsRead(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   * @param id - Notification ID
   * @returns Promise that resolves when notification is deleted
   */
  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete notification:', error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Send push notification via OneSignal REST API
   * @param userUids - Array of user UIDs to send notification to
   * @param title - Notification title
   * @param message - Notification message
   * @param data - Optional action data
   * @returns Promise that resolves when push notification is sent
   */
  private async sendPushNotification(
    userUids: string[],
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

    if (!apiKey || !appId) {
      console.warn('OneSignal credentials not configured, skipping push notification');
      return;
    }

    // OneSignal API endpoint
    const url = 'https://onesignal.com/api/v1/notifications';

    // Prepare the payload
    const payload = {
      app_id: appId,
      include_external_user_ids: userUids,
      headings: { en: title },
      contents: { en: message },
      data: data || {},
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OneSignal API error: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log('Push notification sent successfully:', result);
    } catch (error) {
      console.error('Failed to send push notification via OneSignal:', error);
      throw error;
    }
  }

  /**
   * Get all user UIDs from user_stats table
   * @returns Array of user UIDs
   */
  private async getAllUserUids(): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_stats')
      .select('user_uid');

    if (error) {
      console.error('Failed to fetch all user UIDs:', error);
      throw new Error(`Failed to fetch all user UIDs: ${error.message}`);
    }

    return ((data || []) as { user_uid: string }[]).map((row) => row.user_uid);
  }

  /**
   * Get user UIDs by segment
   * @param segment - Segment identifier (e.g., 'riders', 'passengers', 'high_trust')
   * @returns Array of user UIDs matching the segment
   */
  private async getUserUidsBySegment(segment: string): Promise<string[]> {
    // Implement segment-based filtering logic
    // This is a placeholder implementation - adjust based on actual segment requirements
    
    let query = supabase.from('user_stats').select('user_uid');

    switch (segment) {
      case 'high_trust':
        query = query.gte('trust_score', 80);
        break;
      case 'low_trust':
        query = query.lt('trust_score', 50);
        break;
      case 'active_users':
        query = query.gte('total_rides', 5);
        break;
      case 'new_users':
        query = query.lt('total_rides', 3);
        break;
      default:
        // If segment not recognized, return all users
        return this.getAllUserUids();
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch user UIDs by segment:', error);
      throw new Error(`Failed to fetch user UIDs by segment: ${error.message}`);
    }

    return ((data || []) as { user_uid: string }[]).map((row) => row.user_uid);
  }

  /**
   * Map database row to Notification interface
   * @param row - Database row
   * @returns Formatted Notification object
   */
  private mapRowToNotification(row: NotificationRow): Notification {
    return {
      id: row.id,
      userUid: row.user_uid,
      type: row.type,
      title: row.title,
      message: row.message,
      actionData: row.action_data as Record<string, any> | null,
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton instance
export const notificationsRepo = new NotificationsRepository();
