'use client';

import { ApiError, type Api, type DbFunctions, type FunctionName } from '@datapal/core';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useApi } from './api-provider';
import { useErrorMessage } from './i18n-provider';
import { useToast } from './toast';

interface PostgrestResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Reads rows with the signed-in user's permissions. Row level security decides what comes back. */
export function useRows<T>(key: QueryKey, read: (api: Api) => PromiseLike<PostgrestResult<T>>, enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const { data, error } = await read(api);
      if (error) throw new ApiError(error.message);
      return data as T;
    },
  });
}

/** Calls a database function that returns a jsonb document of a known shape. */
export function useRpc<T, K extends FunctionName = FunctionName>(
  name: K,
  args: DbFunctions[K]['Args'],
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  const api = useApi();
  return useQuery({
    queryKey: ['rpc', name, args],
    enabled: options.enabled ?? true,
    ...(options.refetchInterval ? { refetchInterval: options.refetchInterval } : {}),
    queryFn: async () => {
      const { data, error } = await api.rpc(name, args as never);
      if (error) throw new ApiError(error.message);
      return data as T;
    },
  });
}

export interface RpcMutationOptions {
  invalidate?: QueryKey[];
  success?: string;
}

export function useRpcMutation<K extends FunctionName>(name: K, options: RpcMutationOptions = {}) {
  const api = useApi();
  const client = useQueryClient();
  const toast = useToast();
  const message = useErrorMessage();
  return useMutation<DbFunctions[K]['Returns'], unknown, DbFunctions[K]['Args']>({
    mutationFn: async (args) => {
      const { data, error } = await api.rpc(name, args as never);
      if (error) throw new ApiError(error.message);
      return data;
    },
    onSuccess: async () => {
      if (options.success) toast.success(options.success);
      await Promise.all((options.invalidate ?? []).map((queryKey) => client.invalidateQueries({ queryKey })));
    },
    onError: (error) => toast.error(message(error)),
  });
}
