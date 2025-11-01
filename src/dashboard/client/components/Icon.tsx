import { Icon as IconifyIcon } from '@iconify/react';

interface IconProps {
  icon: string;
  className?: string;
  size?: number;
}

export function Icon({ icon, className = '', size = 24 }: IconProps) {
  return <IconifyIcon icon={`material-symbols:${icon}`} width={size} height={size} className={className} />;
}

