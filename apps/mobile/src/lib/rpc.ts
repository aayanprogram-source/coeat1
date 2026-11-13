import { ApiError, type DbFunctions, type FunctionName } from '@datapal/core';
import { errorKey } from '@datapal/i18n';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useT } from './config';
import { supabase } from './supabase';
import { useToast } from './toast';

export async function call<T = unknown, K extends FunctionName = FunctionName>(name: K, args: DbFunctions[K]['Args']): Promise<T> {
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) throw new ApiError(error.message);
  return data as T;
}

export function useRpc<T, K extends FunctionName = FunctionName>(name: K, args: DbFunctions[K]['Args'], options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: ['rpc', name, args], enabled: options.enabled ?? true, queryFn: () => call<T, K>(name, args) });
}

export function useErrorText(): (error: unknown) => string {
  const t = useT();
  return (error) => t(errorKey(error instanceof ApiError ? error.code : undefined));
}

export function useRpcMutation<K extends FunctionName>(name: K, options: { invalidate?: QueryKey[]; silent?: boolean } = {}) {
  const client = useQueryClient();
  const toast = useToast();
  const text = useErrorText();
  return useMutation<DbFunctions[K]['Returns'], unknown, DbFunctions[K]['Args']>({
    mutationFn: (args) => call(name, args),
    onSuccess: async () => {
      await Promise.all((options.invalidate ?? []).map((queryKey) => client.invalidateQueries({ queryKey })));
    },
    onError: (error) => {
      if (!options.silent) toast.show(text(error));
    },
  });
}
