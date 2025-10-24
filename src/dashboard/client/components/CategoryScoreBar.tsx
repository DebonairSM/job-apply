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
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {formatCategoryName(category)}
        </span>
        <span className={`text-sm font-semibold ${getTextColorClass(score)}`}>
          {score}/{maxScore}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getColorClass(score)}`}
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
      <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-500 italic">No category scores available</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">Category Scores</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(scores).map(([category, score]) => (
          <CategoryScoreBar
            key={category}
            category={category}
            score={score}
            maxScore={maxScore}
          />
        ))}
      </div>
    </div>
  );
}
