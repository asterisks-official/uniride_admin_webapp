'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/utils/apiClient';

interface AppConfig {
  minVersion: string;
  flags: Record<string, boolean>;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isUpdateRequired: boolean;
  latestBuildNumber: string;
  latestVersion: string;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [minVersion, setMinVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [latestBuildNumber, setLatestBuildNumber] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [newFlagKey, setNewFlagKey] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/config');
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch config');
      }

      setConfig(result.data);
      setMinVersion(result.data.minVersion);
      setLatestVersion(result.data.latestVersion);
      setLatestBuildNumber(result.data.latestBuildNumber);
      setIsMaintenanceMode(result.data.isMaintenanceMode);
      setMaintenanceMessage(result.data.maintenanceMessage || '');
      setIsUpdateRequired(result.data.isUpdateRequired);
      setFlags(result.data.flags || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updates: {
        minVersion?: string;
        flags?: Record<string, boolean>;
        isMaintenanceMode?: boolean;
        maintenanceMessage?: string;
        isUpdateRequired?: boolean;
        latestBuildNumber?: string;
        latestVersion?: string;
      } = {};

      // Only include minVersion if it changed
      if (minVersion !== config?.minVersion) {
        updates.minVersion = minVersion;
      }
      if (latestVersion !== config?.latestVersion) {
        updates.latestVersion = latestVersion;
      }
      if (latestBuildNumber !== config?.latestBuildNumber) {
        updates.latestBuildNumber = latestBuildNumber;
      }
      if (isMaintenanceMode !== config?.isMaintenanceMode) {
        updates.isMaintenanceMode = isMaintenanceMode;
      }
      if (maintenanceMessage !== config?.maintenanceMessage) {
        updates.maintenanceMessage = maintenanceMessage;
      }
      if (isUpdateRequired !== config?.isUpdateRequired) {
        updates.isUpdateRequired = isUpdateRequired;
      }

      // Only include flags if they changed
      if (JSON.stringify(flags) !== JSON.stringify(config?.flags)) {
        updates.flags = flags;
      }

      if (Object.keys(updates).length === 0) {
        setSuccessMessage('No changes to save');
        setShowConfirmDialog(false);
        setSaving(false);
        return;
      }

      const response = await apiFetch('/api/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to update config');
      }

