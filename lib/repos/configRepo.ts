import { firestoreAdmin } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { auditRepo } from './auditRepo';

/**
 * App configuration interface
 */
export interface AppConfig {
  minVersion: string;
  flags: Record<string, boolean>;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isUpdateRequired: boolean;
  latestBuildNumber: string;
  latestVersion: string;
}

/**
 * Update config input interface
 */
export interface UpdateConfigInput {
  minVersion?: string;
  flags?: Record<string, boolean>;
  isMaintenanceMode?: boolean;
  maintenanceMessage?: string;
  isUpdateRequired?: boolean;
  latestBuildNumber?: string;
  latestVersion?: string;
}

/**
 * Repository for managing application configuration
 * Handles reading and updating app config stored in Firestore
 */
export class ConfigRepository {
  private readonly collectionName = 'app_config';
  private readonly primaryDocId = 'version';
  private readonly fallbackDocId = 'config';

  /**
   * Get the current application configuration
   * @returns The current app configuration
   */
  async getConfig(): Promise<AppConfig> {
    try {
      const versionRef = firestoreAdmin.collection(this.collectionName).doc(this.primaryDocId);
      let doc = await versionRef.get();

      if (!doc.exists) {
        const fallbackRef = firestoreAdmin.collection(this.collectionName).doc(this.fallbackDocId);
        doc = await fallbackRef.get();
      }

      if (!doc.exists) {
        return {
          minVersion: '1.0.0',
          flags: {},
          isMaintenanceMode: false,
          maintenanceMessage: '',
          isUpdateRequired: false,
          latestBuildNumber: '0',
          latestVersion: '1.0.0',
        };
      }

      const data = doc.data();
      return {
        minVersion: data?.minVersion || data?.latestVersion || '1.0.0',
        flags: data?.flags || {},
        isMaintenanceMode: data?.isMaintenanceMode ?? data?.is_maintenance_mode ?? false,
        maintenanceMessage: data?.maintenanceMessage ?? data?.maintenance_message ?? '',
        isUpdateRequired: data?.isUpdateRequired ?? data?.is_update_required ?? false,
        latestBuildNumber: data?.latestBuildNumber ?? data?.latest_build_number ?? '0',
        latestVersion: data?.latestVersion ?? data?.latest_version ?? data?.minVersion ?? '1.0.0',
      };
    } catch (error) {
      console.error('Failed to get app config:', error);
      throw new Error(`Failed to get app config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update application configuration
   * @param updates - The configuration updates to apply
   * @param adminUid - The UID of the admin performing the update
   * @returns The updated configuration
   */
  async updateConfig(updates: UpdateConfigInput, adminUid: string): Promise<AppConfig> {
    try {
      // Get current config for audit logging
      const currentConfig = await this.getConfig();

      const docRef = firestoreAdmin.collection(this.collectionName).doc(this.primaryDocId);

      // Build update object (camelCase for in-memory typing)
      const updateData: Partial<AppConfig> = {};

      if (updates.minVersion !== undefined) {
        updateData.minVersion = updates.minVersion;
      }

      if (updates.flags !== undefined) {
        // Merge flags with existing flags
        updateData.flags = {
          ...currentConfig.flags,
          ...updates.flags,
        };
      }

      if (updates.isMaintenanceMode !== undefined) {
        updateData.isMaintenanceMode = updates.isMaintenanceMode;
      }
      if (updates.maintenanceMessage !== undefined) {
        updateData.maintenanceMessage = updates.maintenanceMessage;
      }
      if (updates.isUpdateRequired !== undefined) {
        updateData.isUpdateRequired = updates.isUpdateRequired;
      }
      if (updates.latestBuildNumber !== undefined) {
        updateData.latestBuildNumber = updates.latestBuildNumber;
      }
      if (updates.latestVersion !== undefined) {
        updateData.latestVersion = updates.latestVersion;
      }

      // Persist using snake_case keys to match existing Firestore schema
      const snakeUpdate: Record<string, any> = {};
      if (updateData.minVersion !== undefined) snakeUpdate.minVersion = updateData.minVersion;
      if (updateData.flags !== undefined) snakeUpdate.flags = updateData.flags;
      if (updates.isMaintenanceMode !== undefined) snakeUpdate.is_maintenance_mode = updates.isMaintenanceMode;
      if (updates.maintenanceMessage !== undefined) snakeUpdate.maintenance_message = updates.maintenanceMessage;
      if (updates.isUpdateRequired !== undefined) snakeUpdate.is_update_required = updates.isUpdateRequired;
      if (updates.latestBuildNumber !== undefined) snakeUpdate.latest_build_number = updates.latestBuildNumber;
      if (updates.latestVersion !== undefined) snakeUpdate.latest_version = updates.latestVersion;

      await docRef.set(snakeUpdate, { merge: true });

      // Clean up camelCase duplicates if they exist
      try {
        await docRef.update({
          isMaintenanceMode: FieldValue.delete(),
          maintenanceMessage: FieldValue.delete(),
          isUpdateRequired: FieldValue.delete(),
          latestBuildNumber: FieldValue.delete(),
          latestVersion: FieldValue.delete(),
        });
      } catch (_) {
        // ignore
      }

      // Get updated config
      const updatedConfig = await this.getConfig();

      // Log audit entry
      await auditRepo.logAction({
        adminUid,
        action: 'update_config',
        entityType: 'app_config',
        entityId: this.primaryDocId,
        diff: {
          before: currentConfig,
          after: updatedConfig,
        },
      });

      return updatedConfig;
    } catch (error) {
      console.error('Failed to update app config:', error);
      throw new Error(`Failed to update app config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const configRepo = new ConfigRepository();
