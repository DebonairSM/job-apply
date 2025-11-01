import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useProfileAnalytics() {
  return useQuery({
    queryKey: ['profile-analytics'],
    queryFn: api.getProfileAnalytics,
    refetchInterval: 5000
  });
}

