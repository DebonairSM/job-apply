import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';

const API_BASE = '/api/automation';

export interface AutomationStatus {
  status: 'idle' | 'running' | 'stopping' | 'error';
  hasActiveProcess: boolean;
  pid?: number;
  error?: string;
}

export interface SearchOptions {
  profile?: 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization';
  keywords?: string;
  location?: string;
  remote?: boolean;
  datePosted?: 'day' | 'week' | 'month';
  minScore?: number;
  maxPages?: number;
  startPage?: number;
  updateDescriptions?: boolean;
}

export interface ApplyOptions {
  easy?: boolean;
  external?: boolean;
  jobId?: string;
  dryRun?: boolean;
}

export interface StartCommandRequest {
  command: 'search' | 'apply';
  options: SearchOptions | ApplyOptions;
}

export interface LogMessage {
  type: 'log' | 'status' | 'connected';
  message?: string;
  timestamp: string;
  status?: AutomationStatus['status'];
  error?: string;
}

// Fetch current automation status
async function fetchAutomationStatus(): Promise<AutomationStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) {
    throw new Error('Failed to fetch automation status');
  }
  return res.json();
}

// Start automation command
async function startAutomation(request: StartCommandRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to start automation');
  }
}

// Stop automation
async function stopAutomation(): Promise<void> {
  const res = await fetch(`${API_BASE}/stop`, {
    method: 'POST',
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to stop automation');
  }
}

// Hook to get automation status with polling when running
export function useAutomationStatus() {
  const query = useQuery({
    queryKey: ['automation-status'],
    queryFn: fetchAutomationStatus,
    refetchInterval: (data) => {
      // Poll every 2 seconds when running, every 5 seconds otherwise
      return data?.status === 'running' || data?.status === 'stopping' ? 2000 : 5000;
    },
  });

  return query;
}

// Hook to start automation
export function useStartAutomation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: startAutomation,
    onSuccess: () => {
      // Invalidate status to refresh immediately
      queryClient.invalidateQueries({ queryKey: ['automation-status'] });
    },
  });
}

// Hook to stop automation
export function useStopAutomation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: stopAutomation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-status'] });
    },
  });
}

// Hook to stream logs via SSE
export function useAutomationLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = () => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(`${API_BASE}/logs`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: LogMessage = JSON.parse(event.data);
          
          if (data.type === 'log' && data.message) {
            // Add log message
            setLogs((prev) => [...prev, data.message!]);
          } else if (data.type === 'status') {
            // Status update - could show in UI
            if (data.status === 'error' && data.error) {
              setLogs((prev) => [...prev, `❌ Error: ${data.error}`]);
            }
          } else if (data.type === 'connected') {
            // Initial connection message
            console.log('Connected to automation log stream');
          }
        } catch (error) {
          console.error('Failed to parse log message:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        
        // Attempt to reconnect with exponential backoff
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        
        console.log(`SSE connection lost. Reconnecting in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  return {
    logs,
    isConnected,
    clearLogs,
    reconnect: connect,
  };
}



