import { useEffect, useState } from "react";
import { errorMessage } from "../lib/api";
interface RemoteState<T> {
  readonly key: string;
  readonly data?: T;
  readonly error?: string;
}
export function useRemote<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<RemoteState<T>>({ key: "" });
  const requestKey = key + ":" + version;
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key: requestKey, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({ key: requestKey, error: errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [requestKey, load]);
  return {
    data: state.key === requestKey ? state.data : undefined,
    error: state.key === requestKey ? state.error : undefined,
    loading: state.key !== requestKey,
    reload: () => setVersion((value) => value + 1),
  };
}
