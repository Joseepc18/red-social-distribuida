import { usePushNotifications } from "../hooks/usePushNotifications";
import { pushCopy } from "../content/push-copy";
import { copy } from "../content/copy";
import { Button } from "./Button";
interface PushNotificationsProps {
  readonly userId: string;
  readonly token: string;
}
export function PushNotifications({ userId, token }: PushNotificationsProps) {
  const state = usePushNotifications(userId, token);
  return (
    <section aria-labelledby="push-heading" className="settings-option">
      <div className="min-w-0">
        <h2 id="push-heading" className="text-base">
          {pushCopy.title}
        </h2>
        <p className="muted mt-2 max-w-2xl text-sm">{pushCopy.intro}</p>
        <p role="status" className="muted mt-2 text-sm">
          {!state.supported
            ? pushCopy.unsupported
            : !state.ready
              ? copy.loading
              : state.permission === "denied"
                ? pushCopy.denied
                : state.enabled
                  ? pushCopy.active
                  : pushCopy.inactive}
        </p>
        {state.error && (
          <p role="alert" className="status-error mt-3 rounded-lg p-3 text-sm">
            {state.error}
          </p>
        )}
      </div>
      {state.supported && (
        <Button
          variant={state.enabled ? "secondary" : "primary"}
          className="shrink-0"
          disabled={
            !state.ready ||
            state.busy ||
            (state.permission === "denied" && !state.enabled)
          }
          onClick={state.toggle}
        >
          {state.busy
            ? copy.loading
            : state.enabled
              ? pushCopy.disable
              : pushCopy.enable}
        </Button>
      )}
    </section>
  );
}
