import PipelineVisualizer from "./PipelineVisualizer";
import RequestComposer from "./RequestComposer";
import CountdownDisplay from "./CountdownDisplay";
import CancelButton from "./CancelButton";
import ResponseDisplay from "./ResponseDisplay";
import FeedbackMessage from "./FeedbackMessage";

export default function ApiPlayground() {
    return (
        <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
  
          <section aria-label="Request composer" className="flex flex-col gap-4 p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <RequestComposer />
          </section>

          <section aria-label="Request status" className="flex flex-col gap-4 p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <PipelineVisualizer />
            <CountdownDisplay />
            <CancelButton />
            <FeedbackMessage />
          </section>

          <ResponseDisplay />
  
        </div>
      </main>
    );
  }