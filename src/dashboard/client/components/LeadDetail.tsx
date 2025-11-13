import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { api } from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGenerateBackground } from '../hooks/useGenerateBackground';
import { generateOutreachEmail, createMailtoLink, generateHtmlEmail, EmailContent } from '../../../ai/email-templates';
import { useToast } from '../contexts/ToastContext';
import { TOAST_DURATION_MS } from '../constants/timing';
import { extractErrorMessage } from '../utils/error-helpers';

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

interface RenderedEmail {
  subject: string;
  body: string;
  placeholders_used: Record<string, string>;
}

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
}

export function LeadDetail({ lead, onClose }: LeadDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'outreach' | 'details'>('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedBackground, setCopiedBackground] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(lead.background);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [includeReferral, setIncludeReferral] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<EmailContent | null>(null);
  const [emailStatus, setEmailStatus] = useState<string>(lead.email_status || 'not_contacted');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(lead.email || '');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  // Load persisted campaign selection and referral preference from localStorage
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
    return localStorage.getItem('lastSelectedCampaignId') || '';
  });
  const [renderedCampaign, setRenderedCampaign] = useState<RenderedEmail | null>(null);
  const [originalCampaignBody, setOriginalCampaignBody] = useState<string>(''); // Store original body for toggle
  const [isRenderingCampaign, setIsRenderingCampaign] = useState(false);
  const [includeCampaignReferral, setIncludeCampaignReferral] = useState<boolean>(() => {
    const stored = localStorage.getItem('includeCampaignReferral');
    return stored !== null ? stored === 'true' : true;
  });
  const queryClient = useQueryClient();
  const generateBackground = useGenerateBackground();
  const { success, error, warning } = useToast();
  
  // Debounce timer for email status updates
  const statusUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active campaigns
  const { data: activeCampaigns = [] } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: async () => {
      const response = await api.get('/campaigns/active');
      return response.data as Campaign[];
    }
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Update local state when lead prop changes
  useEffect(() => {
    setCurrentBackground(lead.background);
    setEmailStatus(lead.email_status || 'not_contacted');
  }, [lead.id]);

  // Auto-generate background on mount if it's empty
  useEffect(() => {
    if (!lead.background && (lead.title || lead.about)) {
      generateBackground.mutate(lead.id, {
        onSuccess: (generatedBackground) => {
          // Update local state immediately with the generated background
          setCurrentBackground(generatedBackground);
        },
        onError: (error: unknown) => {
          console.error('Auto-generate background failed:', error);
          // Silently fail on auto-generation to avoid annoying the user on page load
          // They can manually retry if needed
        },
      });
    }
  }, [lead.id]);

  // Auto-generate email when background becomes available (for immediate display on first open)
  // BUT: Don't auto-generate if a campaign is selected (campaigns take precedence)
  useEffect(() => {
    if (lead.email && currentBackground && !generatedEmail && activeTab === 'outreach' && !selectedCampaignId) {
      console.log('🤖 Auto-generating non-campaign email');
      try {
        const leadWithCurrentBackground = { ...lead, background: currentBackground };
        const email = generateOutreachEmail(leadWithCurrentBackground, includeReferral);
        setGeneratedEmail(email);
        setShowEmailSection(true); // Show email section automatically
      } catch (error) {
        console.error('Error auto-generating email:', error);
      }
    }
  }, [currentBackground, activeTab, selectedCampaignId]); // Run when background is available or when switching to outreach tab

  // Regenerate email when background changes (if email section is already shown)
  // BUT: Don't regenerate if a campaign is selected (campaigns take precedence)
  useEffect(() => {
    if (showEmailSection && lead.email && currentBackground !== lead.background && !selectedCampaignId) {
      console.log('🔄 Regenerating non-campaign email after background change');
      try {
        const leadWithCurrentBackground = { ...lead, background: currentBackground };
        const email = generateOutreachEmail(leadWithCurrentBackground, includeReferral);
        setGeneratedEmail(email);
      } catch (error) {
        console.error('Error regenerating email after background change:', error);
      }
    }
  }, [currentBackground, showEmailSection, selectedCampaignId]);

  // Auto-load campaign when component mounts or lead changes if campaign is selected
  useEffect(() => {
    if (selectedCampaignId && lead.email && activeTab === 'outreach') {
      renderCampaignForLead(selectedCampaignId);
    }
  }, [lead.id, activeTab]); // Run when lead changes or when switching to outreach tab

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
      error('Failed to delete lead. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleGenerateBackground = () => {
    generateBackground.mutate(lead.id, {
      onSuccess: (generatedBackground) => {
        // Update local state immediately with the generated background
        setCurrentBackground(generatedBackground);
      },
      onError: (err: unknown) => {
        console.error('Error generating background:', err);
        const errorMessage = extractErrorMessage(err, 'Failed to generate background');
        error(`Background generation failed: ${errorMessage}`);
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
          setTimeout(() => setCopiedBackground(false), TOAST_DURATION_MS);
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
            setTimeout(() => setCopiedBackground(false), TOAST_DURATION_MS);
          } finally {
            document.body.removeChild(textArea);
          }
        }
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        error('Failed to copy to clipboard. Please try again.');
      }
    }
  };

  const handleGenerateEmail = () => {
    if (!lead.email) {
      warning('This lead does not have an email address.');
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
      error('Failed to generate email. Please ensure the lead has an email address.');
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
      // Determine HTML content based on whether this is a campaign email or not
      let htmlContent: string;
      
      if (renderedCampaign) {
        // Campaign emails: convert text body to HTML
        htmlContent = convertTextToHtml(generatedEmail.body);
      } else {
        // Non-campaign emails: generate HTML from lead background
        const leadWithCurrentBackground = { ...lead, background: currentBackground };
        const htmlEmail = generateHtmlEmail(leadWithCurrentBackground, includeReferral);
        const bodyContentMatch = htmlEmail.match(/<body[^>]*>([\s\S]*)<\/body>/);
        htmlContent = bodyContentMatch ? bodyContentMatch[1] : htmlEmail;
      }
      
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
        setTimeout(() => setCopiedEmail(false), TOAST_DURATION_MS);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Fallback to plain text if HTML copy not supported
        await navigator.clipboard.writeText(plainTextEmail);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), TOAST_DURATION_MS);
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
          setTimeout(() => setCopiedEmail(false), TOAST_DURATION_MS);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Failed to copy email:', err);
      error('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleCopyToField = async () => {
    if (!generatedEmail?.to) return;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedEmail.to);
        success('Email address copied to clipboard!');
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = generatedEmail.to;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          success('Email address copied to clipboard!');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      error('Failed to copy email address. Please try again.');
    }
  };

  const handleCopySubject = async () => {
    if (!generatedEmail?.subject) return;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedEmail.subject);
        success('Subject copied to clipboard!');
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = generatedEmail.subject;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          success('Subject copied to clipboard!');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      error('Failed to copy subject. Please try again.');
    }
  };

  const handleEmailBodyClick = async () => {
    if (!generatedEmail) return;
    
    // Copy the email
    await handleCopyEmail();
    
    success('Email copied to clipboard!');
  };

  const handleOpenEmailClient = () => {
    if (generatedEmail) {
      const mailtoLink = createMailtoLink(generatedEmail);
      window.location.href = mailtoLink;
    }
  };

  // Debounced status update effect - waits 1 second before saving to database
  useEffect(() => {
    // Clear any existing timer
    if (statusUpdateTimerRef.current) {
      clearTimeout(statusUpdateTimerRef.current);
    }
    
    // Don't trigger on initial mount - only when status actually changes
    if (emailStatus === lead.email_status) {
      return;
    }
    
    // Set a new timer to update the database after 1 second
    statusUpdateTimerRef.current = setTimeout(async () => {
      try {
        await api.patch(`/leads/${lead.id}/status`, { status: emailStatus });
        // Don't invalidate queries here to avoid refetch loop
        // The dashboard auto-refreshes every 5 seconds and will pick up the change
        success('Status updated successfully');
      } catch (error) {
        console.error('Error updating lead status:', error);
        error('Failed to update status. Please try again.');
        // Revert to original status on error
        setEmailStatus(lead.email_status || 'not_contacted');
      }
    }, 1000);
    
    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (statusUpdateTimerRef.current) {
        clearTimeout(statusUpdateTimerRef.current);
      }
    };
  }, [emailStatus, lead.email_status, lead.id, success, error]);
  
  // Cycle to next status when clicking on the status badge
  const handleCycleStatus = () => {
    const statusOrder: Array<'not_contacted' | 'email_sent' | 'replied' | 'meeting_scheduled' | 'email_bounced'> = [
      'not_contacted',
      'email_sent',
      'replied',
      'meeting_scheduled',
      'email_bounced'
    ];
    
    const currentIndex = statusOrder.indexOf(emailStatus as any);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    setEmailStatus(statusOrder[nextIndex]);
  };

  const handleStatusChange = async (newStatus: string) => {
    setEmailStatus(newStatus);
    // The debounced effect will handle the actual API call
  };

  const handleSaveEmail = async () => {
    if (!editedEmail.trim()) {
      error('Email cannot be empty');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedEmail)) {
      error('Please enter a valid email address');
      return;
    }

    setIsSavingEmail(true);
    try {
      await api.patch(`/leads/${lead.id}/email`, { email: editedEmail });
      setIsEditingEmail(false);
      success('Email updated successfully');
      // Don't invalidate queries here to avoid refetch issues
      // The dashboard auto-refreshes every 5 seconds and will pick up the change
    } catch (error) {
      console.error('Error updating lead email:', error);
      error('Failed to update email. Please try again.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleCancelEditEmail = () => {
    setEditedEmail(lead.email || '');
    setIsEditingEmail(false);
  };

  // Render campaign for the current lead
  const renderCampaignForLead = async (campaignId: string) => {
    if (!campaignId) {
      console.log('⚠️ renderCampaignForLead called with empty campaignId');
      return;
    }

    console.log('🚀 Starting renderCampaignForLead:', campaignId);
    setIsRenderingCampaign(true);
    try {
      console.log('📡 Making API call to /campaigns/' + campaignId + '/render/' + lead.id);
      const response = await api.post(`/campaigns/${campaignId}/render/${lead.id}`);
      const campaignData = response.data as RenderedEmail;
      
      console.log('✅ Received campaign data:', {
        subject: campaignData.subject?.substring(0, 50),
        bodyLength: campaignData.body?.length,
        placeholders: Object.keys(campaignData.placeholders_used || {})
      });
      
      // Store original body for toggle functionality
      setOriginalCampaignBody(campaignData.body);
      
      // Apply referral filter if needed
      const filteredBody = includeCampaignReferral ? campaignData.body : removeReferralSection(campaignData.body);
      const filteredCampaignData = {
        ...campaignData,
        body: filteredBody
      };
      
      console.log('📝 Setting rendered campaign state');
      setRenderedCampaign(filteredCampaignData);
      
      // Auto-fill Email Outreach section
      console.log('📧 Setting generated email state');
      setGeneratedEmail({
        to: lead.email || '',
        subject: filteredCampaignData.subject,
        body: filteredBody
      });
      setShowEmailSection(true);
      console.log('✅ Campaign rendering complete');
    } catch (error: unknown) {
      console.error('❌ Error rendering campaign:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to render campaign');
      error(errorMessage);
    } finally {
      setIsRenderingCampaign(false);
    }
  };
  
  // Helper function to remove referral section from campaign body
  const removeReferralSection = (body: string): string => {
    // Remove P.S. referral section (common patterns)
    const patterns = [
      /P\.S\..+?referral.+?(?=\n\n|Best regards|—|$)/gis,
      /\n\nIf you're not the right person.+?referral.+?(?=\n\n|Best regards|—|$)/gis,
      /\n\nP\.S\..+?👉.+?(?=\n\n|Best regards|—|$)/gis
    ];
    
    let result = body;
    for (const pattern of patterns) {
      result = result.replace(pattern, '');
    }
    
    return result.trim();
  };
  
  // Handle campaign selection change with localStorage persistence and auto-render
  const handleCampaignChange = async (campaignId: string) => {
    console.log('🔄 Campaign changed:', campaignId);
    
    // Auto-render campaign if a campaign is selected and lead has email
    if (campaignId && lead.email) {
      console.log('📧 Rendering campaign for lead:', lead.id);
      // Set campaign ID and render in one flow to avoid race conditions
      setSelectedCampaignId(campaignId);
      localStorage.setItem('lastSelectedCampaignId', campaignId);
      await renderCampaignForLead(campaignId);
    } else if (!campaignId) {
      console.log('🗑️ Clearing campaign selection');
      // Update state first, then clear email content
      setSelectedCampaignId(campaignId);
      localStorage.setItem('lastSelectedCampaignId', campaignId);
      // Clear Email Outreach section if campaign is deselected
      setRenderedCampaign(null);
      setOriginalCampaignBody('');
      setShowEmailSection(false);
      setGeneratedEmail(null);
    } else {
      // Just update the ID if we can't render (no email)
      setSelectedCampaignId(campaignId);
      localStorage.setItem('lastSelectedCampaignId', campaignId);
    }
  };
  
  // Handle referral checkbox change with localStorage persistence
  const handleToggleCampaignReferral = async () => {
    const newValue = !includeCampaignReferral;
    setIncludeCampaignReferral(newValue);
    localStorage.setItem('includeCampaignReferral', newValue.toString());
    
    // Re-render campaign with new referral setting if a campaign is currently selected
    if (selectedCampaignId && originalCampaignBody) {
      // Always start from original body to ensure consistent results
      const updatedBody = newValue ? originalCampaignBody : removeReferralSection(originalCampaignBody);
      const updatedCampaign = renderedCampaign ? {
        ...renderedCampaign,
        body: updatedBody
      } : null;
      
      if (updatedCampaign) {
        setRenderedCampaign(updatedCampaign);
      }
      
      // Also update Email Outreach section if visible
      if (showEmailSection && generatedEmail) {
        setGeneratedEmail({
          ...generatedEmail,
          body: updatedBody
        });
      }
    }
  };

  const convertTextToHtml = (text: string): string => {
    // Process text line by line to preserve formatting
    const lines = text.split('\n');
    let htmlContent = '';
    let currentParagraph: string[] = [];
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        let paraText = currentParagraph.join('<br>');
        
        // Track which parts we've already converted to avoid double-processing
        const LINK_PLACEHOLDER = '___LINK_';
        const protectedLinks: string[] = [];
        
        const protectLink = (linkHtml: string): string => {
          protectedLinks.push(linkHtml);
          return `${LINK_PLACEHOLDER}${protectedLinks.length - 1}___`;
        };
        
        const restoreLinks = (text: string): string => {
          return text.replace(/___LINK_(\d+)___/g, (match, index) => protectedLinks[parseInt(index)]);
        };
        
        // Convert **bold** to <strong>bold</strong>
        paraText = paraText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Convert URLs to clickable links (order matters: specific patterns first)
        // 1. Labeled links (e.g., "LinkedIn: https://..." or "Company: https://...")
        paraText = paraText.replace(/\b([A-Za-z]+):\s*(https?:\/\/[^\s<]+)/g, (match, label, url) => {
          return `${label}: ${protectLink(`<a href="${url}" style="color: #0066cc; text-decoration: underline;">${url}</a>`)}`;
        });
        
        // 2. Phone numbers with icon (like 📞 (352) 397-8650) - before emails to avoid conflicts
        paraText = paraText.replace(/📞\s*(\([0-9]{3}\)\s*[0-9]{3}-[0-9]{4}|[0-9\(\)\s-]+)/g, (match, phoneNumber) => {
          const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
          return protectLink(`<a href="tel:+1${cleanPhone}" style="color: #0066cc; text-decoration: underline;">📞 ${phoneNumber}</a>`);
        });
        
        // 3. Email addresses with icon (like ✉️ info@vsol.software)
        paraText = paraText.replace(/✉️\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, email) => {
          return protectLink(`<a href="mailto:${email}" style="color: #0066cc; text-decoration: underline;">✉️ ${email}</a>`);
        });
        
        // 4. Website icon with domain (like 🌐 vsol.software)
        paraText = paraText.replace(/🌐\s*([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g, (match, domain) => {
          return protectLink(`<a href="https://${domain}" style="color: #0066cc; text-decoration: underline;" target="_blank" rel="noopener noreferrer">🌐 ${domain}</a>`);
        });
        
        // 5. HTTP/HTTPS URLs (standalone)
        paraText = paraText.replace(/(https?:\/\/[^\s<]+)/g, (match, url) => {
          return protectLink(`<a href="${url}" style="color: #0066cc; text-decoration: underline;">${url}</a>`);
        });
        
        // 6. www.domain.com URLs
        paraText = paraText.replace(/\b(www\.[^\s<]+)/g, (match, url) => {
          return protectLink(`<a href="https://${url}" style="color: #0066cc; text-decoration: underline;">${url}</a>`);
        });
        
        // 7. Email addresses without emoji (but not if already protected)
        paraText = paraText.replace(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, (match, email) => {
          return protectLink(`<a href="mailto:${email}" style="color: #0066cc; text-decoration: underline;">${email}</a>`);
        });
        
        // Restore all protected links
        paraText = restoreLinks(paraText);
        
        htmlContent += `<p style="margin: 0 0 1em 0;">${paraText}</p>`;
        currentParagraph = [];
      }
    };
    
    for (const line of lines) {
      if (line.trim() === '') {
        flushParagraph();
      } else {
        currentParagraph.push(line);
      }
    }
    
    flushParagraph();
    return htmlContent;
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
            className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close"
            title="Close"
          >
            <Icon icon="close" size={24} className="text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('outreach')}
              className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'outreach'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Outreach
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
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

              {/* About Section */}
              {lead.about && (
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">About</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
                            <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
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
            </div>
          )}

          {/* Outreach Tab */}
          {activeTab === 'outreach' && (
            <div className="space-y-4">
              {/* Email Status Section - Moved to top */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Email Status</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCycleStatus}
                    className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-all hover:ring-2 hover:ring-offset-2 ${getStatusColor(emailStatus)} hover:ring-blue-400`}
                    title="Click to cycle to next status"
                  >
                    {getStatusLabel(emailStatus)}
                  </button>
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

              {/* Campaign Email Section */}
              {activeCampaigns.length > 0 && (
                <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Icon icon="campaign" size={20} className="text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Campaign Email</h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => handleCampaignChange(e.target.value)}
                        disabled={isRenderingCampaign || !lead.email}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select a campaign...</option>
                        {activeCampaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                      {isRenderingCampaign && (
                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                          <Icon icon="refresh" size={20} className="animate-spin text-purple-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Include Referral Program Checkbox */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="includeCampaignReferral"
                      checked={includeCampaignReferral}
                      onChange={handleToggleCampaignReferral}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label 
                      htmlFor="includeCampaignReferral" 
                      className="text-sm text-gray-700 cursor-pointer select-none"
                    >
                      Include Referral Program <span className="text-gray-500">(https://vsol.software/referral...)</span>
                    </label>
                  </div>

                  {!lead.email && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm flex items-center gap-2">
                      <Icon icon="warning" size={16} />
                      No email address available for this lead
                    </div>
                  )}
                </div>
              )}

              {/* AI-Generated Background Section - Simplified */}
              <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
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
                      <button
                        onClick={handleGenerateBackground}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                      >
                        <Icon icon="refresh" size={16} />
                        Regenerate
                      </button>
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
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-gray-900 leading-relaxed">{currentBackground}</p>
                  </div>
                ) : !generateBackground.isPending && (
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-500 text-sm">
                    Click "Generate" to create a professional email introduction based on this person's title and background.
                  </div>
                )}
              </div>

              {/* Email Generation Section - Simplified */}
              <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="email" size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Email Outreach</h3>
                  </div>
                  {!showEmailSection && (
                    <button
                      onClick={handleGenerateEmail}
                      disabled={!lead.email}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                  <div className="space-y-3" key={`${selectedCampaignId}-${generatedEmail.subject}`}>
                    {/* Email Preview - Click to Copy */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                      <div 
                        className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 -m-1 p-1 rounded transition-colors"
                        onClick={handleCopyToField}
                        title="Click to copy email address"
                      >
                        <Icon icon="person" size={16} className="text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-gray-500">To:</span>
                          <p className="text-sm text-gray-900">{generatedEmail.to}</p>
                        </div>
                        <Icon icon="content_copy" size={14} className="text-gray-400 mt-0.5" />
                      </div>
                      
                      <div 
                        className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 -m-1 p-1 rounded transition-colors"
                        onClick={handleCopySubject}
                        title="Click to copy subject"
                      >
                        <Icon icon="subject" size={16} className="text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-gray-500">Subject:</span>
                          <p className="text-sm text-gray-900">{generatedEmail.subject}</p>
                        </div>
                        <Icon icon="content_copy" size={14} className="text-gray-400 mt-0.5" />
                      </div>

                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500">Email Body:</span>
                          <span className="text-xs text-blue-600">{copiedEmail ? '✓ Copied!' : 'Click to copy'}</span>
                        </div>
                        <div 
                          onClick={handleEmailBodyClick}
                          className="mt-1 p-4 bg-gray-50 rounded border border-gray-300 text-sm text-gray-900 max-h-96 overflow-y-auto cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-colors"
                          title="Click to copy email"
                          style={{
                            fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
                            fontSize: '12pt',
                            lineHeight: '1.6'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: (() => {
                              console.log('🎨 Rendering email body HTML:', {
                                hasCampaign: !!renderedCampaign,
                                campaignId: selectedCampaignId,
                                bodyPreview: generatedEmail.body?.substring(0, 100),
                                subject: generatedEmail.subject
                              });
                              
                              // If we have a campaign email (renderedCampaign), use the plain text body directly converted to HTML
                              // Otherwise, generate HTML from the lead background
                              if (renderedCampaign) {
                                // Campaign emails: just convert text to HTML formatting
                                console.log('✅ Using campaign email body');
                                return convertTextToHtml(generatedEmail.body);
                              } else {
                                // Non-campaign emails: generate full HTML with lead background
                                console.log('⚙️ Generating non-campaign HTML email');
                                const leadWithCurrentBackground = { ...lead, background: currentBackground };
                                const htmlEmail = generateHtmlEmail(leadWithCurrentBackground, includeReferral);
                                const bodyContentMatch = htmlEmail.match(/<body[^>]*>([\s\S]*)<\/body>/);
                                return bodyContentMatch ? bodyContentMatch[1] : convertTextToHtml(generatedEmail.body);
                              }
                            })()
                          }}
                        />
                      </div>
                    </div>

                    {/* Referral Checkbox - Only show for non-campaign emails */}
                    {!renderedCampaign && (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeReferral}
                          onChange={handleToggleReferral}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Include Referral Program
                          {includeReferral && generatedEmail.referralLink && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({generatedEmail.referralLink.substring(0, 30)}...)
                            </span>
                          )}
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Professional Information */}
              <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
                <h3 className="font-semibold text-gray-900">Professional Information</h3>
                
                {lead.title && (
                  <div className="flex items-start gap-3">
                    <Icon icon="work" size={20} className="text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</span>
                      <p className="text-gray-900">{lead.title}</p>
                    </div>
                  </div>
                )}
                
                {lead.company && (
                  <div className="flex items-start gap-3">
                    <Icon icon="business" size={20} className="text-purple-500 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</span>
                      <p className="text-gray-900">{lead.company}</p>
                    </div>
                  </div>
                )}
                
                {lead.location && (
                  <div className="flex items-start gap-3">
                    <Icon icon="place" size={20} className="text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</span>
                      <p className="text-gray-900">{lead.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
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

              {/* Profile Metadata */}
              <div className="bg-white rounded-lg p-4 space-y-2 text-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900">Profile Metadata</h3>
                <div className="grid grid-cols-1 gap-3 text-gray-600">
                  {lead.linkedin_id && (
                    <div>
                      <span className="font-medium">LinkedIn ID:</span>{' '}
                      <span className="text-gray-900 font-mono">{lead.linkedin_id}</span>
                    </div>
                  )}
                  {lead.profile && (
                    <div>
                      <span className="font-medium">Search Profile:</span>{' '}
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        {lead.profile}
                      </span>
                    </div>
                  )}
                  {lead.created_at && (
                    <div>
                      <span className="font-medium">Profile Added:</span>{' '}
                      {formatDate(lead.created_at)}
                    </div>
                  )}
                  {lead.scraped_at && (
                    <div>
                      <span className="font-medium">Last Scraped:</span>{' '}
                      {formatDate(lead.scraped_at)}
                    </div>
                  )}
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
  );
}

