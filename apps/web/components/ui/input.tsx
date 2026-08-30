'use client';

import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, endIcon, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || props.name || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-300 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-gray-400 pointer-events-none z-10 flex items-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full glass-input rounded-xl py-2.5 text-sm transition-all duration-200 ${
              icon ? 'pl-10' : 'pl-4'
            } ${endIcon ? 'pr-10' : 'pr-4'} ${
              error ? 'border-red-500/80 focus:border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : ''
            } ${className}`}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3.5 flex items-center z-10">
              {endIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
