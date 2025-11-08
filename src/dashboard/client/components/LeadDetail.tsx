import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useGenerateBackground } from '../hooks/useGenerateBackground';
import { generateOutreachEmail, createMailtoLink, generateHtmlEmail, EmailContent } from '../../../ai/email-templates';
import { useToastContext } from '../contexts/ToastContext';

interface Lead {
  id: string;
  name: string;
  title?: string;
  company?: string;
  about?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  profile_url: string;
  linkedin_id?: string;
  worked_together?: string;
  articles?: string; // JSON array of article URLs
  birthday?: string;
  connected_date?: string;
  address?: string;
  profile?: string;
  background?: string; // AI-generated professional background for email use
  email_status?: 'not_contacted' | 'email_sent' | 'replied' | 'meeting_scheduled' | 'email_bounced';
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
  const [copiedBackground, setCopiedBackground] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(lead.background);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [includeReferral, setIncludeReferral] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<EmailContent | null>(null);
  const [emailStatus, setEmailStatus] = useState<string>(lead.email_status || 'not_contacted');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(lead.email || '');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const queryClient = useQueryClient();
  const generateBackground = useGenerateBackground();
  const { showToast } = useToastContext();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Update local state when lead prop changes
  useEffect(() => {
    setCurrentBackground(lead.background);
  }, [lead.background]);

  // Auto-generate background on mount if it's empty
  useEffect(() => {
    if (!lead.background && (lead.title || lead.about)) {
      generateBackground.mutate(lead.id, {
        onSuccess: (generatedBackground) => {
          // Update local state immediately with the generated background
          setCurrentBackground(generatedBackground);
        },
        onError: (error: any) => {
          console.error('Auto-generate background failed:', error);
          // Silently fail on auto-generation to avoid annoying the user on page load
          // They can manually retry if needed
        },
      });
    }
  }, [lead.id]);

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
      showToast('error', 'Failed to delete lead. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleGenerateBackground = () => {
    generateBackground.mutate(lead.id, {
      onSuccess: (generatedBackground) => {
        // Update local state immediately with the generated background
        setCurrentBackground(generatedBackground);
      },
      onError: (error: any) => {
        console.error('Error generating background:', error);
        const errorMessage = error?.response?.data?.error || error?.message || 'Failed to generate background';
        showToast('error', `Background generation failed: ${errorMessage}`);
      },
    });
  };

