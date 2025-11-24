import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon } from './Icon';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { FAST_REFRESH_INTERVAL_MS } from '../constants/timing';
import { extractErrorMessage } from '../utils/error-helpers';

interface NetworkContact {
  id: string;
  linkedin_id: string;
  profile_url: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  worked_together?: string;
  first_contacted_at?: string;
  last_contacted_at?: string;
  message_count: number;
  last_message_status: 'never' | 'sent' | 'replied' | 'error';
  last_error?: string;
  created_at?: string;
  updated_at?: string;
}

interface NetworkMessage {
  id: string;
  contact_id: string;
  message_template: string;
  message_sent: string;
  status: 'sent' | 'replied' | 'error';
  error_message?: string;
  sent_at?: string;
}

export function NetworkMessagingPage() {
  const defaultTemplate = `{{firstName}}, I'm putting together a few reviews from people familiar with my work. If you have a moment, would you mind sharing a short review about the software I build and my work ethic?

And if you'd like to see one of my current projects, you're welcome to test-drive Sunny — your friendly agent for quick systems analysis. You can sign in with Google here: https://vsol.ngrok.app/

Review link: https://www.thumbtack.com/reviews/services/564457491884556302/write`;

  const [messageTemplate, setMessageTemplate] = useState(defaultTemplate);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showUnmessagedOnly, setShowUnmessagedOnly] = useState(false);
  const [previewContact, setPreviewContact] = useState<NetworkContact | null>(null);
  const [previewRenderedMessage, setPreviewRenderedMessage] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPlaceholderGuide, setShowPlaceholderGuide] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [startPage, setStartPage] = useState<number>(1);

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved message template on mount
  const { data: templateData } = useQuery({
    queryKey: ['network-messaging-template'],
    queryFn: async () => {
      const response = await api.get('/network-messaging/message-template');
      return response.data;
    },
  });

  useEffect(() => {
    if (templateData?.template) {
      setMessageTemplate(templateData.template);
    }
  }, [templateData]);

  // Save message template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: string) => {
      await api.put('/network-messaging/message-template', { template });
    },
    onError: (err: unknown) => {
      // Silently fail - don't show error toast for auto-save
      console.error('Failed to save message template:', err);
    },
  });

  // Auto-save template when it changes (debounced)
  useEffect(() => {
    // Don't save on initial mount before template is loaded
    if (!templateData) {
      return;
    }

    // Don't save if template hasn't changed from loaded value
    if (messageTemplate === templateData.template) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      saveTemplateMutation.mutate(messageTemplate);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messageTemplate, templateData]);

  // Fetch network contacts
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['network-contacts', showUnmessagedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('workedTogether', 'true');
      params.set('location', 'USA');
      if (showUnmessagedOnly) {
        params.set('messaged', 'false');
      }
      const response = await api.get(`/network-messaging/contacts?${params.toString()}`);
      return response.data;
    },
    refetchInterval: FAST_REFRESH_INTERVAL_MS,
  });

  const contacts: NetworkContact[] = contactsData?.contacts || [];
  const eligibleContacts = contacts.filter(c => showUnmessagedOnly ? c.last_message_status === 'never' : true);

  // Refresh contacts mutation
  const refreshMutation = useMutation({
    mutationFn: async ({ maxContacts, startPage }: { maxContacts: number; startPage: number }) => {
      setIsRefreshing(true);
      const response = await api.post('/network-messaging/refresh', { maxContacts, startPage });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['network-contacts'] });
      success(`Refreshed contacts: ${data.contactsAdded} new contacts added`);
      setIsRefreshing(false);
    },
    onError: (err: unknown) => {
      const errorMessage = extractErrorMessage(err, 'Failed to refresh contacts');
      error(errorMessage);
      setIsRefreshing(false);
    },
  });

  // Send messages mutation
  const sendMutation = useMutation({
    mutationFn: async ({ contactIds, template }: { contactIds: string[]; template: string }) => {
      setIsSending(true);
      const response = await api.post('/network-messaging/send', {
        contactIds,
        messageTemplate: template,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['network-contacts'] });
      setSelectedContactIds(new Set());
      if (data.failed === 0) {
        success(`Successfully sent ${data.sent} messages`);
      } else {
        success(`Sent ${data.sent} messages, ${data.failed} failed`);
        if (data.errors && data.errors.length > 0) {
          console.error('Send errors:', data.errors);
        }
      }
      setIsSending(false);
    },
    onError: (err: unknown) => {
      const errorMessage = extractErrorMessage(err, 'Failed to send messages');
      error(errorMessage);
      setIsSending(false);
    },
  });

  // Dry run mutation
  const dryRunMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      setIsDryRunning(true);
      const response = await api.post('/network-messaging/dry-run', {
        contactIds,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.failed === 0) {
        success(`Dry run completed: ${data.passed} contacts passed, ${data.tested} tested`);
      } else {
        success(`Dry run completed: ${data.passed} passed, ${data.failed} failed out of ${data.tested} tested`);
        if (data.errors && data.errors.length > 0) {
          console.error('Dry run errors:', data.errors);
        }
      }
      setIsDryRunning(false);
    },
    onError: (err: unknown) => {
      const errorMessage = extractErrorMessage(err, 'Failed to perform dry run');
      error(errorMessage);
      setIsDryRunning(false);
    },
  });

  const handleRefresh = () => {
    confirm({
      title: 'Refresh Network Contacts',
      message: `This will scrape fresh contacts from LinkedIn starting from page ${startPage}. Continue?`,
      confirmLabel: 'Refresh',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        refreshMutation.mutate({ maxContacts: 1000, startPage });
      },
    });
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedContactIds.size === eligibleContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(eligibleContacts.map(c => c.id)));
    }
  };

  const handleSend = () => {
    if (selectedContactIds.size === 0) {
      error('Please select at least one contact');
      return;
    }

    if (!messageTemplate.trim()) {
      error('Please enter a message template');
      return;
    }

    confirm({
      title: 'Send LinkedIn Messages',
      message: `This will open LinkedIn and send messages to ${selectedContactIds.size} contact(s) through LinkedIn's messaging interface. Continue?`,
      confirmLabel: 'Send via LinkedIn',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        sendMutation.mutate({
          contactIds: Array.from(selectedContactIds),
          template: messageTemplate,
        });
      },
    });
  };

  const handleDryRun = () => {
    if (selectedContactIds.size === 0) {
      error('Please select at least one contact');
      return;
    }

    confirm({
      title: 'Dry Run: Test Message Mechanism',
      message: `This will test the message sending mechanism for ${selectedContactIds.size} contact(s) without actually sending messages. It will navigate to each profile, open the message composer, but will NOT paste the message or click send. Continue?`,
      confirmLabel: 'Run Dry Run',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        dryRunMutation.mutate(Array.from(selectedContactIds));
      },
    });
  };

  const getStatusBadge = (status: NetworkContact['last_message_status']) => {
    const badges = {
      never: { label: 'Never', color: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800' },
      replied: { label: 'Replied', color: 'bg-green-100 text-green-800' },
      error: { label: 'Error', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LinkedIn Network Messaging</h1>
          <p className="text-sm text-gray-600 mt-1">
            Send LinkedIn messages to people in your network who have worked with you (USA only)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Messages are sent directly through LinkedIn's messaging interface
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="startPage" className="text-sm text-gray-700 font-medium">
              Start Page:
            </label>
            <input
              id="startPage"
              type="number"
              min="1"
              value={startPage}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 1) {
                  setStartPage(value);
                }
              }}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isRefreshing}
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon={isRefreshing ? 'progress-activity' : 'refresh'} size={20} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Contacts'}
          </button>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Detection Risk Warning</p>
              <p className="text-yellow-700">
                To reduce LinkedIn detection risk, we recommend processing <strong>10-20 contacts per run</strong> instead of large batches.
                The scraper now includes human-like behaviors (scrolling, reading pauses, variable delays) and no longer visits individual profile pages.
                Large batches may still trigger account warnings. Process in smaller chunks and take breaks between runs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Template Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">LinkedIn Message Template</h2>
            <p className="text-xs text-gray-500 mt-1">This message will be sent through LinkedIn's messaging system</p>
          </div>
          <button
            onClick={() => setShowPlaceholderGuide(!showPlaceholderGuide)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showPlaceholderGuide ? 'Hide' : 'Show'} Placeholder Guide
          </button>
        </div>

        {showPlaceholderGuide && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Available Placeholders:</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><code>{'{{name}}'}</code> - Full name</li>
              <li><code>{'{{firstName}}'}</code> or <code>{'{{first_name}}'}</code> - First name</li>
              <li><code>{'{{lastName}}'}</code> or <code>{'{{last_name}}'}</code> - Last name</li>
              <li><code>{'{{company}}'}</code> - Company name</li>
              <li><code>{'{{title}}'}</code> - Job title</li>
              <li><code>{'{{worked_together}}'}</code> - Where you worked together</li>
              <li><code>{'{{location}}'}</code> - Location</li>
            </ul>
          </div>
        )}

        <textarea
          value={messageTemplate}
          onChange={(e) => setMessageTemplate(e.target.value)}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Enter your message template with placeholders..."
        />
      </div>

      {/* Filters and Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showUnmessagedOnly}
                onChange={(e) => setShowUnmessagedOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show unmessaged only</span>
            </label>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{eligibleContacts.length}</span> eligible contacts
            </div>
          </div>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <div>
              <span className="font-medium">Worked Together:</span> Yes (required)
            </div>
            <div>
              <span className="font-medium">Location:</span> USA (required)
            </div>
          </div>
        </div>

        {/* Contacts List */}
        {contactsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon icon="progress-activity" size={32} className="text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading contacts...</span>
          </div>
        ) : eligibleContacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Icon icon="users" size={48} className="mx-auto mb-3 text-gray-400" />
            <p>No eligible contacts found.</p>
            <p className="text-sm mt-1">Click "Refresh Contacts" to scrape from LinkedIn.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedContactIds.size === eligibleContacts.length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedContactIds.size}</span> selected
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {eligibleContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedContactIds.has(contact.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectContact(contact.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                        {getStatusBadge(contact.last_message_status)}
                      </div>
                      {contact.title && (
                        <p className="text-sm text-gray-600 mt-1">{contact.title}</p>
                      )}
                      {contact.company && (
                        <p className="text-sm text-gray-600">{contact.company}</p>
                      )}
                      {contact.location && (
                        <p className="text-sm text-gray-500 mt-1">{contact.location}</p>
                      )}
                      {contact.worked_together && (
                        <p className="text-sm text-blue-600 mt-1">🤝 {contact.worked_together}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Messages: {contact.message_count}</span>
                        {contact.last_contacted_at && (
                          <span>Last: {formatDate(contact.last_contacted_at)}</span>
                        )}
                      </div>
                      {contact.last_error && (
                        <p className="text-xs text-red-600 mt-1">Error: {contact.last_error}</p>
                      )}
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setPreviewContact(contact);
                        setIsLoadingPreview(true);
                        try {
                          const response = await api.post('/network-messaging/preview', {
                            contactId: contact.id,
                            messageTemplate: messageTemplate,
                          });
                          setPreviewRenderedMessage(response.data.renderedMessage);
                        } catch (err) {
                          console.error('Failed to load preview:', err);
                          // Fallback to manual replacement
                          setPreviewRenderedMessage(
                            messageTemplate
                              .replace(/\{\{name\}\}/gi, contact.name)
                              .replace(/\{\{firstName\}\}/gi, contact.name.split(' ')[0] || contact.name)
                              .replace(/\{\{first_name\}\}/gi, contact.name.split(' ')[0] || contact.name)
                              .replace(/\{\{lastName\}\}/gi, contact.name.split(' ').slice(1).join(' ') || '')
                              .replace(/\{\{last_name\}\}/gi, contact.name.split(' ').slice(1).join(' ') || '')
                              .replace(/\{\{company\}\}/gi, contact.company || '')
                              .replace(/\{\{title\}\}/gi, contact.title || '')
                              .replace(/\{\{worked_together\}\}/gi, contact.worked_together || '')
                              .replace(/\{\{worked together\}\}/gi, contact.worked_together || '')
                              .replace(/\{\{location\}\}/gi, contact.location || '')
                          );
                        } finally {
                          setIsLoadingPreview(false);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            {eligibleContacts.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{selectedContactIds.size}</span> contact{selectedContactIds.size !== 1 ? 's' : ''} selected
                    {selectedContactIds.size === 0 && (
                      <span className="ml-2 text-gray-500">(select contacts above to enable actions)</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDryRun}
                    disabled={selectedContactIds.size === 0 || isDryRunning || isSending}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={selectedContactIds.size === 0 ? 'Select at least one contact to run a dry run' : 'Test the message mechanism without sending'}
                  >
                    {isDryRunning ? (
                      <>
                        <Icon icon="progress-activity" size={20} className="animate-spin" />
                        Running Dry Run...
                      </>
                    ) : (
                      <>
                        <Icon icon="play-arrow" size={20} />
                        Dry Run ({selectedContactIds.size})
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={selectedContactIds.size === 0 || isSending || isDryRunning || !messageTemplate.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={selectedContactIds.size === 0 ? 'Select at least one contact to send messages' : 'Send messages via LinkedIn'}
                  >
                    {isSending ? (
                      <>
                        <Icon icon="progress-activity" size={20} className="animate-spin" />
                        Sending LinkedIn Messages...
                      </>
                    ) : (
                      <>
                        <Icon icon="send" size={20} />
                        Send LinkedIn Messages ({selectedContactIds.size})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Message Preview</h2>
              <button
                onClick={() => {
                  setPreviewContact(null);
                  setPreviewRenderedMessage('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="close" size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">To: {previewContact.name}</h3>
                {previewContact.title && <p className="text-sm text-gray-600">{previewContact.title}</p>}
                {previewContact.company && <p className="text-sm text-gray-600">{previewContact.company}</p>}
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                  {isLoadingPreview ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Icon icon="progress-activity" size={16} className="animate-spin" />
                      Loading preview...
                    </div>
                  ) : (
                    previewRenderedMessage || 'No preview available'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

