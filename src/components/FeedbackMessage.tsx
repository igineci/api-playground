import clsx from "clsx";
import { useRequestContext } from "../context/RequestContext";

export default function FeedbackMessage() {
    const { stage, error, cancelledMessage } = useRequestContext();
  
    const message = cancelledMessage ?? (stage === 'error' ? error : null);
    if (!message) return null;
  
    return (
      <p className={clsx(
        'font-mono text-xs text-center tracking-widest uppercase',
        cancelledMessage ? 'text-zinc-500' : 'text-red-400'
      )}>
        {message}
      </p>
    );
  }