import clsx from 'clsx';
import { useRequestContext } from '../context/RequestContext';

export default function CancelButton() {
  const { stage, cancelRequest } = useRequestContext();
  const isActive = stage === 'sending' || stage === 'waiting';

  if (!isActive) return null;

  return (
    <button
      onClick={cancelRequest}
      aria-label="Cancel request (Escape)"
      className={clsx(
        'w-full px-4 py-2 rounded-md border',
        'font-mono text-xs tracking-widest uppercase',
        'text-zinc-400 border-zinc-700 bg-transparent',
        'hover:text-red-400 hover:border-red-800 hover:bg-red-950',
        'transition-all duration-300'
      )}
    >
      Cancel
    </button>
  );
}