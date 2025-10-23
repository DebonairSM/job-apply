interface StatCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700'
};

export function StatCard({ title, value, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className={`border-2 rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        {icon && (
          <div className="text-4xl opacity-50">{icon}</div>
        )}
      </div>
    </div>
  );
}

