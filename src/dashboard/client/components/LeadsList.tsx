import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LeadDetail } from './LeadDetail';
import { Icon } from './Icon';

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
}

interface LeadStats {
  total: number;
  withEmail: number;
  withoutEmail: number;
  workedTogether: number;
  withArticles: number;
  topCompanies: Array<{ company: string; count: number }>;
  topTitles: Array<{ title: string; count: number }>;
}

interface ScrapingRun {
  id: number;
  started_at: string;
  completed_at?: string;
  status: 'in_progress' | 'completed' | 'stopped';
  profiles_scraped: number;
  profiles_added: number;
  last_profile_url?: string;
  filter_titles?: string;
  max_profiles?: number;
  created_at?: string;
}

export function LeadsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState<string>('');
  const [workedTogetherFilter, setWorkedTogetherFilter] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showRuns, setShowRuns] = useState(false);
  const [showCLIReference, setShowCLIReference] = useState(false);

  // Fetch leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', searchQuery, titleFilter, companyFilter, locationFilter, emailFilter, workedTogetherFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (titleFilter) params.set('title', titleFilter);
      if (companyFilter) params.set('company', companyFilter);
      if (locationFilter) params.set('location', locationFilter);
      if (emailFilter) params.set('hasEmail', emailFilter);
      if (workedTogetherFilter) params.set('workedTogether', workedTogetherFilter);
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
  const stats = statsData || { total: 0, withEmail: 0, withoutEmail: 0, workedTogether: 0, withArticles: 0, topCompanies: [], topTitles: [] };
  const runs = runsData || [];

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
                  <p className="text-gray-600 text-xs mt-1">Limit to 100 profiles</p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <code className="text-xs">npm run leads:search -- --titles "CTO,VP Engineering"</code>
                  <p className="text-gray-600 text-xs mt-1">Custom titles (no profile)</p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <code className="text-xs">npm run leads:search -- --resume 123</code>
                  <p className="text-gray-600 text-xs mt-1">Resume interrupted run</p>
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
                <li>Check "Scraping Runs" below to see progress and get run IDs for resuming</li>
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
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowRuns(!showRuns)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            {showRuns ? 'Hide' : 'Show'} Scraping Runs
          </button>
        </div>
      </div>

      {/* Scraping Runs Panel */}
      {showRuns && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Recent Scraping Runs</h3>
          <div className="space-y-2">
            {runs.length === 0 ? (
              <p className="text-gray-500">No scraping runs yet</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Run #{run.id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        run.status === 'completed' ? 'bg-green-100 text-green-800' :
                        run.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {run.profiles_scraped} scraped, {run.profiles_added} added
                      {run.filter_titles && ` • Filters: ${JSON.parse(run.filter_titles).join(', ')}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Started: {formatDate(run.started_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worked Together</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
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

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

