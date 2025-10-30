import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = '/api/automation';

export interface AutomationStatus {
  status: 'idle' | 'running' | 'stopping' | 'error';
  hasActiveProcess: boolean;
  pid?: number;
  error?: string;
}

export interface SearchOptions {
  profile?: 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization' | 'contract' | 'aspnet-simple' | 'csharp-azure-no-frontend' | 'az204-csharp' | 'ai-enhanced-net';
  keywords?: string;
  location?: string;
  locationPreset?: string;
  radius?: number;
  remote?: boolean;
  datePosted?: 'day' | 'week' | 'month';
  minScore?: number;
  maxPages?: number;
  startPage?: number;
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
  console.log('[useAutomation] startAutomation called with request:', request);
  console.log('[useAutomation] Request JSON:', JSON.stringify(request));
  
  const body = JSON.stringify(request);
  console.log('[useAutomation] Body being sent:', body);
  
  const res = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body,
  });
  
  console.log('[useAutomation] Response status:', res.status);
  
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

const LOGS_STORAGE_KEY = 'automation-session-logs';
const SESSION_ID_STORAGE_KEY = 'automation-session-id';

// Hook to stream logs via SSE
export function useAutomationLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Load logs from sessionStorage on mount
  useEffect(() => {
    try {
      const storedLogs = sessionStorage.getItem(LOGS_STORAGE_KEY);
      const storedSessionId = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
      
      if (storedLogs && storedSessionId) {
        const parsedLogs = JSON.parse(storedLogs);
        setLogs(parsedLogs);
        setSessionId(storedSessionId);
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }, []);

  // Save logs to sessionStorage whenever they change
  const saveLogs = useCallback((newLogs: string[], newSessionId?: string) => {
    try {
      const currentSessionId = newSessionId || sessionId || Date.now().toString();
      sessionStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(newLogs));
      sessionStorage.setItem(SESSION_ID_STORAGE_KEY, currentSessionId);
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId);
      }
    } catch (error) {
      console.warn('Failed to save logs:', error);
    }
  }, [sessionId]);

  const connect = () => {
    // Check if component is still mounted
    if (!isMountedRef.current) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (error) {
        // Ignore errors when closing existing connection
      }
      eventSourceRef.current = null;
    }

    try {
      const eventSource = new EventSource(`${API_BASE}/logs`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isMountedRef.current) {
          eventSource.close();
          return;
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) {
          return;
        }

        try {
          const data: LogMessage = JSON.parse(event.data);
          
          if (data.type === 'log' && data.message) {
            // Add log message
            setLogs((prev) => {
              if (!isMountedRef.current) return prev;
              const newLogs = [...prev, data.message!];
              saveLogs(newLogs);
              return newLogs;
            });
          } else if (data.type === 'status') {
            // Status update - could show in UI
            if (data.status === 'error' && data.error) {
              setLogs((prev) => {
                if (!isMountedRef.current) return prev;
                const newLogs = [...prev, `❌ Error: ${data.error}`];
                saveLogs(newLogs);
                return newLogs;
              });
            }
            
            // Start new session if running starts
            if (data.status === 'running') {
              const newSessionId = Date.now().toString();
              setLogs([]);
              saveLogs([], newSessionId);
            }
          } else if (data.type === 'connected') {
            // Initial connection message
            console.log('Connected to automation log stream');
          }
        } catch (error) {
          console.error('Failed to parse log message:', error);
        }
      };

      eventSource.onerror = (error) => {
        if (!isMountedRef.current) {
          return;
        }

        setIsConnected(false);
        
        try {
          if (eventSourceRef.current === eventSource) {
            eventSource.close();
            eventSourceRef.current = null;
          }
        } catch (closeError) {
          // Ignore errors when closing
        }
        
        // Only attempt to reconnect if component is still mounted
        if (!isMountedRef.current) {
          return;
        }

        // Attempt to reconnect with exponential backoff
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        
        console.log(`SSE connection lost. Reconnecting in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    }
  };

  const disconnect = () => {
    isMountedRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (error) {
        // Ignore errors when closing
      }
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
  };

  const clearLogs = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }
    setLogs([]);
    try {
      sessionStorage.removeItem(LOGS_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear stored logs:', error);
    }
    setSessionId('');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    isMountedRef.current = true;
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