  const handleCopyBackground = async () => {
    if (currentBackground) {
      try {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(currentBackground);
          setCopiedBackground(true);
          setTimeout(() => setCopiedBackground(false), 2000);
        } else {
          // Fallback to older method
          const textArea = document.createElement('textarea');
          textArea.value = currentBackground;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          try {
            document.execCommand('copy');
            setCopiedBackground(true);
            setTimeout(() => setCopiedBackground(false), 2000);
          } finally {
            document.body.removeChild(textArea);
          }
        }
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        showToast('error', 'Failed to copy to clipboard. Please try again.');
      }
    }
  };

  const handleGenerateEmail = () => {
    if (!lead.email) {
      showToast('warning', 'This lead does not have an email address.');
      return;
    }

    try {
      // Use current background state (may be different from lead.background if regenerated)
      const leadWithCurrentBackground = { ...lead, background: currentBackground };
      const email = generateOutreachEmail(leadWithCurrentBackground, includeReferral);
      setGeneratedEmail(email);
      setShowEmailSection(true);
    } catch (error) {
      console.error('Error generating email:', error);
      showToast('error', 'Failed to generate email. Please ensure the lead has an email address.');
    }
  };

  const handleToggleReferral = () => {
    const newValue = !includeReferral;
    setIncludeReferral(newValue);
    
    // Regenerate email with new referral setting
    if (lead.email) {
      try {
        // Use current background state (may be different from lead.background if regenerated)
        const leadWithCurrentBackground = { ...lead, background: currentBackground };
        const email = generateOutreachEmail(leadWithCurrentBackground, newValue);
        setGeneratedEmail(email);
      } catch (error) {
        console.error('Error regenerating email:', error);
      }
    }
  };

  const handleCopyEmail = async () => {
    if (!generatedEmail) return;
    
    try {
      // Use current background state (may be different from lead.background if regenerated)
      const leadWithCurrentBackground = { ...lead, background: currentBackground };
      // Generate HTML version (just body content for Gmail compatibility)
      const htmlEmail = generateHtmlEmail(leadWithCurrentBackground, includeReferral);
      // Extract just the body content (Gmail doesn't like full HTML documents)
      const bodyContentMatch = htmlEmail.match(/<body[^>]*>([\s\S]*)<\/body>/);
      const htmlContent = bodyContentMatch ? bodyContentMatch[1] : htmlEmail;
      
      // Plain text version (just body, no To/Subject since those are separate fields)
      const plainTextEmail = generatedEmail.body;
      
      // Try modern clipboard API with HTML support
      if (navigator.clipboard && navigator.clipboard.write) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainTextEmail], { type: 'text/plain' });
        
        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });
        
        await navigator.clipboard.write([clipboardItem]);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Fallback to plain text if HTML copy not supported
        await navigator.clipboard.writeText(plainTextEmail);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        // Legacy fallback
        const textArea = document.createElement('textarea');
        textArea.value = plainTextEmail;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopiedEmail(true);
          setTimeout(() => setCopiedEmail(false), 2000);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Failed to copy email:', error);
      showToast('error', 'Failed to copy to clipboard. Please try again.');
    }
  };

  const handleOpenEmailClient = () => {
    if (generatedEmail) {
      const mailtoLink = createMailtoLink(generatedEmail);
      window.location.href = mailtoLink;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/leads/${lead.id}/status`, { status: newStatus });
      setEmailStatus(newStatus);
      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Error updating lead status:', error);
      showToast('error', 'Failed to update status. Please try again.');
    }
  };

  const handleSaveEmail = async () => {
    if (!editedEmail.trim()) {
      showToast('error', 'Email cannot be empty');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedEmail)) {
      showToast('error', 'Please enter a valid email address');
      return;
    }

    setIsSavingEmail(true);
    try {
      await api.patch(`/leads/${lead.id}/email`, { email: editedEmail });
      lead.email = editedEmail; // Update local lead object
      setIsEditingEmail(false);
      showToast('success', 'Email updated successfully');
      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Error updating lead email:', error);
      showToast('error', 'Failed to update email. Please try again.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleCancelEditEmail = () => {
    setEditedEmail(lead.email || '');
    setIsEditingEmail(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_contacted':
        return 'text-gray-600 bg-gray-100';
      case 'email_sent':
        return 'text-blue-600 bg-blue-100';
      case 'replied':
        return 'text-green-600 bg-green-100';
      case 'meeting_scheduled':
        return 'text-purple-600 bg-purple-100';
      case 'email_bounced':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'not_contacted':
        return 'Not Contacted';
      case 'email_sent':
        return 'Email Sent';
      case 'replied':
        return 'Replied';
      case 'meeting_scheduled':
        return 'Meeting Scheduled';
      case 'email_bounced':
        return 'Email Bounced';
      default:
        return status;
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

            {lead.profile && (
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Profile</label>
                <p className="mt-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                    {lead.profile}
                  </span>
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

          {/* AI-Generated Background for Email */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="auto-fix" size={20} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900">Email Background</h3>
              </div>
              <div className="flex gap-2">
                {generateBackground.isPending ? (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Icon icon="refresh" size={16} className="animate-spin" />
                    Generating...
                  </span>
                ) : currentBackground ? (
                  <>
                    <button
                      onClick={handleCopyBackground}
                      className="px-3 py-1 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-sm flex items-center gap-1 border border-blue-200"
                      title="Copy to clipboard"
                    >
                      <Icon icon={copiedBackground ? "check" : "content-copy"} size={16} />
                      {copiedBackground ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleGenerateBackground}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                    >
                      <Icon icon="refresh" size={16} />
                      Regenerate
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleGenerateBackground}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                  >
                    <Icon icon="auto-fix" size={16} />
                    Generate
                  </button>
                )}
              </div>
            </div>
            
            {generateBackground.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                Failed to generate background. Please try again.
              </div>
            )}
            
            {currentBackground ? (
              <div className="p-3 bg-white rounded-md border border-blue-100">
                <p className="text-gray-900 leading-relaxed">{currentBackground}</p>
              </div>
            ) : !generateBackground.isPending && (
              <div className="p-3 bg-white rounded-md border border-blue-100 text-gray-500 text-sm">
                Click "Generate" to create a professional email introduction based on this person's title and background.
              </div>
            )}
          </div>

          {/* Email Outreach Section */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 space-y-3 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="email" size={20} className="text-green-600" />
                <h3 className="font-semibold text-gray-900">Email Outreach</h3>
              </div>
              {!showEmailSection && (
                <button
                  onClick={handleGenerateEmail}
                  disabled={!lead.email}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title={!lead.email ? 'No email address available' : 'Generate email'}
                >
                  <Icon icon="email" size={16} />
                  Generate Email
                </button>
              )}
            </div>

            {!lead.email && !showEmailSection && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm flex items-center gap-2">
                <Icon icon="warning" size={16} />
                No email address available for this lead
              </div>
            )}

            {showEmailSection && generatedEmail && (
              <div className="space-y-3">
                {/* Email Preview */}
                <div className="bg-white rounded-lg border border-green-100 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Icon icon="person" size={16} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500">To:</span>
                      <p className="text-sm text-gray-900">{generatedEmail.to}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Icon icon="subject" size={16} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500">Subject:</span>
                      <p className="text-sm text-gray-900">{generatedEmail.subject}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">Formatted Email Body:</span>
                      <span className="text-xs text-blue-600">Select text below and copy (Ctrl+C) for best formatting</span>
                    </div>
                    <div 
                      className="mt-1 p-4 bg-white rounded border border-gray-200 text-sm text-gray-900 max-h-96 overflow-y-auto"
                      style={{
                        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
                        fontSize: '12pt',
                        lineHeight: '1.6'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: (() => {
                          const htmlEmail = generateHtmlEmail(lead, includeReferral);
                          const bodyContentMatch = htmlEmail.match(/<body[^>]*>([\s\S]*)<\/body>/);
                          return bodyContentMatch ? bodyContentMatch[1] : generatedEmail.body;
                        })()
                      }}
                    />
                  </div>
                </div>

                {/* Referral Checkbox */}
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeReferral}
                      onChange={handleToggleReferral}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Include Referral Program
                    </span>
                  </label>
                  {includeReferral && generatedEmail.referralLink && (
                    <span className="ml-3 text-xs text-gray-500">
                      Link: {generatedEmail.referralLink.substring(0, 30)}...
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleOpenEmailClient}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      <Icon icon="open_in_new" size={16} />
                      Open in Email Client
                    </button>
                    <button
                      onClick={handleCopyEmail}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm ${
                        copiedEmail
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      <Icon icon={copiedEmail ? 'check' : 'content_copy'} size={16} />
                      {copiedEmail ? 'Copied!' : 'Quick Copy'}
                    </button>
                    <button
                      onClick={() => setShowEmailSection(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm border border-gray-300"
                    >
                      <Icon icon="close" size={16} />
                      Hide
                    </button>
                  </div>
                  <div className="px-1 py-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                    <Icon icon="info" size={14} className="inline mr-1" />
                    <strong>Best practice for Gmail:</strong> Select and copy text directly from the formatted preview above. This preserves all formatting, emojis, and clickable links.
                  </div>
                </div>

                {/* Email Status Tracking */}
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Email Status</h4>
                  
                  <div className="flex items-center gap-3">
                    {/* Current Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(emailStatus)}`}>
                      {getStatusLabel(emailStatus)}
                    </div>

                    {/* Quick Action: Mark as Sent */}
                    {emailStatus === 'not_contacted' && (
                      <button
                        onClick={() => handleStatusChange('email_sent')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Icon icon="send" size={16} />
                        Sent Initial Email
                      </button>
                    )}

                    {/* Status Dropdown */}
                    <select
                      value={emailStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="not_contacted">Not Contacted</option>
                      <option value="email_sent">Email Sent</option>
                      <option value="replied">Replied</option>
                      <option value="meeting_scheduled">Meeting Scheduled</option>
                      <option value="email_bounced">Email Bounced</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Contact Information</h3>
            
            {/* Email Section with Edit Capability */}
            <div className="space-y-2">
              {isEditingEmail ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="email" size={20} className="text-green-500" />
                    <input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={isSavingEmail}
                    />
                  </div>
                  <div className="flex gap-2 ml-8">
                    <button
                      onClick={handleSaveEmail}
                      disabled={isSavingEmail}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Icon icon={isSavingEmail ? "refresh" : "check"} size={16} className={isSavingEmail ? "animate-spin" : ""} />
                      {isSavingEmail ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEditEmail}
                      disabled={isSavingEmail}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm flex items-center gap-1 disabled:cursor-not-allowed"
                    >
                      <Icon icon="close" size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : lead.email ? (
                <div className="flex items-center gap-3">
                  <Icon icon="email" size={20} className="text-green-500" />
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:text-blue-800 flex-1">
                    {lead.email}
                  </a>
                  <button
                    onClick={() => setIsEditingEmail(true)}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs flex items-center gap-1"
                    title="Edit email"
                  >
                    <Icon icon="edit" size={14} />
                    Edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Icon icon="email" size={20} className="text-gray-400" />
                  <span className="text-gray-500 flex-1">No email available</span>
                  <button
                    onClick={() => setIsEditingEmail(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                    title="Add email"
                  >
                    <Icon icon="add" size={16} />
                    Add Email
                  </button>
                </div>
              )}
            </div>

            {lead.phone && (
              <div className="flex items-center gap-3">
                <Icon icon="phone" size={20} className="text-blue-500" />
                <a href={`tel:${lead.phone.replace(/[^0-9]/g, '')}`} className="text-blue-600 hover:text-blue-800">
                  {lead.phone}
                </a>
              </div>
            )}

            {lead.website && (
              <div className="flex items-center gap-3">
                <Icon icon="language" size={20} className="text-purple-500" />
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {lead.website}
                  <Icon icon="open-in-new" size={16} />
                </a>
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

            {lead.address && (
              <div className="flex items-center gap-3">
                <Icon icon="place" size={20} className="text-orange-500" />
                <span className="text-gray-900">{lead.address}</span>
              </div>
            )}

            {lead.birthday && (
              <div className="flex items-center gap-3">
                <Icon icon="cake" size={20} className="text-pink-500" />
                <span className="text-gray-900">Birthday: {lead.birthday}</span>
              </div>
            )}

            {lead.connected_date && (
              <div className="flex items-center gap-3">
                <Icon icon="people" size={20} className="text-blue-500" />
                <span className="text-gray-900">Connected: {lead.connected_date}</span>
              </div>
            )}
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

