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
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hasNewErrors, setHasNewErrors] = useState(false);
  const [pausedOnError, setPausedOnError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Check for new errors and update error count
  useEffect(() => {
    const newErrorCount = logs.filter(log => 
      log.includes('ERROR:') || 
      log.includes('error:') || 
      log.includes('failed') ||
      log.includes('Failed') ||
      log.toLowerCase().includes('exception')
    ).length;
    
    if (newErrorCount > errorCount) {
      setHasNewErrors(true);
      setErrorCount(newErrorCount);
      
      // Pause auto-scroll on new errors to let user examine
      if (autoScroll) {
        setPausedOnError(true);
        setAutoScroll(false);
      }
    }
  }, [logs, errorCount, autoScroll]);

  // Auto-scroll to bottom when new logs arrive (unless paused on error)
  useEffect(() => {
    if (autoScroll && !userScrolled && !pausedOnError && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, userScrolled, pausedOnError]);

  // Handle scroll events to detect manual scrolling
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      const position = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 100;
      
      setScrollPosition(Math.round(position));
      
      if (!isAtBottom && autoScroll) {
        setUserScrolled(true);
        setAutoScroll(false);
        setPausedOnError(false); // Clear error pause when user scrolls
      } else if (isAtBottom && !autoScroll && !pausedOnError) {
        setUserScrolled(false);
        setAutoScroll(true);
        setHasNewErrors(false); // Clear error indicator when back at bottom
      }
    }
  };

  const handleResumeAutoScroll = () => {
    setAutoScroll(true);
    setUserScrolled(false);
    setPausedOnError(false);
    setHasNewErrors(false);
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  };

  const handleJumpToLatestError = () => {
    if (logContainerRef.current && logs.length > 0) {
      // Find the last error log
      const errorLogs = logs.map((log, index) => ({ log, index }))
        .filter(({ log }) => 
          log.includes('ERROR:') || 
          log.includes('error:') || 
          log.includes('failed') ||
          log.includes('Failed') ||
          log.toLowerCase().includes('exception')
        );
      
      if (errorLogs.length > 0) {
        const lastError = errorLogs[errorLogs.length - 1];
        const container = logContainerRef.current;
        const errorElement = container.children[0]?.children[lastError.index] as HTMLElement;
        
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Temporarily highlight the error
          errorElement.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
          setTimeout(() => {
            errorElement.style.backgroundColor = '';
          }, 2000);
        }
      }
    }
    setHasNewErrors(false);
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
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">
            {scrollPosition < 100 ? `${scrollPosition}%` : 'Bottom'}
          </div>
          {hasNewErrors && (
            <button
              onClick={handleJumpToLatestError}
              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors animate-pulse"
              title="Jump to latest error"
            >
              ⚠ Error
            </button>
          )}
          {pausedOnError && (
            <div className="px-2 py-1 text-xs bg-yellow-600 text-white rounded" title="Auto-scroll paused on error">
              ⏸ Paused
            </div>
          )}
          {!autoScroll && !pausedOnError && (
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
        style={{ height: '600px', minHeight: '400px' }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">
            Waiting for output...
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {logs.map((log, index) => {
              const isError = log.includes('ERROR:') || 
                            log.includes('error:') || 
                            log.includes('failed') ||
                            log.includes('Failed') ||
                            log.toLowerCase().includes('exception');
              
              return (
                <div 
                  key={index} 
                  className={`leading-relaxed ${isError ? 'text-red-400 font-medium' : ''}`}
                >
                  {log}
                </div>
              );
            })}
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





