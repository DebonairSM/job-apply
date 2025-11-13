import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '../contexts/ToastContext';

interface ResumeDataSummary {
  resumeCount: number;
  skillCount: number;
  experienceCount: number;
  educationCount: number;
  lastParsed?: string;
}

interface SyncResponse {
  message: string;
  backupPath: string;
  syncedCount: number;
  totalFiles: number;
  results: Array<{ path: string; id: number }>;
  errors?: Array<{ path: string; error: string }>;
}

export function ResumeSync() {
  const queryClient = useQueryClient();
  const { success, warning, error } = useToast();
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingClearExisting, setPendingClearExisting] = useState(false);

  // Fetch resume data summary
  const { data: summary, isLoading } = useQuery<ResumeDataSummary>({
    queryKey: ['resume-summary'],
    queryFn: async () => {
      const response = await fetch('/api/resumes/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch resume summary');
      }
      return response.json();
    },
    refetchInterval: 5000
  });

  // Mutation for syncing resumes
  const syncMutation = useMutation({
    mutationFn: async (clearExisting: boolean) => {
      const response = await fetch(`/api/resumes/sync-all?clearExisting=${clearExisting}`, {
        method: 'POST'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync resumes');
      }
      return response.json() as Promise<SyncResponse>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-summary'] });
      setBackupPath(data.backupPath);
      
      if (data.errors && data.errors.length > 0) {
        warning(`Synced ${data.syncedCount}/${data.totalFiles} resumes. ${data.errors.length} failed.`);
      } else {
        success(data.message);
      }
      
      setTimeout(() => {
        setBackupPath(null);
      }, 10000);
    },
    onError: (error: Error) => {
      error(error.message);
      setBackupPath(null);
    }
  });

  const handleSync = (clearExisting: boolean) => {
    if (clearExisting) {
      setPendingClearExisting(true);
      setShowConfirmModal(true);
      return;
    }
    
    syncMutation.mutate(clearExisting);
  };

  const handleConfirmSync = () => {
    setShowConfirmModal(false);
    syncMutation.mutate(pendingClearExisting);
    setPendingClearExisting(false);
  };

  const handleCancelSync = () => {
    setShowConfirmModal(false);
    setPendingClearExisting(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasData = summary && (summary.skillCount > 0 || summary.experienceCount > 0);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Resume Database Sync</h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Sync your resume files to the database for faster form filling. The database will be backed up automatically before any changes.
        </p>

        {backupPath && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <span className="font-medium">Backup created:</span> {backupPath}
            </p>
          </div>
        )}

      {/* Current Database State */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-3">Current Database State</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Resumes</p>
            <p className="text-2xl font-bold text-gray-800">{summary?.resumeCount || 0}</p>
          </div>
          <div>
            <p className="text-gray-500">Skills</p>
            <p className="text-2xl font-bold text-gray-800">{summary?.skillCount || 0}</p>
          </div>
          <div>
            <p className="text-gray-500">Experience</p>
            <p className="text-2xl font-bold text-gray-800">{summary?.experienceCount || 0}</p>
          </div>
          <div>
            <p className="text-gray-500">Education</p>
            <p className="text-2xl font-bold text-gray-800">{summary?.educationCount || 0}</p>
          </div>
        </div>
        
        {summary?.lastParsed && (
          <p className="mt-3 text-xs text-gray-500">
            Last synced: {new Date(summary.lastParsed + (summary.lastParsed.includes('Z') ? '' : 'Z')).toLocaleString()}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => handleSync(false)}
          disabled={syncMutation.isPending}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {syncMutation.isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </span>
          ) : (
            hasData ? 'Update Resume Data' : 'Sync Resumes to Database'
          )}
        </button>
        
        {hasData && (
          <button
            onClick={() => handleSync(true)}
            disabled={syncMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear & Re-sync
          </button>
        )}
      </div>

      {/* Warning */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <span className="font-medium">Note:</span> A database backup will be created automatically before any changes are made.
        </p>
      </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Clear Resume Database"
        message="This will clear all existing resume data from the database and re-sync from files. Continue?"
        confirmText="Clear & Re-sync"
        cancelText="Cancel"
        onConfirm={handleConfirmSync}
        onCancel={handleCancelSync}
        variant="warning"
      />
    </>
  );
}

