export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type AsyncState<TData, TError = Error> = {
  status: AsyncStatus;
  data: TData | null;
  error: TError | null;
};

export const createIdleAsyncState = <TData, TError = Error>(): AsyncState<TData, TError> => ({
  status: 'idle',
  data: null,
  error: null,
});
