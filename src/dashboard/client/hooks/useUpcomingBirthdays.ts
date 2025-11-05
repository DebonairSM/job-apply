import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface LeadWithBirthday {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  profile_url: string;
  birthday: string;
  daysUntilBirthday: number;
}

export function useUpcomingBirthdays(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['upcoming-birthdays', daysAhead],
    queryFn: async () => {
      const response = await api.get(`/leads/birthdays?days=${daysAhead}`);
      return response.data as LeadWithBirthday[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

