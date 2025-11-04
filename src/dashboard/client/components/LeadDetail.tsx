import React, { useState } from 'react';
import { Icon } from './Icon';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface Lead {
  id: string;
  name: string;
  title?: string;
  company?: string;
  about?: string;
  email?: string;
  location?: string;
  profile_url: string;
  linkedin_id?: string;
  worked_together?: string;
  articles?: string; // JSON array of article URLs
  scraped_at?: string;
  created_at?: string;
  deleted_at?: string;
}

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
}

export function LeadDetail({ lead, onClose }: LeadDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${lead.name}? This lead will not be re-added in future scrapes.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/leads/${lead.id}`);
      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      onClose();
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <Icon icon="close" size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title and Company */}
          <div className="space-y-3">
            {lead.title && (
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Title</label>
                <p className="mt-1 text-lg text-gray-900">{lead.title}</p>
              </div>
            )}

            {lead.company && (
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Company</label>
                <p className="mt-1 text-lg text-gray-900">{lead.company}</p>
              </div>
            )}

            {lead.location && (
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Location</label>
                <p className="mt-1 text-lg text-gray-900 flex items-center gap-2">
                  <Icon icon="place" size={20} className="text-gray-500" />
                  {lead.location}
                </p>
              </div>
            )}

            {lead.worked_together && (
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Worked Together</label>
                <p className="mt-1 text-lg text-gray-900 flex items-center gap-2">
                  <Icon icon="users" size={20} className="text-blue-500" />
                  {lead.worked_together}
                </p>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Contact Information</h3>
            
            {lead.email ? (
              <div className="flex items-center gap-3">
                <Icon icon="email" size={20} className="text-green-500" />
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:text-blue-800">
                  {lead.email}
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-gray-500">
                <Icon icon="email" size={20} className="text-gray-400" />
                <span>No email available</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Icon icon="link" size={20} className="text-blue-500" />
              <a
                href={lead.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View LinkedIn Profile
                <Icon icon="open-in-new" size={16} />
              </a>
            </div>
          </div>

          {/* About Section */}
          {lead.about && (
            <div>
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">About</label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">{lead.about}</p>
              </div>
            </div>
          )}

          {/* Articles Section */}
          {lead.articles && (() => {
            try {
              const articleUrls = JSON.parse(lead.articles) as string[];
              if (articleUrls.length > 0) {
                return (
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      Published Articles ({articleUrls.length})
                    </label>
                    <div className="mt-2 space-y-2">
                      {articleUrls.map((url, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                          >
                            <Icon icon="article" size={18} className="text-gray-500" />
                            <span className="flex-1 break-all">
                              {url.split('/').pop() || url}
                            </span>
                            <Icon icon="open-in-new" size={16} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            } catch (error) {
              // Invalid JSON, skip rendering
            }
            return null;
          })()}

          {/* Profile Information */}
          {lead.linkedin_id && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-gray-900">Profile Information</h3>
              <div className="grid grid-cols-1 gap-3 text-gray-600">
                <div>
                  <span className="font-medium">LinkedIn ID:</span>{' '}
                  <span className="text-gray-900 font-mono">{lead.linkedin_id}</span>
                </div>
                <div>
                  <span className="font-medium">Profile Added:</span>{' '}
                  {formatDate(lead.created_at)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon icon="delete" size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Lead'}
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <a
              href={lead.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Open LinkedIn
              <Icon icon="open-in-new" size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

