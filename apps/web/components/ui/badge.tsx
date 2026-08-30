'use client';

import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = ''
}) => {
  const variantStyles = {
    default: 'bg-white/10 text-gray-200 border border-white/10',
    success: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40',
    warning: 'bg-amber-950/60 text-amber-300 border border-amber-800/40',
    danger: 'bg-red-950/60 text-red-300 border border-red-800/40',
    info: 'bg-sky-950/60 text-sky-300 border border-sky-800/40'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
