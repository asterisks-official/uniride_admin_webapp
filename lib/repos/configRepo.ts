import { firestoreAdmin } from '@/lib/firebase/admin';
import { auditRepo } from './auditRepo';

/**
 * App configuration interface
 */
export interface AppConfig {
  minVersion: string;
  flags: Record<string, boolean>;
}

/**
 * Update config input interface
 */
export interface UpdateConfigInput {
  minVersion?: string;
  flags?: Record<string, boolean>;
}

/**
 * Repository for managing application configuration
 * Handles reading and updating app config stored in Firestore
 */
export class ConfigRepository {
  private readonly collectionName = 'app_config';
  private readonly docId = 'config';

  /**
   * Get the current application configuration
   * @returns The current app configuration
   */
  async getConfig(): Promise<AppConfig> {
    try {
      const docRef = firestoreAdmin.collection(this.collectionName).doc(this.docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        // Return default config if document doesn't exist
        return {
          minVersion: '1.0.0',
          flags: {},
        };
      }

      const data = doc.data();
      return {
        minVersion: data?.minVersion || '1.0.0',
        flags: data?.flags || {},
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

      const docRef = firestoreAdmin.collection(this.collectionName).doc(this.docId);

      // Build update object
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

      // Update Firestore document
      await docRef.set(updateData, { merge: true });

      // Get updated config
      const updatedConfig = await this.getConfig();

      // Log audit entry
      await auditRepo.logAction({
        adminUid,
        action: 'update_config',
        entityType: 'app_config',
        entityId: this.docId,
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
