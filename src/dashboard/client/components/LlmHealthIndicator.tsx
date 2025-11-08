import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface LlmHealthResponse {
  healthy: boolean;
  timestamp: string;
  error?: string;
}

/**
 * LLM Health Indicator component
 * Continuously polls the LLM health endpoint and displays status
 * Shows in red with warning when LLM is down
 */
export function LlmHealthIndicator() {
  const [health, setHealth] = useState<LlmHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Poll LLM health every 5 seconds
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/llm-health');
        const data = await response.json();
        setHealth(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching LLM health:', error);
        setHealth({
          healthy: false,
          timestamp: new Date().toISOString(),
          error: 'Failed to check LLM health',
        });
        setIsLoading(false);
      }
    };

    // Check immediately on mount
    checkHealth();

    // Then check every 5 seconds
    const interval = setInterval(checkHealth, 5000);

    return () => clearInterval(interval);
  }, []);

  // Don't render while loading initial state
  if (isLoading) {
    return null;
  }

  // Only show indicator if LLM is unhealthy
  if (!health || health.healthy) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
      <Icon icon="warning" size={20} className="text-red-600" />
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-red-700">LLM Offline</span>
        <span className="text-xs text-red-600">Ollama is not responding</span>
      </div>
    </div>
  );
}






