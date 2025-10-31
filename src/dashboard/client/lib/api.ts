import { JobStats, JobsResponse, RunsResponse, Job, JobActivity, ActivityEntry } from './types';

const API_BASE = '/api';

export const api = {
  async getStats(): Promise<JobStats> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async getJobs(params?: {
    status?: string;
    easyApply?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<JobsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.easyApply !== undefined) searchParams.set('easyApply', String(params.easyApply));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.search) searchParams.set('search', params.search);

    const response = await fetch(`${API_BASE}/jobs?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch jobs');
    return response.json();
  },

  async getJob(id: string): Promise<Job> {
    const response = await fetch(`${API_BASE}/jobs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch job');
    return response.json();
  },

  async getRuns(params?: {
    jobId?: string;
    limit?: number;
  }): Promise<RunsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.jobId) searchParams.set('jobId', params.jobId);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const response = await fetch(`${API_BASE}/runs?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch runs');
    return response.json();
  },

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Failed to fetch health');
    return response.json();
  },

  async updateJobStatus(
    jobId: string, 
    status: string, 
    appliedMethod?: 'automatic' | 'manual',
    rejectionReason?: string,
    skipLearning?: boolean
  ): Promise<Job> {
    const response = await fetch(`${API_BASE}/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, applied_method: appliedMethod, rejection_reason: rejectionReason, skip_learning: skipLearning }),
    });

    if (!response.ok) {
      throw new Error('Failed to update job status');
    }

    return response.json();
  },

  async getActivity(limit?: number): Promise<ActivityEntry[]> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set('limit', String(limit));

    const response = await fetch(`${API_BASE}/stats/activity?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch activity');
    return response.json();
  },

  async getRecentActivity(limit?: number): Promise<JobActivity[]> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set('limit', String(limit));

    const response = await fetch(`${API_BASE}/stats/recent-activity?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch recent activity');
    return response.json();
  },

  async getCompleteJobData(jobId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/jobs/${jobId}/complete-data`);
    if (!response.ok) throw new Error('Failed to fetch complete job data');
    return response.json();
  },

  async getRejectionPrompt(): Promise<{ prompt: string; jobIds: string[]; count: number }> {
    const response = await fetch(`${API_BASE}/jobs/rejections/prompt`);
    if (!response.ok) throw new Error('Failed to fetch rejection prompt');
    return response.json();
  },

  async getRejectionSuggestions(): Promise<{ reason: string; count: number }[]> {
    const response = await fetch(`${API_BASE}/jobs/rejections/suggestions`);
    if (!response.ok) throw new Error('Failed to fetch rejection suggestions');
    return response.json();
  },

  async markRejectionsProcessed(jobIds: string[]): Promise<{ success: boolean; count: number }> {
    const response = await fetch(`${API_BASE}/jobs/rejections/mark-processed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobIds }),
    });
    if (!response.ok) throw new Error('Failed to mark rejections as processed');
    return response.json();
  }
};

