import { useMemo, useState } from "react";
import { CnpjApiError, fetchCnpj } from "./api";
import { CnpjSummary } from "./CnpjSummary";
import { JsonValue } from "./JsonValue";
import {
  countFilled,
  formatCurrency,
  formatDate,
  maskCep,
  maskCnpj,
  onlyDigits,
} from "./formatters";

export function CnpjPage() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requestCnpj, setRequestCnpj] = useState<string>("");

  const digits = onlyDigits(input);
  const isValid = digits.length === 14;
  const filledCount = useMemo(() => (data ? countFilled(data) : 0), [data]);
  const rawJson = useMemo(() => (data ? JSON.stringify(data, null, 2) : ""), [data]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setData(null);
    setCopied(false);
    if (!isValid) {
      setError("Digite um CNPJ válido com 14 dígitos (XX.XXX.XXX/XXXX-XX).");
      return;
    }
    setLoading(true);
    try {
      const json = await fetchCnpj(input);
      setData(json);
      const est = (json as { cnpj?: string })?.cnpj ?? digits;
      setRequestCnpj(est);
    } catch (err) {
      if (err instanceof CnpjApiError) setError(err.message);
      else if (err instanceof Error && err.name === "AbortError") return;
      else setError("Erro inesperado ao consultar CNPJ.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!rawJson) return;
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
              <span className="font-bold">CNPJ</span>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">CNPJ Lookup</h1>
              <p className="text-xs text-muted">
                Consulta direta na base pública{" "}
                <a
                  href="https://publica.cnpj.ws"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  publica.cnpj.ws
                </a>
              </p>
            </div>
          </div>
          <span className="hidden text-xs text-muted sm:block">Sem backend · cliente puro</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="cnpj-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="cnpj" className="cnpj-label">
              CNPJ
            </label>
            <input
              id="cnpj"
              inputMode="numeric"
              autoComplete="off"
              placeholder="00.000.000/0000-00"
              value={input}
              onChange={(e) => setInput(maskCnpj(e.target.value))}
              className="cnpj-input font-mono tracking-wide"
              aria-invalid={input.length > 0 && !isValid}
              aria-describedby="cnpj-help"
              disabled={loading}
              maxLength={18}
            />
            <span id="cnpj-help" className="text-xs text-muted">
              {digits.length}/14 dígitos
            </span>
          </div>
          <button
            type="submit"
            className="cnpj-btn-primary"
            disabled={!isValid || loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Spinner /> Consultando
              </>
            ) : (
              "Consultar"
            )}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-danger/30 bg-dangerBg px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
        )}

        {data !== null && (
          <div className="mt-8 flex flex-col gap-6">
            <div className="cnpj-card flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="cnpj-pill">
                  <strong className="text-text">{filledCount}</strong>{" "}
                  {filledCount === 1 ? "campo preenchido" : "campos preenchidos"}
                </span>
                {requestCnpj && (
                  <span className="cnpj-pill font-mono">{maskCnpj(requestCnpj)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="cnpj-btn-ghost"
                  onClick={() => setShowRaw((s) => !s)}
                  aria-expanded={showRaw}
                >
                  {showRaw ? "Ocultar JSON bruto" : "Ver JSON bruto"}
                </button>
                <button
                  type="button"
                  className="cnpj-btn-ghost"
                  onClick={handleCopy}
                  disabled={!data}
                >
                  {copied ? "Copiado ✓" : "Copiar JSON"}
                </button>
              </div>
            </div>

            <section className="cnpj-card p-5">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-text">Resumo</h2>
                <span className="cnpj-label">Visão geral do CNPJ</span>
              </header>
              <CnpjSummary data={data} />
            </section>

            <section className="cnpj-card p-5">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-text">
                  Todos os campos retornados pela API
                </h2>
                <span className="cnpj-label">Renderizado dinamicamente</span>
              </header>
              <AllFields data={data} />
            </section>

            {showRaw && (
              <section className="cnpj-card p-5">
                <header className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-text">JSON bruto</h2>
                  <span className="cnpj-label">Resposta da API</span>
                </header>
                <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-surface p-4 text-xs font-mono text-text">
                  {rawJson}
                </pre>
              </section>
            )}
          </div>
        )}

        {!data && !loading && !error && (
          <div className="cnpj-card mt-8 p-10 text-center">
            <p className="text-sm text-muted">
              Digite um CNPJ acima para ver o resumo e os dados completos da empresa.
            </p>
            <p className="mt-1 text-xs text-subtle">
              A consulta é feita direto na API pública, sem backend.
            </p>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 py-10 text-center text-xs text-muted">
        Sem afiliação com a Receita Federal ou com a empresa consultada.
      </footer>
    </div>
  );
}

function AllFields({ data }: { data: unknown }) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return <span className="text-sm text-subtle italic">Sem dados.</span>;
  }
  const entries = Object.entries(data as Record<string, unknown>);
  return (
    <table className="cnpj-table w-full">
      <tbody>
        {entries.map(([key, value]) => (
          <JsonValue key={key} k={key} v={value} />
        ))}
      </tbody>
    </table>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
        fill="none"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { formatCurrency, formatDate, maskCep, maskCnpj };
