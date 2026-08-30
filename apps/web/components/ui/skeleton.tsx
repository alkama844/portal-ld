'use client';

import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.04] border border-white/5 ${className}`}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5
}) => {
  return (
    <div className="space-y-3">
      <div className="h-10 bg-white/[0.04] rounded-xl animate-pulse" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center p-4 glass-panel rounded-xl">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-16' : c === 1 ? 'w-48' : 'w-24'}`} />
          ))}
        </div>
      ))}
    </div>
  );
};
