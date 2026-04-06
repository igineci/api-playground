import clsx from "clsx";
import { useRequestContext } from "../context/RequestContext";

export default function FeedbackMessage() {
    const { stage, error, cancelledMessage } = useRequestContext();
  
    const message = cancelledMessage ?? (stage === 'error' ? error : null);
    if (!message) return null;

    const isCancelled = cancelledMessage != null;

    return (
      <p
        role={isCancelled ? 'status' : 'alert'}
        aria-live={isCancelled ? 'polite' : 'assertive'}
        aria-atomic="true"
        className={clsx(
          'font-mono text-xs text-center tracking-widest uppercase',
          cancelledMessage ? 'text-zinc-500' : 'text-red-400'
        )}
      >
        {message}
      </p>
    );
  }