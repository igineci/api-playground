import RequestComposer from "./RequestComposer";

export default function ApiPlayground() {
    return (
        <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-8">
  
          <h1 className="text-2xl font-medium text-foreground">
            API Playground
          </h1>
  
          <section className="flex flex-col gap-4 p-6 rounded-lg border bg-card">
            <RequestComposer />
          </section>
  
        </div>
      </main>
    );
  }