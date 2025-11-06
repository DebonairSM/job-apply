import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResumeSync } from './ResumeSync';

interface UserProfile {
  id?: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  city?: string;
  linkedin_profile?: string;
  work_authorization?: string;
  requires_sponsorship?: string;
  profile_summary?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackupInfo {
  lastBackupDate: string | null;
  lastBackupSize: number;
  lastBackupName?: string;
  backupCount: number;
  backupLocation?: string;
}

export function Settings() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch profile data
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    },
  });

  // Fetch backup info
  const { data: backupInfo } = useQuery<BackupInfo>({
    queryKey: ['backup-info'],
    queryFn: async () => {
      const response = await fetch('/api/backup/info');
      if (!response.ok) {
        throw new Error('Failed to fetch backup info');
      }
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSuccessMessage('Profile updated successfully!');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setSuccessMessage(null);
    },
  });

  // Mutation for creating backup
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-info'] });
      setSuccessMessage('Backup created successfully!');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setSuccessMessage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const profileData: Partial<UserProfile> = {
      full_name: formData.get('full_name') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      city: formData.get('city') as string,
      linkedin_profile: formData.get('linkedin_profile') as string,
      work_authorization: formData.get('work_authorization') as string,
      requires_sponsorship: formData.get('requires_sponsorship') as string,
      profile_summary: formData.get('profile_summary') as string,
    };

    updateProfileMutation.mutate(profileData);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              Error loading profile: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Resume Sync Component */}
        <div className="mb-6">
          <ResumeSync />
        </div>

        {/* Database Backup Info */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Database Backup</h3>
          
          {backupInfo?.backupLocation && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Backup Location:</strong> {backupInfo.backupLocation}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Backups are automatically created before job/lead searches and synced via OneDrive
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Last Backup</p>
              <p className="text-lg font-medium text-gray-900">
                {backupInfo?.lastBackupDate 
                  ? new Date(backupInfo.lastBackupDate).toLocaleString()
                  : 'No backups found'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Backup Size</p>
              <p className="text-lg font-medium text-gray-900">
                {backupInfo?.lastBackupSize 
                  ? `${(backupInfo.lastBackupSize / 1024 / 1024).toFixed(2)} MB`
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Backups</p>
              <p className="text-lg font-medium text-gray-900">
                {backupInfo?.backupCount || 0}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              {backupInfo?.lastBackupName && (
                <p className="text-sm text-gray-500">
                  Latest: {backupInfo.lastBackupName}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Retention: 7 days (automatic cleanup)
              </p>
            </div>
            <button
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createBackupMutation.isPending ? 'Creating...' : 'Create Backup Now'}
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">User Profile</h3>
          <p className="text-sm text-gray-600 mb-6">
            This information will be used to automatically fill out job application forms.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    defaultValue={profile?.full_name || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={profile?.email || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    defaultValue={profile?.first_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    defaultValue={profile?.last_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    defaultValue={profile?.phone || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1-555-123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    defaultValue={profile?.city || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Professional Information</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="linkedin_profile" className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    id="linkedin_profile"
                    name="linkedin_profile"
                    defaultValue={profile?.linkedin_profile || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div>
                  <label htmlFor="profile_summary" className="block text-sm font-medium text-gray-700 mb-1">
                    Professional Summary
                  </label>
                  <textarea
                    id="profile_summary"
                    name="profile_summary"
                    rows={4}
                    defaultValue={profile?.profile_summary || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief professional summary (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Work Authorization */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Work Authorization</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="work_authorization" className="block text-sm font-medium text-gray-700 mb-1">
                    Work Authorization Status
                  </label>
                  <select
                    id="work_authorization"
                    name="work_authorization"
                    defaultValue={profile?.work_authorization || 'Citizen'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Citizen">Citizen</option>
                    <option value="Green Card">Green Card</option>
                    <option value="H1B">H1B</option>
                    <option value="EAD">EAD</option>
                    <option value="OPT">OPT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="requires_sponsorship" className="block text-sm font-medium text-gray-700 mb-1">
                    Requires Sponsorship
                  </label>
                  <select
                    id="requires_sponsorship"
                    name="requires_sponsorship"
                    defaultValue={profile?.requires_sponsorship || 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Now">Now</option>
                    <option value="In the future">In the future</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>

          {/* Metadata */}
          {profile?.created_at && (
            <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-500">
              <p>Created: {new Date(profile.created_at + (profile.created_at.includes('Z') ? '' : 'Z')).toLocaleString()}</p>
              {profile.updated_at && profile.updated_at !== profile.created_at && (
                <p>Last updated: {new Date(profile.updated_at + (profile.updated_at.includes('Z') ? '' : 'Z')).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

