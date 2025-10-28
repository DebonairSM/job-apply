import React, { useRef, useEffect, useState, useCallback } from 'react';

interface TerminalLogProps {
  logs: string[];
  isConnected: boolean;
  onClear?: () => void;
  canClear?: boolean;
}

export function TerminalLog({ logs, isConnected, onClear, canClear = true }: TerminalLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isFollowing, setIsFollowing] = useState(true); // Follow mode (like tail -f)
  const [userScrolled, setUserScrolled] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hasNewErrors, setHasNewErrors] = useState(false);
  const [pausedOnError, setPausedOnError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [showFollowButton, setShowFollowButton] = useState(false);

  // Follow logs function
  const handleFollowLogs = useCallback(() => {
    setIsFollowing(true);
    setUserScrolled(false);
    setPausedOnError(false);
    setHasNewErrors(false);
    setShowFollowButton(false);
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Keyboard shortcut for following logs (F key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if F is pressed without modifiers and not in an input field
      if (event.key === 'f' && !event.ctrlKey && !event.altKey && !event.metaKey && !isFollowing) {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          event.preventDefault();
          handleFollowLogs();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFollowing, handleFollowLogs]);

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
      
      // Pause following on new errors to let user examine
      if (isFollowing) {
        setPausedOnError(true);
        setIsFollowing(false);
        setShowFollowButton(true);
      }
    }
  }, [logs, errorCount, isFollowing]);

  // Follow mode - auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isFollowing && !pausedOnError && logContainerRef.current) {
      const container = logContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, isFollowing, pausedOnError]);

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback(() => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
      const isAtBottom = distanceFromBottom < 10;
      
      // Calculate scroll position percentage
      let position = 100;
      if (scrollHeight > clientHeight) {
        position = (scrollTop / (scrollHeight - clientHeight)) * 100;
      }
      
      setScrollPosition(Math.round(Math.max(0, Math.min(100, position))));
      
      // If user manually scrolls up from bottom, pause following
      if (!isAtBottom && isFollowing && !pausedOnError) {
        setIsFollowing(false);
        setUserScrolled(true);
        setShowFollowButton(true);
      }
      
      // Clear error indicator when back at bottom (but don't auto-resume)
      if (isAtBottom && userScrolled && !pausedOnError) {
        setHasNewErrors(false);
      }
    }
  }, [isFollowing, pausedOnError, userScrolled]);

  // Update scroll position when logs change
  useEffect(() => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isScrollable = scrollHeight > clientHeight;
      
      if (isScrollable) {
        const position = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollPosition(Math.round(Math.max(0, Math.min(100, position))));
      } else {
        setScrollPosition(100);
      }
    }
  }, [logs]);


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
    <div className="flex flex-col w-full overflow-hidden" style={{ height: 'auto' }}>
      {/* Terminal Header */}
      <div className="bg-gray-800 text-gray-300 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className={`w-3 h-3 rounded-full ${isFollowing ? 'bg-green-500 animate-pulse' : 'bg-green-700'}`}></div>
          </div>
          <span className="text-sm font-mono">
            automation@dashboard ~ {isConnected ? '●' : '○'} 
            {isFollowing ? (
              <span className="text-green-400 ml-2">[FOLLOWING]</span>
            ) : (
              <span className="text-yellow-400 ml-2">[PAUSED]</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400" title={`Logs: ${logs.length}, Following: ${isFollowing}`}>
            {isFollowing ? 'Live' : `${scrollPosition}%`}
          </div>
          
          {/* Follow button - prominent when not following */}
          {showFollowButton && !isFollowing && (
            <button
              onClick={handleFollowLogs}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium animate-pulse"
              title="Resume following new logs (like tail -f)"
            >
              ⤓ Follow
            </button>
          )}
          
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
            <div className="px-2 py-1 text-xs bg-yellow-600 text-white rounded" title="Following paused on error">
              ⏸ Error
            </div>
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
        className="bg-black text-green-400 font-mono text-sm p-4 overflow-y-scroll overflow-x-hidden"
        style={{ 
          height: '600px', // Fixed height - DO NOT use flex-1
          maxHeight: '600px',
          minHeight: '400px', 
          maxWidth: '100%',
          flexShrink: 0 // Prevent flex from shrinking this
        }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">
            Waiting for output...
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words word-break overflow-wrap-anywhere">
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
                  style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                >
                  {log}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connection Status Footer */}
      <div className="bg-gray-800 text-gray-400 px-4 py-1 text-xs border-t border-gray-700 flex items-center justify-between">
        <div>
          {isConnected ? (
            <span className="text-green-400">● Connected</span>
          ) : (
            <span className="text-red-400">○ Disconnected - Reconnecting...</span>
          )}
        </div>
        
        {/* Quick follow shortcut in footer when paused */}
        {!isFollowing && !pausedOnError && (
          <button
            onClick={handleFollowLogs}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            title="Press to resume following logs (F key)"
          >
            Press F to follow logs
          </button>
        )}
        
        {isFollowing && (
          <span className="text-green-400 text-xs">
            Following logs • Scroll up to pause
          </span>
        )}
      </div>
    </div>
  );
}






