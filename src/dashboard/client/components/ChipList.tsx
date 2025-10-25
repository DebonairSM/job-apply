import * as React from 'react';

interface ChipListProps {
  items: string[];
  variant: 'fit' | 'must-have' | 'blocker' | 'missing';
  className?: string;
}

const variantStyles = {
  fit: {
    container: 'bg-green-50 border-green-200',
    chip: 'bg-green-100 text-green-800 border-green-300',
    icon: '✅'
  },
  'must-have': {
    container: 'bg-blue-50 border-blue-200',
    chip: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '⭐'
  },
  blocker: {
    container: 'bg-red-50 border-red-200',
    chip: 'bg-red-100 text-red-800 border-red-300',
    icon: '⚠️'
  },
  missing: {
    container: 'bg-gray-50 border-gray-200',
    chip: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: '❓'
  }
};

export function ChipList({ items, variant, className = '' }: ChipListProps) {
  if (!items || items.length === 0) {
    return (
      <div className={`p-3 rounded-md border ${variantStyles[variant].container} ${className}`}>
        <span className="text-xs text-gray-500 italic">No items available</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-md border ${variantStyles[variant].container} ${className}`}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-105 hover:shadow-sm ${variantStyles[variant].chip}`}
            title={item}
          >
            <span className="mr-1">{variantStyles[variant].icon}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
