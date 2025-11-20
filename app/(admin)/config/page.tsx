'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/utils/apiClient';

interface AppConfig {
  minVersion: string;
  flags: Record<string, boolean>;
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
      const updates: { minVersion?: string; flags?: Record<string, boolean> } = {};

      // Only include minVersion if it changed
      if (minVersion !== config?.minVersion) {
        updates.minVersion = minVersion;
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
      JSON.stringify(flags) !== JSON.stringify(config.flags)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Application Configuration</h1>
          <p className="text-gray-600 mt-2">Manage app version requirements and feature flags</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading configuration...</p>
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

            {/* Minimum Version Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Minimum App Version</h2>
              <p className="text-sm text-gray-600 mb-4">
                Users with app versions below this will be required to update
              </p>
              
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version (semver format)
                </label>
                <input
                  type="text"
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  placeholder="1.0.0"
                  pattern="^\d+\.\d+\.\d+$"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Format: MAJOR.MINOR.PATCH (e.g., 1.0.0)
                </p>
              </div>
            </div>

            {/* Feature Flags Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Feature Flags</h2>
              <p className="text-sm text-gray-600 mb-4">
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
                        <span className="font-mono text-sm text-gray-900">{key}</span>
                        <span
                          className={`text-xs font-medium ${
                            value ? 'text-green-600' : 'text-gray-500'
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
                <p className="text-gray-500 text-sm mb-6">No feature flags configured</p>
              )}

              {/* Add New Flag */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Flag</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFlagKey}
                    onChange={(e) => setNewFlagKey(e.target.value)}
                    placeholder="flag_name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setMinVersion(config?.minVersion || '');
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
              <p className="text-gray-600 mb-4">
                Are you sure you want to update the application configuration? This will affect all users.
              </p>
              
              <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                <p className="font-medium mb-2">Changes:</p>
                {minVersion !== config?.minVersion && (
                  <p className="text-gray-700">
                    • Min Version: {config?.minVersion} → {minVersion}
                  </p>
                )}
                {JSON.stringify(flags) !== JSON.stringify(config?.flags) && (
                  <p className="text-gray-700">• Feature flags updated</p>
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
