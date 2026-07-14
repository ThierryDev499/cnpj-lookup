import { useEffect, useMemo, useRef, useState } from "react";
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

const EXAMPLES: Array<{ label: string; cnpj: string }> = [
  { label: "Banco do Brasil", cnpj: "00000000000191" },
  { label: "Petrobras", cnpj: "33000167000101" },
  { label: "Caixa Escolar (sem IE)", cnpj: "11222333000181" },
];

export function CnpjPage() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [requestCnpj, setRequestCnpj] = useState<string>("");
  const [autoStarted, setAutoStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const digits = onlyDigits(input);
  const isValid = digits.length === 14;
  const filledCount = useMemo(() => (data ? countFilled(data) : 0), [data]);
  const rawJson = useMemo(() => (data ? JSON.stringify(data, null, 2) : ""), [data]);

  // Deep-link: /?cnpj=00000000000191 pré-preenche + já consulta
  useEffect(() => {
    if (typeof window === "undefined" || autoStarted) return;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("cnpj");
    if (!fromQuery) return;
    const cleaned = onlyDigits(fromQuery);
    if (cleaned.length !== 14) return;
    setInput(maskCnpj(cleaned));
    setAutoStarted(true);
    // Aguarda o próximo tick pra garantir que o input está montado
    queueMicrotask(() => handleSubmit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foco automático no input ao montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll pra resultados quando aparecem
  useEffect(() => {
    if (data && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [data]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setData(null);
    setCopied(false);
    setCopiedSummary(false);
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
      // Atualiza a URL sem recarregar a página
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("cnpj", onlyDigits(est));
        window.history.replaceState(null, "", u.toString());
      } catch {
        // ignore
      }
      // Foca o input de novo pra permitir nova consulta fácil
      inputRef.current?.focus();
    } catch (err) {
      if (err instanceof CnpjApiError) setError(err.message);
      else if (err instanceof Error && err.name === "AbortError") return;
      else setError("Erro inesperado ao consultar CNPJ.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput("");
    setData(null);
    setError(null);
    setShowRaw(false);
    setCopied(false);
    setCopiedSummary(false);
    setRequestCnpj("");
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("cnpj");
      window.history.replaceState(null, "", u.toString());
    } catch {
      // ignore
    }
    inputRef.current?.focus();
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

  function buildPlainTextSummary(): string {
    if (!data) return "";
    const d = data as Record<string, unknown>;
    const est = (d.estabelecimento ?? {}) as Record<string, unknown>;
    const rows: Array<[string, unknown]> = [
      ["Razão social", d.razao_social],
      ["Nome fantasia", (est.nome_fantasia as string) ?? d.nome_fantasia],
      ["CNPJ", (est.cnpj as string) ?? d.cnpj],
      ["Tipo", est.tipo],
      ["Situação cadastral", (est.situacao_cadastral as string) ?? d.situacao],
      ["Data da situação", (est.data_situacao_cadastral as string) ?? d.data_situacao],
      ["Capital social", d.capital_social],
      ["Endereço", est.logradouro],
      ["Número", est.numero],
      ["Bairro", est.bairro],
      ["CEP", est.cep],
      ["Município/UF", `${(est as { cidade?: { nome?: string } }).cidade?.nome ?? ""} / ${(est as { estado?: { sigla?: string } }).estado?.sigla ?? ""}`],
      ["Telefone", formatTelefonesSummary(est)],
      ["E-mail", (est.email as string) ?? d.email],
    ];
    return rows
      .map(([k, v]) => {
        const text =
          v === null || v === undefined
            ? ""
            : typeof v === "string"
            ? v
            : typeof v === "number"
            ? String(v)
            : JSON.stringify(v);
        return text ? `${k}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  async function handleCopySummary() {
    const text = buildPlainTextSummary();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopiedSummary(false);
    }
  }

  function handleExampleClick(cnpj: string) {
    setInput(maskCnpj(cnpj));
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white shadow-sm">
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
              ref={inputRef}
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
            className="mt-4 flex items-start justify-between gap-3 rounded-md border border-danger/30 bg-dangerBg px-4 py-3 text-sm text-danger"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded px-2 py-0.5 text-xs font-medium text-danger/80 hover:bg-danger/10"
            >
              ✕
            </button>
          </div>
        )}

        {data !== null && (
          <div ref={resultsRef} className="mt-8 flex flex-col gap-6">
            <div className="cnpj-card flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="cnpj-pill">
                  <strong className="text-text">{filledCount}</strong>{" "}
                  {filledCount === 1 ? "campo preenchido" : "campos preenchidos"}
                </span>
                {requestCnpj && (
                  <span className="cnpj-pill-muted-strong">{maskCnpj(requestCnpj)}</span>
                )}
                {data !== null && (
                  <span className="cnpj-pill-success">✓ Consulta concluída</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="cnpj-btn-ghost text-sm"
                  disabled={!requestCnpj || loading}
                  onClick={() => {
                    if (!requestCnpj) return;
                    const d = onlyDigits(requestCnpj);
                    window.open(
                      `https://publica.cnpj.ws/cnpj/${d}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                  title="Abre o JSON direto da API publica.cnpj.ws em outra aba"
                >
                  Abrir JSON da API ↗
                </button>
                <button
                  type="button"
                  className="cnpj-btn-ghost text-sm"
                  onClick={() => setShowRaw((s) => !s)}
                  aria-expanded={showRaw}
                >
                  {showRaw ? "Ocultar JSON bruto" : "Ver JSON bruto"}
                </button>
                <button
                  type="button"
                  className="cnpj-btn-ghost text-sm"
                  onClick={handleCopySummary}
                  disabled={!data}
                  title="Copia os campos principais em texto simples"
                >
                  {copiedSummary ? "Copiado ✓" : "Copiar resumo"}
                </button>
                <button
                  type="button"
                  className="cnpj-btn-ghost text-sm"
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
          <div className="cnpj-card mt-8 p-8 text-center">
            <p className="text-sm text-muted">
              Digite um CNPJ acima para ver o resumo e os dados completos da empresa.
            </p>
            <p className="mt-1 text-xs text-subtle">
              A consulta é feita direto na API pública, sem backend.
            </p>
            <div className="mt-5">
              <p className="cnpj-label mb-2">Exemplos pra testar</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.cnpj}
                    type="button"
                    onClick={() => handleExampleClick(ex.cnpj)}
                    className="cnpj-pill hover:bg-panel hover:text-text"
                    title={`Pré-preencher com ${maskCnpj(ex.cnpj)}`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 hidden text-xs text-subtle hover:text-muted"
            >
              Limpar
            </button>
          </div>
        )}

        {(data !== null || error) && !loading && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleReset}
              className="cnpj-btn-ghost text-sm"
            >
              Nova consulta
            </button>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 py-10 text-center text-xs text-muted">
        Sem afiliação com a Receita Federal ou com a empresa consultada.
      </footer>
    </div>
  );
}

function formatTelefonesSummary(v: Record<string, unknown>): string {
  const parts: string[] = [];
  const pick = (ddd: unknown, tel: unknown) => {
    const d = ddd ? String(ddd) : "";
    const t = tel ? String(tel) : "";
    if (!t) return;
    parts.push(d ? `(${d}) ${t}` : t);
  };
  pick(v.ddd1, v.telefone1);
  pick(v.ddd2, v.telefone2);
  pick(v.ddd_fax, v.fax);
  return parts.join(" · ");
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
