import React, { useRef, useEffect, useState } from 'react';

interface TerminalLogProps {
  logs: string[];
  isConnected: boolean;
  onClear?: () => void;
  canClear?: boolean;
}

export function TerminalLog({ logs, isConnected, onClear, canClear = true }: TerminalLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && !userScrolled && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, userScrolled]);

  // Handle scroll events to detect manual scrolling
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      
      if (!isAtBottom && autoScroll) {
        setUserScrolled(true);
        setAutoScroll(false);
      } else if (isAtBottom && !autoScroll) {
        setUserScrolled(false);
        setAutoScroll(true);
      }
    }
  };

  const handleResumeAutoScroll = () => {
    setAutoScroll(true);
    setUserScrolled(false);
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Header */}
      <div className="bg-gray-800 text-gray-300 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-mono">automation@dashboard ~ {isConnected ? '●' : '○'}</span>
        </div>
        <div className="flex gap-2">
          {!autoScroll && (
            <button
              onClick={handleResumeAutoScroll}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Resume Auto-scroll
            </button>
          )}
          {canClear && onClear && (
            <button
              onClick={onClear}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 bg-black text-green-400 font-mono text-sm p-4 overflow-y-auto"
        style={{ height: '500px' }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">
            Waiting for output...
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {logs.map((log, index) => (
              <div key={index} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Status Footer */}
      <div className="bg-gray-800 text-gray-400 px-4 py-1 text-xs border-t border-gray-700">
        {isConnected ? (
          <span className="text-green-400">● Connected</span>
        ) : (
          <span className="text-red-400">○ Disconnected - Reconnecting...</span>
        )}
      </div>
    </div>
  );
}



