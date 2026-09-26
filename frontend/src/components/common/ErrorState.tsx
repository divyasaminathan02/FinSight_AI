import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Institutional Data Service Unavailable',
  message = 'Failed to connect to the FinSight AI API backend. Please ensure the FastAPI server is running on port 8000.',
  onRetry,
}) => {
  return (
    <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-6 text-center max-w-xl mx-auto my-8">
      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-600 mb-4 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};
