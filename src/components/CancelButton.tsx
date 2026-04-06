import { useRequestContext } from '../context/RequestContext';
import { Button } from './ui/button';

export default function CancelButton() {
  const { stage, cancelRequest } = useRequestContext();
  const isActive = stage === 'sending' || stage === 'waiting';

  if (!isActive) return null;

  return (
    <Button
      type="button"
      variant="playgroundCancel"
      onClick={cancelRequest}
      aria-label="Cancel request (Escape)"
    >
      Cancel
    </Button>
  );
}
