import { copy } from "../content/copy";
import { Button } from "./Button";
interface StatusMessageProps {
  readonly message: string;
  readonly error?: boolean;
  readonly onRetry?: () => void;
}
export function StatusMessage({
  message,
  error = false,
  onRetry,
}: StatusMessageProps) {
  return (
    <div
      className={error ? "status-error" : "status"}
      role={error ? "alert" : "status"}
    >
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {copy.retry}
        </Button>
      )}
    </div>
  );
}
