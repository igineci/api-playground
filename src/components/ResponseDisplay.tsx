import { useRequestContext } from '../context/RequestContext';
import { formatBody } from '../utils/format';
import clsx from 'clsx';

function getStatusStyles(status: number): string {
  if (status >= 200 && status < 300) {
    return 'text-emerald-400 border-emerald-800 bg-emerald-950';
  }
  if (status >= 400) {
    return 'text-red-400 border-red-800 bg-red-950';
  }
  return 'text-zinc-400 border-zinc-700 bg-zinc-900';
}

export default function ResponseDisplay() {
  const { response, stage } = useRequestContext();

  if (stage !== 'success' || !response) return null;

  return (
    <section className={clsx(
      'flex flex-col gap-4 p-6 rounded-lg border',
      'transition-all duration-500',
      'border-emerald-900 bg-zinc-950'
    )}>
      <div className="flex items-center gap-3">
        <span className={clsx(
          'font-mono text-xs tracking-widest uppercase px-2.5 py-1',
          'rounded-md border transition-all duration-500',
          getStatusStyles(response.status)
        )}>
          {response.status} {response.statusText}
        </span>
        <span className="font-mono text-xs text-zinc-600 tracking-wide">
          Completed in {response.durationMs}ms
        </span>
      </div>

      <pre className={clsx(
        'text-xs font-mono rounded-md p-4',
        'overflow-auto max-h-96 text-left leading-relaxed',
        'bg-black/40 text-zinc-300',
        'border border-zinc-800'
      )}>
        {formatBody(response.body)}
      </pre>
    </section>
  );
}