import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { EmailContent, createMailtoLink, generateOutreachEmail } from '../../../ai/email-templates';

interface Lead {
  id: string;
  name: string;
  title?: string;
  company?: string;
  about?: string;
  email?: string;
  worked_together?: string;
}

interface EmailPreviewModalProps {
  emails: EmailContent[];
  leads: Lead[];
  onClose: () => void;
}

export function EmailPreviewModal({ emails: initialEmails, leads, onClose }: EmailPreviewModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [referralEnabled, setReferralEnabled] = useState<Map<number, boolean>>(new Map());

  // Regenerate emails when referral preferences change
  const emails = useMemo(() => {
    return leads.map((lead, index) => {
      const includeReferral = referralEnabled.get(index) ?? false;
      return generateOutreachEmail(lead, includeReferral);
    });
  }, [leads, referralEnabled]);

  const handleToggleReferral = (index: number) => {
    setReferralEnabled(prev => {
      const newMap = new Map(prev);
      newMap.set(index, !prev.get(index));
      return newMap;
    });
  };

  const handleCopyToClipboard = async (email: EmailContent, index: number) => {
    const fullEmail = `To: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`;
    
    try {
      await navigator.clipboard.writeText(fullEmail);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleOpenEmailClient = (email: EmailContent) => {
    const mailtoLink = createMailtoLink(email);
    window.location.href = mailtoLink;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon icon="email" size={24} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Generated Outreach Emails</h2>
              <p className="text-sm text-gray-600">{emails.length} email{emails.length !== 1 ? 's' : ''} ready to send</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <Icon icon="close" size={24} />
          </button>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {emails.map((email, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              {/* Email Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="person" size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{email.to}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon icon="subject" size={16} className="text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-700">{email.subject}</span>
                  </div>
                </div>
              </div>

              {/* Email Body Preview */}
              <div className="bg-gray-50 rounded p-3 mb-3">
                <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono text-xs max-h-32 overflow-y-auto">
                  {email.body.substring(0, 300)}
                  {email.body.length > 300 && '...'}
                </div>
              </div>

              {/* Referral Program Checkbox */}
              <div className="mb-3 flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={referralEnabled.get(index) ?? false}
                    onChange={() => handleToggleReferral(index)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include Referral Program
                  </span>
                </label>
                {referralEnabled.get(index) && email.referralLink && (
                  <span className="ml-3 text-xs text-gray-500">
                    Link: {email.referralLink.substring(0, 40)}...
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEmailClient(email)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Icon icon="open_in_new" size={18} />
                  <span>Open in Email Client</span>
                </button>
                <button
                  onClick={() => handleCopyToClipboard(email, index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    copiedIndex === index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon icon={copiedIndex === index ? 'check' : 'content_copy'} size={18} />
                  <span>{copiedIndex === index ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <Icon icon="info" size={16} className="inline mr-1" />
              Click "Open in Email Client" to compose each email in your default email application
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

