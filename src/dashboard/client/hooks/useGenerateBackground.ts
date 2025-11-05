import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useGenerateBackground() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const response = await api.post(`/leads/${leadId}/generate-background`);
      return response.data.background as string;
    },
    onSuccess: (_, leadId) => {
      // Invalidate the lead query to refetch with the new background
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

