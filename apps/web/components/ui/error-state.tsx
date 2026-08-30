'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section. Please try again.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-red-950/20 border border-red-800/30 my-4">
      <div className="w-12 h-12 rounded-xl bg-red-900/50 border border-red-700/50 flex items-center justify-center mb-4 text-red-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-red-200 mb-1">{title}</h3>
      <p className="text-sm text-red-300/70 max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Retry
        </Button>
      )}
    </div>
  );
};
