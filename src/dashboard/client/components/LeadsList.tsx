import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LeadDetail } from './LeadDetail';
import { Icon } from './Icon';
import { LeadScrapeModal, ScrapeConfig } from './LeadScrapeModal';
import { ActiveScrapingStatus } from './ActiveScrapingStatus';

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
  email_status?: 'not_contacted' | 'email_sent' | 'replied' | 'meeting_scheduled';
  scraped_at?: string;
  created_at?: string;
  deleted_at?: string;
}

interface LeadStats {
  total: number;
  withEmail: number;
  withoutEmail: number;
  workedTogether: number;
  withArticles: number;
  topCompanies: Array<{ company: string; count: number }>;
  topTitles: Array<{ title: string; count: number }>;
  profileBreakdown: Array<{ profile: string; count: number }>;
  availableProfiles: string[];
}

interface ScrapingRun {
  id: number;
  started_at: string;
  completed_at?: string;
  status: 'in_progress' | 'completed' | 'stopped' | 'error';
  profiles_scraped: number;
  profiles_added: number;
  last_profile_url?: string;
  filter_titles?: string;
  max_profiles?: number;
  created_at?: string;
  error_message?: string;
  process_id?: number;
  last_activity_at?: string;
  connection_degree?: string;
  start_page?: number;
  current_page?: number;
}

