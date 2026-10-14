import type { LucideIcon } from 'lucide-react';

interface ClayIconProps {
  icon: LucideIcon;
  active?: boolean;
  elevated?: boolean;
  className?: string;
}

/** Decorative icon tile; uniformly vibrant blue 3D clay surface across all navigation tabs */
export default function ClayIcon({ icon: Icon, active = false, elevated = false, className = '' }: ClayIconProps) {
  return (
    <span
      aria-hidden="true"
      data-active={active || undefined}
      className={`loxer-clay-icon loxer-clay-icon-solid ${
        active
          ? 'loxer-clay-icon-active ring-2 ring-cyan-300 ring-offset-2 ring-offset-[#0f172a] shadow-lg shadow-cyan-500/40'
          : 'opacity-90 hover:opacity-100'
      } ${elevated ? 'loxer-clay-icon-elevated' : ''} ${className}`}
    >
      <Icon size={elevated ? 25 : 20} strokeWidth={2} />
    </span>
  );
}
