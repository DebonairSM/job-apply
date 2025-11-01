import { Icon } from './Icon';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple';
}

const colorClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    cardBg: 'bg-white',
    border: 'border-blue-100',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100'
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    cardBg: 'bg-white',
    border: 'border-green-100',
    text: 'text-green-700',
    iconBg: 'bg-green-100'
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    cardBg: 'bg-white',
    border: 'border-amber-100',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-red-600',
    cardBg: 'bg-white',
    border: 'border-red-100',
    text: 'text-red-700',
    iconBg: 'bg-red-100'
  },
  gray: {
    bg: 'bg-gradient-to-br from-gray-500 to-gray-600',
    cardBg: 'bg-white',
    border: 'border-gray-100',
    text: 'text-gray-700',
    iconBg: 'bg-gray-100'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    cardBg: 'bg-white',
    border: 'border-purple-100',
    text: 'text-purple-700',
    iconBg: 'bg-purple-100'
  }
};

export function StatCard({ title, value, icon, color = 'blue' }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <div className={`${colors.cardBg} rounded-xl shadow-sm border ${colors.border} overflow-hidden transition-all hover:shadow-md`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          </div>
          {icon && (
            <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 ml-4 shadow-sm`}>
              <Icon icon={icon} size={28} className="text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

