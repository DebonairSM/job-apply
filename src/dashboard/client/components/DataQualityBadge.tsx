import * as React from 'react';

interface DataQualityField {
  name: string;
  value: any;
  hasValue: boolean;
  isComplete: boolean;
}

interface DataQualityBadgeProps {
  fields: DataQualityField[];
  onClick?: () => void;
  className?: string;
}

export function DataQualityBadge({ fields, onClick, className = '' }: DataQualityBadgeProps) {
  const completeFields = fields.filter(field => field.isComplete);
  const totalFields = fields.length;
  const completionPercentage = totalFields > 0 ? Math.round((completeFields.length / totalFields) * 100) : 0;

  const getColorClass = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-100 text-green-800 border-green-300';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getIcon = (percentage: number) => {
    if (percentage >= 75) return '✅';
    if (percentage >= 50) return '⚠️';
    return '❌';
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-sm ${getColorClass(completionPercentage)} ${className}`}
      onClick={onClick}
      title={`${completeFields.length}/${totalFields} fields complete - Click for details`}
    >
      <span>{getIcon(completionPercentage)}</span>
      <span>{completionPercentage}%</span>
      <span className="text-xs opacity-75">
        ({completeFields.length}/{totalFields})
      </span>
    </div>
  );
}