      setConfig(result.data);
      setSuccessMessage('Configuration updated successfully');
      setShowConfirmDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setShowConfirmDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFlag = (key: string) => {
    setFlags(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddFlag = () => {
    if (newFlagKey && !flags.hasOwnProperty(newFlagKey)) {
      setFlags(prev => ({
        ...prev,
        [newFlagKey]: false,
      }));
      setNewFlagKey('');
    }
  };

  const handleRemoveFlag = (key: string) => {
    setFlags(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const hasChanges = () => {
    if (!config) return false;
    return (
      minVersion !== config.minVersion ||
      JSON.stringify(flags) !== JSON.stringify(config.flags) ||
      latestVersion !== config.latestVersion ||
      latestBuildNumber !== config.latestBuildNumber ||
      isMaintenanceMode !== config.isMaintenanceMode ||
      maintenanceMessage !== config.maintenanceMessage ||
      isUpdateRequired !== config.isUpdateRequired
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Application Configuration</h1>
          <p className="text-gray-800 mt-2">Manage app version requirements, maintenance, and feature flags</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-800">Loading configuration...</p>
          </div>
        ) : error && !config ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchConfig}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Versioning Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">App Versioning</h2>
              <p className="text-base text-gray-800 mb-4">Set minimum/ latest versions and build numbers used by clients</p>
              
              <div className="max-w-md">
                <label className="block text-base font-medium text-gray-900 mb-2">
                  Version (semver format)
                </label>
                <input
                  type="text"
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  placeholder="1.0.0"
                  
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
                <p className="mt-1 text-sm text-gray-700">
                  Format: MAJOR.MINOR.PATCH (e.g., 1.0.0)
                </p>
              </div>

              <div className="max-w-md mt-6">
                <label className="block text-base font-medium text-gray-900 mb-2">Latest Version (semver)</label>
                <input
                  type="text"
                  value={latestVersion}
                  onChange={(e) => setLatestVersion(e.target.value)}
                  placeholder="1.0.0"
                  
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div className="max-w-md mt-6">
                <label className="block text-base font-medium text-gray-900 mb-2">Latest Build Number</label>
                <input
                  type="text"
                  value={latestBuildNumber}
                  onChange={(e) => setLatestBuildNumber(e.target.value)}
                  placeholder="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Feature Flags Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Feature Flags</h2>
              <p className="text-base text-gray-800 mb-4">
                Enable or disable features across the platform
              </p>

              {/* Existing Flags */}
              {Object.keys(flags).length > 0 ? (
                <div className="space-y-3 mb-6">
                  {Object.entries(flags).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleToggleFlag(key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            value ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className="font-mono text-base text-gray-900">{key}</span>
                        <span
                          className={`text-sm font-medium ${
                            value ? 'text-green-700' : 'text-gray-700'
                          }`}
                        >
                          {value ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFlag(key)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-700 text-base mb-6">No feature flags configured</p>
              )}

              {/* Add New Flag */}
              <div className="border-t pt-4">
                <h3 className="text-base font-medium text-gray-900 mb-3">Add New Flag</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFlagKey}
                    onChange={(e) => setNewFlagKey(e.target.value)}
                    placeholder="flag_name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                  <button
                    onClick={handleAddFlag}
                    disabled={!newFlagKey || flags.hasOwnProperty(newFlagKey)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Flag
                  </button>
                </div>
              </div>
            </div>

            {/* Maintenance Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Maintenance Mode</h2>
              <p className="text-base text-gray-800 mb-4">Temporarily disable the app with a message</p>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setIsMaintenanceMode(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isMaintenanceMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isMaintenanceMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm">Maintenance Mode</span>
                <span className={`text-sm font-medium ${isMaintenanceMode ? 'text-green-700' : 'text-gray-700'}`}>
                  {isMaintenanceMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="max-w-2xl">
                <label className="block text-base font-medium text-gray-900 mb-2">Maintenance Message</label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="We're performing scheduled maintenance. The app will be back in 30 minutes."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Update Requirement Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Force Update</h2>
              <p className="text-base text-gray-800 mb-4">Require users to update to the latest app</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsUpdateRequired(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isUpdateRequired ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isUpdateRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm">Update Required</span>
                <span className={`text-sm font-medium ${isUpdateRequired ? 'text-green-700' : 'text-gray-700'}`}>
                  {isUpdateRequired ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setMinVersion(config?.minVersion || '');
                  setLatestVersion(config?.latestVersion || '');
                  setLatestBuildNumber(config?.latestBuildNumber || '');
                  setIsMaintenanceMode(!!config?.isMaintenanceMode);
                  setMaintenanceMessage(config?.maintenanceMessage || '');
                  setIsUpdateRequired(!!config?.isUpdateRequired);
                  setFlags(config?.flags || {});
                  setSuccessMessage(null);
                  setError(null);
                }}
                disabled={!hasChanges()}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Changes
              </button>
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!hasChanges() || saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Confirm Configuration Changes</h3>
                  <p className="text-gray-800 mb-4">
                    Are you sure you want to update the application configuration? This will affect all users.
                  </p>
              
              <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                <p className="font-medium mb-2 text-gray-900">Changes:</p>
                {minVersion !== config?.minVersion && (
                  <p className="text-gray-700">• Min Version: {config?.minVersion} → {minVersion}</p>
                )}
                {JSON.stringify(flags) !== JSON.stringify(config?.flags) && (
                  <p className="text-gray-700">• Feature flags updated</p>
                )}
                {latestVersion !== config?.latestVersion && (
                  <p className="text-gray-700">• Latest Version: {config?.latestVersion} → {latestVersion}</p>
                )}
                {latestBuildNumber !== config?.latestBuildNumber && (
                  <p className="text-gray-700">• Latest Build: {config?.latestBuildNumber} → {latestBuildNumber}</p>
                )}
                {isMaintenanceMode !== config?.isMaintenanceMode && (
                  <p className="text-gray-700">• Maintenance Mode: {config?.isMaintenanceMode ? 'On' : 'Off'} → {isMaintenanceMode ? 'On' : 'Off'}</p>
                )}
                {maintenanceMessage !== config?.maintenanceMessage && (
                  <p className="text-gray-700">• Maintenance Message updated</p>
                )}
                {isUpdateRequired !== config?.isUpdateRequired && (
                  <p className="text-gray-700">• Update Required: {config?.isUpdateRequired ? 'On' : 'Off'} → {isUpdateRequired ? 'On' : 'Off'}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
