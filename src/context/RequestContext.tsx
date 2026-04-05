import { createContext, useContext, type ReactNode } from 'react';
import { useApiRequest } from '../hooks/useApiRequest';
import type { PipelineStage, ApiResponse } from '../types';

interface RequestContextValue {
  stage: PipelineStage;
  response: ApiResponse | null;
  error: string | null;
  cancelledMessage: string | null;
  countdown: number | null;
  sendRequest: ReturnType<typeof useApiRequest>['sendRequest'];
  cancelRequest: ReturnType<typeof useApiRequest>['cancelRequest'];
  reset: ReturnType<typeof useApiRequest>['reset'];
}

const RequestContext = createContext<RequestContextValue | null>(null);

export function RequestProvider({ children }: { children: ReactNode }) {
  const request = useApiRequest();

  return (
    <RequestContext.Provider value={request}>
      {children}
    </RequestContext.Provider>
  );
}

export function useRequestContext(): RequestContextValue {
  const context = useContext(RequestContext);

  if (context === null) {
    throw new Error('useRequestContext must be used within RequestProvider');
  }

  return context;
}