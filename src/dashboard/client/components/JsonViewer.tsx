import { useState } from 'react';

interface JsonViewerProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
}

export function JsonViewer({ data, title, defaultExpanded = false }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'data'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {title && (
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded transition-colors"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              onClick={downloadJson}
              className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded transition-colors"
            >
              💾 Download
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
            >
              {isExpanded ? '📕 Collapse' : '📖 Expand'}
            </button>
          </div>
        </div>
      )}
      
      {isExpanded && (
        <div className="bg-gray-900 text-green-400 p-4 overflow-auto max-h-96">
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {jsonString}
          </pre>
        </div>
      )}
      
      {!title && (
        <div className="p-2 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={copyToClipboard}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded transition-colors"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button
            onClick={downloadJson}
            className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded transition-colors"
          >
            💾 Download
          </button>
        </div>
      )}
    </div>
  );
}
