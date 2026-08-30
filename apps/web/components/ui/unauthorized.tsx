'use client';

import React from 'react';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from './button';
import { useRouter } from 'next/navigation';

export const UnauthorizedState: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070707]">
      <div className="max-w-md w-full glass-panel-glow rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-600/40 flex items-center justify-center mx-auto text-red-500 shadow-glow-red-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-100">Access Denied</h2>
          <p className="text-sm text-gray-400">
            You must be authenticated with administrator privileges to access this area.
          </p>
        </div>

        <Button
          variant="primary"
          className="w-full gap-2"
          onClick={() => router.push('/login')}
        >
          <Lock className="w-4 h-4" />
          Proceed to Login
        </Button>
      </div>
    </div>
  );
};
