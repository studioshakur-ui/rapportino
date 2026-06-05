import { type FormEvent, useState } from "react";
import { runCommanderCommand } from "./commands/CommandRouter";

const QUICK_COMMANDS = [
  "#today",
  "#risk",
  "#priority",
  "#tomorrow",
  "#cable N AH 173",
  "#equipment 415001110001",
] as const;

export default function CommanderHarnessPage(): JSX.Element {
  const [command, setCommand] = useState("#today");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute(nextCommand: string): Promise<void> {
    const value = nextCommand.trim();
    if (!value) return;

    setCommand(value);
    setBusy(true);
    setError(null);

    try {
      const output = await runCommanderCommand(value);
      setResponse(output);
    } catch (err) {
      setResponse("");
      setError(err instanceof Error ? err.message : "Errore COMMANDER.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void execute(command);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <p className="text-zinc-600 text-xs uppercase tracking-widest">COMMANDER</p>
        <h1 className="text-2xl font-semibold text-white">Console test</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void execute(item)}
            disabled={busy}
            className="rounded border border-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          className="min-h-11 flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded bg-white px-5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {busy ? "Esecuzione" : "Esegui"}
        </button>
      </form>

      <section className="border-t border-zinc-800 pt-6">
        <p className="mb-3 text-zinc-600 text-xs uppercase tracking-widest">Risposta</p>
        {error ? (
          <pre className="min-h-48 whitespace-pre-wrap rounded border border-red-900/50 bg-red-950/20 p-4 text-sm leading-6 text-red-200">
            {error}
          </pre>
        ) : (
          <pre className="min-h-48 whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
            {response || "Non lo so."}
          </pre>
        )}
      </section>
    </div>
  );
}
