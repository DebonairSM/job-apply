import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon } from './Icon';
import { useToastContext } from '../contexts/ToastContext';
import { extractErrorMessage } from '../utils/error-helpers';
import { FAST_REFRESH_INTERVAL_MS } from '../constants/timing';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  subject_template: string;
  body_template: string;
  static_placeholders?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

interface CampaignFormData {
  name: string;
  description: string;
  subject_template: string;
  body_template: string;
  product_name: string;
  demo_name: string;
  demo_link: string;
  call_to_action: string;
  calendly_link: string;
  referral_base_url: string;
  status: 'active' | 'inactive';
}

export function CampaignsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showPlaceholderGuide, setShowPlaceholderGuide] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const response = await api.get('/campaigns');
      return response.data as Campaign[];
    },
    refetchInterval: FAST_REFRESH_INTERVAL_MS
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      showToast('success', 'Campaign deleted successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = extractErrorMessage(error, 'Failed to delete campaign');
      showToast('error', errorMessage);
    }
  });

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowModal(true);
  };

  const handleDelete = (campaign: Campaign) => {
    if (window.confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      deleteMutation.mutate(campaign.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCampaign(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="arrow_back" size={20} />
            <span>Back to Leads</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-semibold"
        >
          <Icon icon="add" size={24} />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold">Campaigns ({campaigns.length})</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No campaigns yet. Create your first campaign to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 max-w-md truncate">
                        {campaign.description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(campaign.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(campaign)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Edit campaign"
                        >
                          <Icon icon="edit" size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(campaign)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Delete campaign"
                        >
                          <Icon icon="delete" size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Form Modal */}
      {showModal && (
        <CampaignFormModal
          campaign={editingCampaign}
          onClose={handleCloseModal}
          showPlaceholderGuide={showPlaceholderGuide}
          onTogglePlaceholderGuide={() => setShowPlaceholderGuide(!showPlaceholderGuide)}
        />
      )}
    </div>
  );
}

interface CampaignFormModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  showPlaceholderGuide: boolean;
  onTogglePlaceholderGuide: () => void;
}

function CampaignFormModal({ campaign, onClose, showPlaceholderGuide, onTogglePlaceholderGuide }: CampaignFormModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  
  // Parse existing campaign data
  const existingPlaceholders = campaign?.static_placeholders 
    ? JSON.parse(campaign.static_placeholders) 
    : {};

  const [formData, setFormData] = useState<CampaignFormData>({
    name: campaign?.name || '',
    description: campaign?.description || '',
    subject_template: campaign?.subject_template || '',
    body_template: campaign?.body_template || '',
    product_name: existingPlaceholders.product_name || '',
    demo_name: existingPlaceholders.demo_name || '',
    demo_link: existingPlaceholders.demo_link || '',
    call_to_action: existingPlaceholders.call_to_action || '',
    calendly_link: existingPlaceholders.calendly_link || '',
    referral_base_url: existingPlaceholders.referral_base_url || '',
    status: campaign?.status || 'active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const staticPlaceholders = JSON.stringify({
        product_name: data.product_name || undefined,
        demo_name: data.demo_name || undefined,
        demo_link: data.demo_link || undefined,
        call_to_action: data.call_to_action || undefined,
        calendly_link: data.calendly_link || undefined,
        referral_base_url: data.referral_base_url || undefined
      });

      const payload = {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        subject_template: data.subject_template.trim(),
        body_template: data.body_template.trim(),
        static_placeholders: staticPlaceholders,
        status: data.status
      };

      if (campaign) {
        await api.put(`/campaigns/${campaign.id}`, payload);
      } else {
        await api.post('/campaigns', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      showToast('success', campaign ? 'Campaign updated successfully' : 'Campaign created successfully');
      onClose();
    },
    onError: (error: unknown) => {
      const errorMessage = extractErrorMessage(error, 'Failed to save campaign');
      showToast('error', errorMessage);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (!formData.subject_template.trim()) {
      newErrors.subject_template = 'Subject template is required';
    }
    
    if (!formData.body_template.trim()) {
      newErrors.body_template = 'Body template is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    saveMutation.mutate(formData);
  };

  const handleChange = (field: keyof CampaignFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {campaign ? 'Edit Campaign' : 'Create Campaign'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icon icon="close" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Work Automation Outreach"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes about this campaign"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Email Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
              <button
                type="button"
                onClick={onTogglePlaceholderGuide}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Icon icon={showPlaceholderGuide ? "expand_less" : "expand_more"} size={20} />
                <span>Placeholder Guide</span>
              </button>
            </div>

            {showPlaceholderGuide && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-blue-900">Available Placeholders:</p>
                <div className="grid grid-cols-3 gap-2 text-sm text-blue-800">
                  <div>
                    <p className="font-medium">Lead Data:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>{'{{first_name}}, {{last_name}}, {{name}}'}</li>
                      <li>{'{{title}}, {{company}}, {{location}}'}</li>
                      <li>{'{{email}}, {{phone}}, {{website}}'}</li>
                      <li>{'{{background}} (AI-generated)'}</li>
                      <li>{'{{worked_together}}, {{about}}'}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Static (configured below):</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>{'{{product_name}}'}</li>
                      <li>{'{{demo_name}}'}</li>
                      <li>{'{{demo_link}}'}</li>
                      <li>{'{{call_to_action}}'}</li>
                      <li>{'{{calendly_link}}'}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Computed:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>{'{{referral_link}} (full URL)'}</li>
                      <li>{'{{encoded_referral_code}} (code only)'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Template <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject_template}
                onChange={(e) => handleChange('subject_template', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.subject_template ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Quick question for {{first_name}}"
              />
              {errors.subject_template && <p className="mt-1 text-sm text-red-500">{errors.subject_template}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body Template <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.body_template}
                onChange={(e) => handleChange('body_template', e.target.value)}
                rows={12}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                  errors.body_template ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Hi {{first_name}},&#10;&#10;I built the {{product_name}}..."
              />
              {errors.body_template && <p className="mt-1 text-sm text-red-500">{errors.body_template}</p>}
            </div>
          </div>

          {/* Static Placeholders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Static Placeholders</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => handleChange('product_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Work Automation Platform"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Demo Name
                </label>
                <input
                  type="text"
                  value={formData.demo_name}
                  onChange={(e) => handleChange('demo_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., AI Systems Analyst"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Demo Link
                </label>
                <input
                  type="url"
                  value={formData.demo_link}
                  onChange={(e) => handleChange('demo_link', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., https://example.com/demo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendly Link
                </label>
                <input
                  type="url"
                  value={formData.calendly_link}
                  onChange={(e) => handleChange('calendly_link', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., https://calendly.com/..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call to Action
                </label>
                <input
                  type="text"
                  value={formData.call_to_action}
                  onChange={(e) => handleChange('call_to_action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., let me know if you'd like to see a demo"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referral Base URL
                </label>
                <input
                  type="url"
                  value={formData.referral_base_url}
                  onChange={(e) => handleChange('referral_base_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., https://example.com/referral?ref="
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used to generate personalized referral links with encoded lead information
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

