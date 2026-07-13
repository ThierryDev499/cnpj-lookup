import type { ReactNode } from "react";
import { autoFormat, humanizeKey } from "./formatters";

/**
 * Renderiza dinamicamente QUALQUER valor do JSON retornado pela API de CNPJ.
 * Suporta primitivos, objetos aninhados e arrays (inclusive arrays de objetos).
 * Aplica formatação automática baseada na chave do campo.
 */
export function JsonValue({
  k,
  v,
  depth = 0,
}: {
  k: string;
  v: unknown;
  depth?: number;
}): ReactNode {
  if (v === null || v === undefined || v === "") {
    return (
      <tr>
        <td className="cnpj-key align-top pr-3">{humanizeKey(k)}</td>
        <td className="cnpj-value text-subtle italic">— vazio</td>
      </tr>
    );
  }

  if (Array.isArray(v)) {
    return (
      <>
        <tr>
          <td className="cnpj-key align-top pr-3">{humanizeKey(k)}</td>
          <td className="cnpj-value">
            <span className="cnpj-pill">
              {v.length} {v.length === 1 ? "item" : "itens"}
            </span>
          </td>
        </tr>
        <tr>
          <td colSpan={2} className="!py-3">
            {v.length === 0 ? (
              <span className="cnpj-value text-subtle italic">Lista vazia</span>
            ) : (
              <div className="flex flex-col gap-3">
                {v.map((item, idx) => renderItem(item, idx, depth + 1))}
              </div>
            )}
          </td>
        </tr>
      </>
    );
  }

  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    return (
      <>
        <tr>
          <td className="cnpj-key align-top pr-3">{humanizeKey(k)}</td>
          <td className="cnpj-value">
            <details className="rounded-md border border-border bg-surface/60">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted hover:bg-surface">
                Objeto · {entries.length} {entries.length === 1 ? "campo" : "campos"}
              </summary>
              <div className="border-t border-border px-3 py-2">
                <table className="cnpj-table w-full border-collapse text-sm">
                  <tbody>
                    {entries.map(([childKey, childVal]) => (
                      <JsonValue key={childKey} k={childKey} v={childVal} depth={depth + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </td>
        </tr>
      </>
    );
  }

  // Escalar
  const formatted = autoFormat(k, v);
  if (!formatted) {
    return (
      <tr>
        <td className="cnpj-key align-top pr-3">{humanizeKey(k)}</td>
        <td className="cnpj-value text-subtle italic">— vazio</td>
      </tr>
    );
  }
  return (
    <tr>
      <td className="cnpj-key align-top pr-3">{humanizeKey(k)}</td>
      <td className="cnpj-value">{formatted}</td>
    </tr>
  );
}

function renderItem(item: unknown, idx: number, depth: number): ReactNode {
  if (item === null || item === undefined) {
    return (
      <div className="rounded-md border border-border bg-white p-3">
        <span className="cnpj-label">Item #{idx + 1}</span>
        <p className="cnpj-value text-subtle italic">vazio</p>
      </div>
    );
  }
  if (typeof item === "object" && !Array.isArray(item)) {
    const entries = Object.entries(item as Record<string, unknown>);
    return (
      <div className="rounded-md border border-border bg-white">
        <div className="border-b border-border bg-surface px-3 py-2">
          <span className="cnpj-label">Item #{idx + 1}</span>
          <span className="cnpj-pill ml-2">{entries.length} campos</span>
        </div>
        <table className="cnpj-table w-full border-collapse text-sm">
          <tbody>
            {entries.map(([childKey, childVal]) => (
              <JsonValue key={childKey} k={childKey} v={childVal} depth={depth + 1} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (Array.isArray(item)) {
    return (
      <div className="rounded-md border border-border bg-white p-3">
        <span className="cnpj-label">Item #{idx + 1}</span>
        <div className="mt-2 flex flex-col gap-2">
          {item.map((child, i) => (
            <div key={i} className="rounded border border-border bg-surface/50 p-2">
              {renderItem(child, i, depth + 1)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <span className="cnpj-label">Item #{idx + 1}</span>
      <p className="cnpj-value">{String(item)}</p>
    </div>
  );
}
