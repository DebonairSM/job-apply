import * as React from 'react';

interface CategoryScoreBarProps {
  category: string;
  score: number;
  maxScore?: number;
}

export function CategoryScoreBar({ category, score, maxScore = 100 }: CategoryScoreBarProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  
  const getColorClass = (score: number) => {
    if (score < 50) return 'bg-red-500';
    if (score < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColorClass = (score: number) => {
    if (score < 50) return 'text-red-700';
    if (score < 75) return 'text-yellow-700';
    return 'text-green-700';
  };

  const formatCategoryName = (category: string) => {
    // Map category keys to proper display names
    const categoryNameMap: Record<string, string> = {
      coreAzure: 'Azure Platform Development',
      coreNet: '.NET Development',
      security: 'Security & Governance',
      eventDriven: 'Event-Driven Architecture',
      performance: 'Performance & Reliability',
      devops: 'DevOps & CI/CD',
      seniority: 'Seniority & Role Type',
      frontendFrameworks: 'Frontend Framework Preferences',
      legacyModernization: 'Legacy Modernization'
    };
    
    // Return mapped name or fallback to formatted camelCase
    return categoryNameMap[category] || category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700">
          {formatCategoryName(category)}
        </span>
        <span className={`text-xs font-bold ${getTextColorClass(score)}`}>
          {score}/{maxScore}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${getColorClass(score)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CategoryScoresProps {
  scores: Record<string, number>;
  maxScore?: number;
}

export function CategoryScores({ scores, maxScore = 100 }: CategoryScoresProps) {
  if (!scores || Object.keys(scores).length === 0) {
    return (
      <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
        <span className="text-xs text-gray-500 italic">No category scores available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(scores).map(([category, score]) => (
        <CategoryScoreBar
          key={category}
          category={category}
          score={score}
          maxScore={maxScore}
        />
      ))}
    </div>
  );
}
