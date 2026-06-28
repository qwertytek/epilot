import { QueryClient } from '@tanstack/react-query';

import {
  defaultQueryRetry,
  defaultQueryStaleTimeMs,
} from '#src/shared/constants/queryClient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: defaultQueryRetry,
      staleTime: defaultQueryStaleTimeMs,
    },
  },
});

export { queryClient };
