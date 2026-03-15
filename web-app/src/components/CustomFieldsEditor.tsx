import React, { useState, useEffect, useCallback } from 'react';

interface CustomField {
  id: number;
  name: string;
  data_type: string;
}

export interface SettingsData {
  custom_fields_enable: boolean;
  custom_fields_selected_ids: number[];
  custom_fields_write_mode: 'append' | 'replace' | 'update';
  tags_auto_create: boolean;
}

const defaultSettings: SettingsData = {
  custom_fields_enable: false,
  custom_fields_selected_ids: [],
  custom_fields_write_mode: 'append',
  tags_auto_create: false,
};

const CustomFieldsEditor: React.FC = () => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [initialSettings, setInitialSettings] = useState<SettingsData>(defaultSettings);
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizeSettings = useCallback((raw: Partial<SettingsData> = {}): SettingsData => ({
    custom_fields_enable: raw.custom_fields_enable ?? false,
    custom_fields_selected_ids: raw.custom_fields_selected_ids ?? [],
    custom_fields_write_mode: raw.custom_fields_write_mode ?? 'append',
    tags_auto_create: raw.tags_auto_create ?? false,
  }), []);

  const fetchInitialData = useCallback(async (forcePull = false) => {
    setIsLoading(true);
    try {
      const settingsRes = await fetch('./api/settings');
      if (!settingsRes.ok) throw new Error('Failed to fetch settings');
      const settingsData = await settingsRes.json();

      const raw = (settingsData?.settings ?? settingsData ?? {}) as Partial<SettingsData>;
      const normalizedSettings = normalizeSettings(raw);

      setSettings(normalizedSettings);
      setInitialSettings(normalizedSettings);

      const customFieldsUrl = forcePull ? './api/custom_fields?force_pull=true' : './api/custom_fields';
      const customFieldsRes = await fetch(customFieldsUrl);
      if (customFieldsRes.ok) {
        const customFieldsData = await customFieldsRes.json();
        setCustomFields(customFieldsData || []);
      } else {
        console.warn('Failed to fetch custom fields:', customFieldsRes.status);
        setCustomFields([]);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [normalizeSettings]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const hasChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    setIsDirty(hasChanged);
  }, [settings, initialSettings]);

  const handleSaveSettings = useCallback(async () => {
    if (!isDirty || !settings) return;
    setIsSaving(true);
    setError(null);
    try {
      const latestRes = await fetch('./api/settings');
      const latestData = latestRes.ok ? await latestRes.json() : {};
      const latestRaw = (latestData?.settings ?? latestData ?? {}) as Partial<SettingsData>;
      
      const mergedSettings: SettingsData = {
        ...normalizeSettings(latestRaw),
        custom_fields_enable: settings.custom_fields_enable,
        custom_fields_selected_ids: settings.custom_fields_selected_ids,
        custom_fields_write_mode: settings.custom_fields_write_mode,
      };


      const response = await fetch('./api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedSettings),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save settings');
      }

      const rawResponse = await response.json();
      const finalRaw = (rawResponse?.settings ?? rawResponse ?? {}) as Partial<SettingsData>;
      const finalNormalized = normalizeSettings(finalRaw);

      setSettings(finalNormalized);
      setInitialSettings(finalNormalized);
      
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [settings, isDirty, normalizeSettings]);

  const handleSettingChange = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleFieldSelectionChange = (fieldId: number) => {
    const currentIds = settings.custom_fields_selected_ids;
    const newSelectedIds = currentIds.includes(fieldId)
      ? currentIds.filter((id) => id !== fieldId)
      : [...currentIds, fieldId];
    handleSettingChange('custom_fields_selected_ids', newSelectedIds);
  };

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>;

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-6" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Custom Fields</h1>
        <button
          onClick={() => fetchInitialData(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-transform transform animate-bounce" role="alert">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">General Settings</h2>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="customFieldsEnable"
                checked={settings.custom_fields_enable}
                onChange={(e) => handleSettingChange('custom_fields_enable', e.target.checked)}
                className="w-4 h-4 mr-2 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="customFieldsEnable" className="text-gray-700 dark:text-gray-200 cursor-pointer">
                Automatically generate custom fields
              </label>
            </div>

            <fieldset disabled={!settings.custom_fields_enable} className="disabled:opacity-50">
              <div>
                <h3 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">Write Mode:</h3>
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    id="writeModeAppend"
                    name="writeMode"
                    value="append"
                    checked={settings.custom_fields_write_mode === 'append'}
                    onChange={() => handleSettingChange('custom_fields_write_mode', 'append')}
                    className="w-4 h-4 mr-2"
                  />
                  <label htmlFor="writeModeAppend" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                    Append (safest option)
                  </label>
                </div>
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    id="writeModeUpdate"
                    name="writeMode"
                    value="update"
                    checked={settings.custom_fields_write_mode === 'update'}
                    onChange={() => handleSettingChange('custom_fields_write_mode', 'update')}
                    className="w-4 h-4 mr-2"
                  />
                  <label htmlFor="writeModeUpdate" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                    Update (add new, update existing)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="writeModeReplace"
                    name="writeMode"
                    value="replace"
                    checked={settings.custom_fields_write_mode === 'replace'}
                    onChange={() => handleSettingChange('custom_fields_write_mode', 'replace')}
                    className="w-4 h-4 mr-2"
                  />
                  <label htmlFor="writeModeReplace" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                    Replace (suggestions only)
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full">
            <fieldset disabled={!settings.custom_fields_enable} className="disabled:opacity-50">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Fields to process:</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`field-${field.id}`}
                      checked={(settings.custom_fields_selected_ids ?? []).includes(field.id)}
                      onChange={() => handleFieldSelectionChange(field.id)}
                      className="w-4 h-4 mr-2 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`field-${field.id}`} className="text-gray-700 dark:text-gray-300 cursor-pointer">
                      {field.name}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSaveSettings}
          disabled={!isDirty || isSaving}
          aria-busy={isSaving}
          className={`px-6 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform ${
            isSaving
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 focus:ring-blue-500'
          } ${!isDirty && !isSaving ? 'disabled:bg-gray-400 disabled:cursor-not-allowed' : ''}`}
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default CustomFieldsEditor;