export function LeadsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState<string>('');
  const [workedTogetherFilter, setWorkedTogetherFilter] = useState<string>('');
  const [profileFilter, setProfileFilter] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showRuns, setShowRuns] = useState(false);
  const [showCLIReference, setShowCLIReference] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [showScrapeModal, setShowScrapeModal] = useState(false);

  // Fetch leads
  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ['leads', searchQuery, titleFilter, companyFilter, locationFilter, emailFilter, workedTogetherFilter, profileFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (titleFilter) params.set('title', titleFilter);
      if (companyFilter) params.set('company', companyFilter);
      if (locationFilter) params.set('location', locationFilter);
      if (emailFilter) params.set('hasEmail', emailFilter);
      if (workedTogetherFilter) params.set('workedTogether', workedTogetherFilter);
      if (profileFilter) params.set('profile', profileFilter);
      params.set('limit', '200');

      const response = await api.get(`/leads?${params.toString()}`);
      return response.data as { leads: Lead[]; total: number };
    },
    refetchInterval: 5000
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const response = await api.get('/leads/stats');
      return response.data as LeadStats;
    },
    refetchInterval: 10000
  });

  // Fetch scraping runs
  const { data: runsData } = useQuery({
    queryKey: ['scraping-runs'],
    queryFn: async () => {
      const response = await api.get('/leads/runs?limit=20');
      return response.data as ScrapingRun[];
    },
    refetchInterval: 5000,
    enabled: showRuns
  });

  const leads = leadsData?.leads || [];
  const stats = statsData || { total: 0, withEmail: 0, withoutEmail: 0, workedTogether: 0, withArticles: 0, topCompanies: [], topTitles: [], profileBreakdown: [], availableProfiles: [] };
  const runs = runsData || [];

  const isRunStalled = (run: ScrapingRun): boolean => {
    if (run.status !== 'in_progress' || !run.last_activity_at) return false;
    const lastActivity = new Date(run.last_activity_at);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes > 5;
  };

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const formatDuration = (startStr?: string, endStr?: string) => {
    if (!startStr) return 'N/A';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  const getProfileName = (filterTitles?: string): string | null => {
    if (!filterTitles) return null;
    try {
      const titles = JSON.parse(filterTitles);
      if (Array.isArray(titles) && titles.length > 0 && titles[0].startsWith('profile:')) {
        return titles[0].replace('profile:', '');
      }
    } catch {
      return null;
    }
    return null;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'email_sent':
        return 'bg-blue-100 text-blue-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'meeting_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'not_contacted':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'not_contacted':
        return 'Not Contacted';
      case 'email_sent':
        return 'Email Sent';
      case 'replied':
        return 'Replied';
      case 'meeting_scheduled':
        return 'Meeting Scheduled';
      default:
        return 'Not Contacted';
    }
  };

  const handleCleanupIncomplete = async () => {
    const confirmed = window.confirm(
      'This will remove all leads that have ONLY a name but are missing title, company, location, AND email. ' +
      'You can then re-run the scraper to get complete data. Continue?'
    );
    
    if (!confirmed) return;
    
    try {
      setIsCleaningUp(true);
      const response = await api.post('/leads/cleanup-incomplete');
      const result = response.data;
      
      alert(
        `${result.message}\n\n` +
        `Removed leads:\n${result.leads.map((l: { name: string }) => `- ${l.name}`).join('\n')}`
      );
      
      // Refetch leads to update the list
      refetchLeads();
    } catch (error) {
      console.error('Error cleaning up incomplete leads:', error);
      alert('Failed to cleanup incomplete leads. Check the console for details.');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleStartScraping = async (config: ScrapeConfig) => {
    try {
      const response = await api.post('/leads/start-scrape', config);
      const result = response.data;
      
      alert(`Scraping started successfully!\n\nRun ID: ${result.runId}\n${result.message}\n\nCheck the "Scraping Runs" section below for progress.`);
      
      // Close modal and refetch runs
      setShowScrapeModal(false);
    } catch (error) {
      console.error('Error starting scrape:', error);
      throw new Error('Failed to start scraping. Check the console for details.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Icon icon="people" size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With Email</p>
              <p className="text-2xl font-bold text-green-600">{stats.withEmail}</p>
            </div>
            <Icon icon="email" size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Without Email</p>
              <p className="text-2xl font-bold text-gray-600">{stats.withoutEmail}</p>
            </div>
            <Icon icon="block" size={32} className="text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Worked Together</p>
              <p className="text-2xl font-bold text-blue-600">{stats.workedTogether}</p>
            </div>
            <Icon icon="users" size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With Articles</p>
              <p className="text-2xl font-bold text-purple-600">{stats.withArticles}</p>
            </div>
            <Icon icon="article" size={32} className="text-purple-500" />
          </div>
        </div>
      </div>

      {/* Active Scraping Status */}
      <ActiveScrapingStatus />

      {/* Start Scraping Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowScrapeModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Icon icon="play_arrow" size={24} />
          <span className="font-semibold">Start Scraping</span>
        </button>
      </div>

      {/* CLI Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow">
        <button
          onClick={() => setShowCLIReference(!showCLIReference)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon icon="terminal" size={20} className="text-blue-600" />
            <span className="font-semibold text-blue-900">CLI Reference - Lead Scraping Commands</span>
          </div>
          <Icon 
            icon={showCLIReference ? "expand_less" : "expand_more"} 
            size={24} 
            className="text-blue-600" 
          />
        </button>
        
        {showCLIReference && (
          <div className="px-4 pb-4 space-y-4">
            {/* Profiles Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Lead Profiles (Recommended)</h4>
              <div className="space-y-2 text-sm">
                <div className="bg-white rounded p-3 border border-blue-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-mono text-blue-600">--profile chiefs</span>
                      <p className="text-gray-600 text-xs mt-1">C-Suite & Leadership (CTO, CEO, VP, General Manager)</p>
                    </div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">npm run leads:search -- --profile chiefs</code>
                  </div>
                </div>

                <div className="bg-white rounded p-3 border border-blue-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-mono text-blue-600">--profile founders</span>
                      <p className="text-gray-600 text-xs mt-1">Founders & Entrepreneurs</p>
                    </div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">npm run leads:search -- --profile founders</code>
                  </div>
                </div>

                <div className="bg-white rounded p-3 border border-blue-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-mono text-blue-600">--profile directors</span>
                      <p className="text-gray-600 text-xs mt-1">Directors & Senior Management</p>
                    </div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">npm run leads:search -- --profile directors</code>
                  </div>
                </div>

                <div className="bg-white rounded p-3 border border-blue-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-mono text-blue-600">--profile techLeads</span>
                      <p className="text-gray-600 text-xs mt-1">Tech Leads & Architects</p>
                    </div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">npm run leads:search -- --profile techLeads</code>
                  </div>
                </div>

                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-900">More profiles...</summary>
                  <div className="mt-2 space-y-2 pl-2">
                    <div><span className="font-mono text-blue-600">--profile productLeads</span> - Product Management</div>
                    <div><span className="font-mono text-blue-600">--profile recruiters</span> - Recruiters & Talent Acquisition</div>
                    <div><span className="font-mono text-blue-600">--profile sales</span> - Sales & Business Development</div>
                    <div><span className="font-mono text-blue-600">--profile consultants</span> - Consultants & Advisors</div>
                  </div>
                </details>
              </div>
            </div>

            {/* Common Options */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Common Options</h4>
              <div className="space-y-2 text-sm">
                <div className="bg-white rounded p-2 border border-gray-200">
                  <code className="text-xs">npm run leads:search -- --profile chiefs --max 100</code>
                  <p className="text-gray-600 text-xs mt-1">Limit to 100 profiles (default: 1000)</p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <code className="text-xs">npm run leads:search -- --titles "CTO,VP Engineering"</code>
                  <p className="text-gray-600 text-xs mt-1">Custom titles (cannot use with --profile)</p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <code className="text-xs">npm run leads:search -- --start-page 5</code>
                  <p className="text-gray-600 text-xs mt-1">Skip earlier pages, start from page 5</p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <code className="text-xs">npm run leads:search -- --resume 123</code>
                  <p className="text-gray-600 text-xs mt-1">Resume interrupted run by ID</p>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-100 rounded p-3 text-xs">
              <p className="font-semibold text-blue-900 mb-1">Tips:</p>
              <ul className="text-blue-800 space-y-1 list-disc list-inside">
                <li>Default limit is 50 profiles. Use <code className="bg-white px-1 rounded">--max</code> to change</li>
                <li>Cannot use both <code className="bg-white px-1 rounded">--profile</code> and <code className="bg-white px-1 rounded">--titles</code> together</li>
                <li>Run <code className="bg-white px-1 rounded">npm run leads:search -- --help</code> for all options</li>
                <li>Check "Utilities" section at the bottom to view scraping runs and manage data quality</li>
              </ul>
            </div>
          </div>
        )}
      </div>


      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, title, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              placeholder="Filter by title..."
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              placeholder="Filter by company..."
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Worked Together</label>
            <select
              value={workedTogetherFilter}
              onChange={(e) => setWorkedTogetherFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Worked Together</option>
              <option value="false">Did Not Work Together</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Status</label>
            <select
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Has Email</option>
              <option value="false">No Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Profiles</option>
              {stats.availableProfiles.map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold">Leads ({leads.length})</h3>
        </div>

        {leadsLoading ? (
          <div className="p-8 text-center text-gray-500">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No leads found. Run the CLI command to start scraping:
            <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">npm run cli -- leads:search --max 50</pre>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worked Together</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scraped</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(lead)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{lead.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{lead.title || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{lead.company || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{lead.location || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.profile ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {lead.profile}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.worked_together ? (
                        <div className="flex items-center gap-2">
                          <Icon icon="users" size={16} className="text-blue-500" />
                          <span className="text-sm text-gray-700">{lead.worked_together}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.email ? (
                        <div className="flex items-center gap-2">
                          <Icon icon="check-circle" size={16} className="text-green-500" />
                          <span className="text-sm text-gray-700">{lead.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.email_status)}`}>
                        {getStatusLabel(lead.email_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {lead.scraped_at ? new Date(lead.scraped_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <a
                        href={lead.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Icon icon="open-in-new" size={20} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Utilities Section */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg shadow p-4 mt-8">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon="build" size={28} className="text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-800">Utilities</h2>
        </div>

        <div className="space-y-4">
          {/* Data Quality */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon="warning" size={24} className="text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Data Quality</h3>
                  <p className="text-sm text-yellow-700">Remove leads with incomplete data (missing title, company, location, and email)</p>
                </div>
              </div>
              <button
                onClick={handleCleanupIncomplete}
                disabled={isCleaningUp}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="delete_sweep" size={20} />
                <span>{isCleaningUp ? 'Cleaning...' : 'Cleanup Incomplete Leads'}</span>
              </button>
            </div>
          </div>

          {/* Scraping Runs */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <button
              onClick={() => setShowRuns(!showRuns)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon icon="history" size={20} className="text-gray-600" />
                <span className="font-medium">Scraping Runs</span>
              </div>
              <Icon 
                icon={showRuns ? "expand_less" : "expand_more"} 
                size={24} 
                className="text-gray-600" 
              />
            </button>
            
            {showRuns && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-4">Recent Scraping Runs</h3>
                <div className="space-y-3">
                  {runs.length === 0 ? (
                    <p className="text-gray-500">No scraping runs yet</p>
                  ) : (
                    runs.map((run) => {
                      const stalled = isRunStalled(run);
                      const profileName = getProfileName(run.filter_titles);
                      const progress = run.max_profiles ? Math.round((run.profiles_scraped / run.max_profiles) * 100) : 0;
                      const duration = formatDuration(run.started_at, run.completed_at);
                      
                      return (
                        <div key={run.id} className={`border rounded-lg p-4 ${
                          stalled ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300 bg-white'
                        }`}>
                          {/* Header Row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-900">Run #{run.id}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                run.status === 'completed' ? 'bg-green-100 text-green-800' :
                                run.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                run.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {run.status.toUpperCase()}
                              </span>
                              {stalled && (
                                <span className="flex items-center gap-1 text-xs text-yellow-700 font-medium bg-yellow-200 px-2 py-1 rounded">
                                  <Icon icon="warning" size={14} />
                                  Stalled
                                </span>
                              )}
                              {run.status === 'in_progress' && !stalled && (
                                <Icon icon="sync" size={18} className="text-blue-600 animate-spin" />
                              )}
                            </div>
                            {run.connection_degree && (
                              <span className="px-3 py-1 rounded-md text-sm font-semibold bg-purple-100 text-purple-800">
                                {run.connection_degree} Degree
                              </span>
                            )}
                          </div>
                          
                          {/* Configuration Row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            {profileName && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase">Profile</div>
                                <div className="text-sm font-semibold text-gray-900 mt-0.5">{profileName}</div>
                              </div>
                            )}
                            {run.filter_titles && !profileName && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase">Filters</div>
                                <div className="text-sm font-medium text-gray-900 mt-0.5">
                                  {JSON.parse(run.filter_titles).join(', ')}
                                </div>
                              </div>
                            )}
                            {run.max_profiles && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase">Target</div>
                                <div className="text-sm font-semibold text-gray-900 mt-0.5">{run.max_profiles} profiles</div>
                              </div>
                            )}
                            {run.current_page && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase">
                                  {run.status === 'in_progress' ? 'Current Page' : 'Last Page'}
                                </div>
                                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                                  Page {run.current_page}
                                  {run.start_page && run.start_page > 1 && (
                                    <span className="text-xs text-gray-500 ml-1">(started: {run.start_page})</span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase">Duration</div>
                              <div className="text-sm font-semibold text-gray-900 mt-0.5">{duration}</div>
                            </div>
                          </div>
                          
                          {/* Progress Row */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium text-gray-700">
                                <span className="text-blue-600 font-bold">{run.profiles_scraped}</span> scraped
                                {' • '}
                                <span className="text-green-600 font-bold">{run.profiles_added}</span> added
                                {run.max_profiles && (
                                  <>
                                    {' • '}
                                    <span className="text-purple-600 font-bold">{progress}%</span> complete
                                  </>
                                )}
                              </div>
                            </div>
                            {run.max_profiles && (
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full transition-all ${
                                    run.status === 'completed' ? 'bg-green-500' :
                                    run.status === 'in_progress' ? 'bg-blue-500' :
                                    run.status === 'error' ? 'bg-red-500' :
                                    'bg-yellow-500'
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                          
                          {/* Timing Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 border-t border-gray-200 pt-3">
                            <div>
                              <span className="font-medium">Started:</span> {formatDate(run.started_at)}
                            </div>
                            {run.completed_at && (
                              <div>
                                <span className="font-medium">Completed:</span> {formatDate(run.completed_at)}
                              </div>
                            )}
                            {run.last_activity_at && !run.completed_at && (
                              <div>
                                <span className="font-medium">Last Activity:</span> {formatDate(run.last_activity_at)}
                              </div>
                            )}
                          </div>
                          
                          {/* Resume Information */}
                          {(run.status === 'stopped' || stalled) && (
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Icon icon="info" size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-blue-900 mb-1">Resume This Run</div>
                                  <div className="text-xs text-blue-800 space-y-1">
                                    <div>Run ID: <span className="font-mono font-bold">{run.id}</span></div>
                                    {run.connection_degree && (
                                      <div>Connection Degree: <span className="font-mono font-bold">{run.connection_degree}</span></div>
                                    )}
                                    {profileName && (
                                      <div>Profile: <span className="font-mono font-bold">{profileName}</span></div>
                                    )}
                                    {run.current_page && (
                                      <div>Stopped on Page: <span className="font-mono font-bold">{run.current_page}</span></div>
                                    )}
                                    {run.max_profiles && (
                                      <div>Progress: <span className="font-mono font-bold">{run.profiles_scraped} / {run.max_profiles}</span> ({progress}%)</div>
                                    )}
                                  </div>
                                  <div className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded font-mono">
                                    Use "Resume Run ID" field with: <span className="font-bold">{run.id}</span>
                                    {run.current_page && (
                                      <div className="mt-1 text-blue-600">Will resume from page {run.current_page}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Error Message */}
                          {run.error_message && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Icon icon="error" size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-red-900 mb-1">Error Details</div>
                                  <div className="text-xs text-red-800">{run.error_message}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Icon icon="link" size={24} className="text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Quick Links</h3>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href="http://192.168.1.65:3000/leads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    <Icon icon="open_in_new" size={16} />
                    Network Leads Dashboard
                  </a>
                  <span className="text-gray-400">|</span>
                  <span className="text-xs text-gray-600">Access from network devices</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Lead Scrape Modal */}
      {showScrapeModal && (
        <LeadScrapeModal
          onClose={() => setShowScrapeModal(false)}
          onStart={handleStartScraping}
        />
      )}
    </div>
  );
}

