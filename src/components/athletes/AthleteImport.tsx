'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, notify } from '@/lib/notifications';

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  athletes: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

interface AthleteImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AthleteImport({ onClose, onSuccess }: AthleteImportProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'error'>('skip');
  const [createAffiliations, setCreateAffiliations] = useState(true);
  const [results, setResults] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['xml', 'csv'].includes(fileExtension || '')) {
        notify.error('Please select an XML or CSV file');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file || !session?.user) return;

    setLoading(true);
    setResults(null);

    try {
      // Read file content
      const fileContent = await file.text();
      const fileType = file.name.split('.').pop()?.toLowerCase() as 'xml' | 'csv';

      const payload = {
        fileType,
        fileContent,
        organizationId: session.user.organizationId,
        duplicateStrategy,
        createAffiliations,
      };

      const result = await apiFetch<{ results: ImportResult }>('/api/athletes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setResults(result.results);
      
      if (result.results.errors.length === 0) {
        notify.success(`Import completed successfully! ${result.results.created} created, ${result.results.updated} updated, ${result.results.skipped} skipped.`);
      } else {
        notify.warning(`Import completed with ${result.results.errors.length} warnings.`);
      }

    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Import FIE Athlete Roster
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {!results ? (
            <div className="space-y-6">
              {/* File Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select FIE Roster File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".xml,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-center">
                      <div className="text-4xl text-gray-400 mb-2">📁</div>
                      <div className="text-lg font-medium text-gray-900 mb-1">
                        {file ? file.name : 'Choose XML or CSV file'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Click to browse or drag and drop'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Import Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Duplicate Strategy
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'skip', label: 'Skip duplicates', desc: 'Keep existing data, skip duplicate entries' },
                      { value: 'update', label: 'Update duplicates', desc: 'Update existing records with new data' },
                      { value: 'error', label: 'Error on duplicates', desc: 'Stop import if duplicates are found' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-start">
                        <input
                          type="radio"
                          name="duplicateStrategy"
                          value={option.value}
                          checked={duplicateStrategy === option.value}
                          onChange={(e) => setDuplicateStrategy(e.target.value as 'skip' | 'update' | 'error')}
                          className="h-4 w-4 text-blue-600 border-gray-300 mt-1"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-700">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Organization Settings
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={createAffiliations}
                        onChange={(e) => setCreateAffiliations(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-700">Create organization affiliations</div>
                        <div className="text-xs text-gray-500">
                          Automatically affiliate imported athletes with your organization
                        </div>
                      </div>
                    </label>

                    {session?.user?.organizationId && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <strong>Target Organization:</strong> {session.user.organizationName || 'Your Organization'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Format Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Supported File Formats</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <div><strong>CSV:</strong> Must include headers (firstName, lastName, nationality, fieId, etc.)</div>
                  <div><strong>XML:</strong> FIE standard format with &lt;Athletes&gt;&lt;Athlete&gt; structure</div>
                  <div><strong>Duplicate Detection:</strong> Based on FIE ID, name + birth date, or exact name match</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import Athletes'}
                </button>
              </div>
            </div>
          ) : (
            /* Results Display */
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">
                  {results.errors.length === 0 ? '✅' : '⚠️'}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Import {results.errors.length === 0 ? 'Completed' : 'Completed with Warnings'}
                </h3>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{results.created}</div>
                  <div className="text-sm text-green-800">Created</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.updated}</div>
                  <div className="text-sm text-blue-800">Updated</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
                  <div className="text-sm text-yellow-800">Skipped</div>
                </div>
              </div>

              {/* Errors */}
              {results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-900 mb-2">Warnings & Errors:</h4>
                  <div className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                    {results.errors.map((error, idx) => (
                      <div key={idx}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Athletes */}
              {results.athletes.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Sample Imported Athletes (showing first 5):
                  </h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    {results.athletes.slice(0, 5).map((athlete, idx) => (
                      <div key={idx}>• {athlete.firstName} {athlete.lastName}</div>
                    ))}
                    {results.athletes.length > 5 && (
                      <div className="text-gray-500">... and {results.athletes.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleFinish}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 