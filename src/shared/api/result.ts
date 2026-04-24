export type Result<TData, TError = string> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

export const ok = <TData>(data: TData): Result<TData> => ({ ok: true, data });

export const err = <TError>(error: TError): Result<never, TError> => ({ ok: false, error });
