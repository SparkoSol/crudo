import { Card, CardContent } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-brand-primary-600',
  className,
}: StatsCardProps) => {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div
            className={cn('p-3 rounded-lg', {
              'bg-brand-primary-50': iconColor.includes('brand-primary') || iconColor.includes('indigo'),
              'bg-blue-50': iconColor.includes('blue'),
              'bg-green-50': iconColor.includes('green'),
              'bg-purple-50': iconColor.includes('purple'),
              'bg-gray-50':
                !iconColor.includes('brand-primary') &&
                !iconColor.includes('indigo') &&
                !iconColor.includes('blue') &&
                !iconColor.includes('green') &&
                !iconColor.includes('purple'),
            })}
          >
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
