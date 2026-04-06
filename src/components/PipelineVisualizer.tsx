import { Fragment } from 'react';
import { useRequestContext } from '../context/RequestContext';
import { STAGES, toLabel, getStageStyles, getDotStyles } from '../utils/pipeline';

export default function PipelineVisualizer() {
  const { stage } = useRequestContext();

  return (
    <div className="flex w-full items-center">
      {STAGES.map((s, index) => (
        <Fragment key={s}>
          {index > 0 && (
            <div
              className="mx-1 h-px min-w-3 flex-1 bg-zinc-800 transition-colors duration-500 sm:mx-2"
              aria-hidden
            />
          )}
          <div className={getStageStyles(s, stage)}>
            <div className={getDotStyles(s, stage)} />
            <span>{toLabel(s)}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
