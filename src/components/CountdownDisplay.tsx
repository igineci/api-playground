import { useRequestContext } from '../context/RequestContext';
import { formatCountdown } from '../utils/format';
import clsx from 'clsx';

export default function CountdownDisplay() {
  const { countdown } = useRequestContext();

  if (countdown === null) return null;

  const isUrgent = countdown <= 5;

  return (
    <p className={clsx(
        'font-mono text-xs tracking-widest uppercase transition-colors duration-300',
        isUrgent ? 'text-red-400' : 'text-zinc-500'
      )}>
        Timeout in:{' '}
        <span className="font-medium tabular-nums">
          {formatCountdown(countdown)}
        </span>
    </p>
  );
}