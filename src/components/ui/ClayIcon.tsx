import type { LucideIcon } from 'lucide-react';

interface ClayIconProps {
  icon: LucideIcon;
  active?: boolean;
  elevated?: boolean;
  className?: string;
}

/** Decorative icon tile; the parent link or button provides its accessible name. */
export default function ClayIcon({ icon: Icon, active = false, elevated = false, className = '' }: ClayIconProps) {
  const isSolid = active || elevated;
  return (
    <span
      aria-hidden="true"
      data-active={active || undefined}
      className={`loxer-clay-icon ${isSolid ? 'loxer-clay-icon-solid' : 'loxer-clay-icon-soft'} ${elevated ? 'loxer-clay-icon-elevated' : ''} ${className}`}
    >
      <Icon size={elevated ? 25 : 20} strokeWidth={2} />
    </span>
  );
}
