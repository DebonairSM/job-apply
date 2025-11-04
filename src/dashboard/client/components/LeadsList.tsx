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
  scraped_at?: string;
  created_at?: string;
}

interface LeadStats {
  total: number;
  withEmail: number;
  withoutEmail: number;
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showRuns, setShowRuns] = useState(false);

  // Fetch leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', searchQuery, titleFilter, companyFilter, locationFilter, emailFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (titleFilter) params.set('title', titleFilter);
      if (companyFilter) params.set('company', companyFilter);
      if (locationFilter) params.set('location', locationFilter);
      if (emailFilter) params.set('hasEmail', emailFilter);
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
  const stats = statsData || { total: 0, withEmail: 0, withoutEmail: 0, topCompanies: [], topTitles: [] };
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-sm text-gray-600">Email Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}%
              </p>
            </div>
            <Icon icon="trending-up" size={32} className="text-blue-500" />
          </div>
        </div>
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

