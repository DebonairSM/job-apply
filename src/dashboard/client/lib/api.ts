import { JobStats, JobsResponse, RunsResponse, Job } from './types';

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
  }): Promise<JobsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.easyApply !== undefined) searchParams.set('easyApply', String(params.easyApply));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

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
    appliedMethod?: 'automatic' | 'manual'
  ): Promise<Job> {
    const response = await fetch(`${API_BASE}/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, applied_method: appliedMethod }),
    });

    if (!response.ok) {
      throw new Error('Failed to update job status');
    }

    return response.json();
  }
};

