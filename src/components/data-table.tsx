"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tabela filtrável estilo Excel — client component reutilizável.
 *
 * - SORT: clique no cabeçalho ordena asc/desc (ícone ▲▼). Usa `sortValue` se
 *   fornecido, senão deriva texto do valor cru/render.
 * - FILTER: ícone de funil por coluna abre um input; filtro = substring
 *   case-insensitive sobre `filterValue` (ou render como texto). Combina com
 *   AND entre colunas. Search global opcional no topo.
 * - Contagem "X of Y rows" quando filtrado.
 *
 * Valores devem ser serializáveis (string/number/ReactNode via render).
 * NÃO usa bigint internamente — as páginas server passam valores já prontos.
 *
 * @example
 * type Row = { grant: string; usd: number; status: ReactNode };
 *
 * const columns: Column<Row>[] = [
 *   { key: "grant", header: "Grant", sortable: true, filterable: true },
 *   {
 *     key: "usd",
 *     header: "Valor",
 *     align: "right",
 *     sortable: true,
 *     sortValue: (r) => r.usd,
 *     render: (r) => `$${r.usd.toLocaleString()}`,
 *   },
 *   { key: "status", header: "Status", render: (r) => r.status },
 * ];
 *
 * const rows: Row[] = [
 *   { grant: "Zcash Brazil", usd: 12000, status: <span>open</span> },
 *   { grant: "ZecHub", usd: 8000, status: <span>completed</span> },
 * ];
 *
 * <DataTable columns={columns} rows={rows} initialSort={{ key: "usd", dir: "desc" }} />
 */

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => ReactNode;
  /** Valor para ordenação. Se ausente, deriva texto da célula. */
  sortValue?: (row: T) => string | number;
  /** Texto-alvo do filtro. Se ausente, deriva texto da célula. */
  filterValue?: (row: T) => string;
  /**
   * "text" (default) = input de busca por substring.
   * "select" = checklist dos valores existentes na coluna (marca/desmarca),
   * para colunas com conjunto fixo (Status, Verdict, Categoria, Tipo…).
   */
  filterType?: "text" | "select";
}

type SortDir = "asc" | "desc";

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  initialSort?: { key: string; dir: SortDir };
  /** Habilita a barra de busca global no topo. Default: true. */
  globalSearch?: boolean;
  /** Classe extra do container com scroll. */
  className?: string;
  /** Altura máxima do container (qualquer valor Tailwind max-h-*). */
  maxHeight?: string;
}

const ALIGN_CLASS: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/** Texto bruto de uma célula para sort/filter quando não há acessor explícito. */
function cellText<T>(col: Column<T>, row: T): string {
  if (col.filterValue) return col.filterValue(row);
  if (col.render) return reactNodeToText(col.render(row));
  const raw = (row as Record<string, unknown>)[col.key];
  return raw == null ? "" : String(raw);
}

/** Achata um ReactNode em texto plano para filtro/sort por substring. */
function reactNodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join(" ");
  if (
    typeof node === "object" &&
    "props" in node &&
    node.props != null &&
    typeof node.props === "object" &&
    "children" in node.props
  ) {
    return reactNodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function sortKeyOf<T>(col: Column<T>, row: T): string | number {
  if (col.sortValue) return col.sortValue(row);
  const text = cellText(col, row);
  const asNum = Number(text);
  return text !== "" && !Number.isNaN(asNum) ? asNum : text.toLowerCase();
}

export function DataTable<T>({
  columns,
  rows,
  initialSort,
  globalSearch = true,
  className,
  maxHeight = "max-h-[70vh]",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
    initialSort ?? null,
  );
  const [filters, setFilters] = useState<Record<string, string>>({});
  /** Valores marcados por coluna no modo "select" (vazio = sem filtro). */
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const colByKey = useMemo(() => {
    const m = new Map<string, Column<T>>();
    for (const c of columns) m.set(c.key, c);
    return m;
  }, [columns]);

  /** Valores distintos (ordenados) por coluna "select", derivados das linhas. */
  const distinctByCol = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const col of columns) {
      if (col.filterType !== "select") continue;
      const set = new Set<string>();
      for (const row of rows) {
        const v = cellText(col, row).trim();
        if (v) set.add(v);
      }
      out.set(
        col.key,
        [...set].sort((a, b) => a.localeCompare(b)),
      );
    }
    return out;
  }, [columns, rows]);

  function hasColFilter(key: string): boolean {
    return (filters[key] ?? "").trim() !== "" || (picks[key] ?? []).length > 0;
  }

  function togglePick(key: string, value: string) {
    setPicks((prev) => {
      const cur = prev[key] ?? [];
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      return { ...prev, [key]: next };
    });
  }

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeText = Object.entries(filters).filter(
      ([, v]) => v.trim() !== "",
    );
    const activePicks = Object.entries(picks).filter(([, v]) => v.length > 0);

    return rows.filter((row) => {
      // AND entre os filtros por coluna (texto = substring).
      for (const [key, value] of activeText) {
        const col = colByKey.get(key);
        if (!col) continue;
        if (!cellText(col, row).toLowerCase().includes(value.toLowerCase())) {
          return false;
        }
      }
      // AND entre os filtros por coluna (select = pertence ao conjunto marcado).
      for (const [key, values] of activePicks) {
        const col = colByKey.get(key);
        if (!col) continue;
        if (!values.includes(cellText(col, row).trim())) return false;
      }
      // Search global: OR sobre todas as colunas.
      if (q !== "") {
        const hit = columns.some((col) =>
          cellText(col, row).toLowerCase().includes(q),
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, filters, picks, query, columns, colByKey]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = colByKey.get(sort.key);
    if (!col) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    // Cópia imutável antes de ordenar.
    return [...filtered].sort((a, b) => {
      const va = sortKeyOf(col, a);
      const vb = sortKeyOf(col, b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filtered, sort, colByKey]);

  const isFiltered =
    query.trim() !== "" ||
    Object.values(filters).some((v) => v.trim() !== "") ||
    Object.values(picks).some((v) => v.length > 0);

  function setColumnFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={className}>
      {globalSearch ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full max-w-xs rounded-lg bg-white px-3 py-1.5 text-sm text-stone-800 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-amber-500/40"
          />
          {isFiltered ? (
            <span className="shrink-0 text-xs text-stone-500 tnum">
              {sorted.length} of {rows.length} rows
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={cn("overflow-auto scroll-thin", maxHeight)}>
        <table className="w-full text-left text-sm">
          <thead className="tbl-head text-[11px] uppercase tracking-wider text-stone-500">
            <tr className="border-b border-stone-200">
              {columns.map((col) => {
                const align = ALIGN_CLASS[col.align ?? "left"];
                const isSorted = sort?.key === col.key;
                const isOpen = openFilter === col.key;
                const hasFilter = hasColFilter(col.key);
                const isSelect = col.filterType === "select";
                const options = distinctByCol.get(col.key) ?? [];
                const selected = picks[col.key] ?? [];
                return (
                  <th
                    key={col.key}
                    className={cn("px-4 py-3 font-medium align-bottom", align)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1.5",
                        col.align === "right" && "justify-end",
                        col.align === "center" && "justify-center",
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="group/sort inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-stone-900"
                        >
                          <span>{col.header}</span>
                          <SortIcon
                            state={isSorted ? (sort?.dir ?? "none") : "none"}
                          />
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}

                      {col.filterable ? (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenFilter((prev) =>
                              prev === col.key ? null : col.key,
                            )
                          }
                          aria-label={`Filter ${col.header}`}
                          className={cn(
                            "inline-flex items-center rounded-md p-1 transition-colors",
                            isOpen || hasFilter
                              ? "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20"
                              : "text-stone-300 hover:bg-stone-100 hover:text-stone-500",
                          )}
                        >
                          <FunnelIcon active={isOpen || hasFilter} />
                        </button>
                      ) : null}
                    </div>

                    {col.filterable && isOpen ? (
                      isSelect ? (
                        <div
                          className={cn(
                            "mt-1.5 max-h-56 w-max min-w-[9rem] max-w-[16rem] overflow-auto rounded-lg bg-white p-1 text-xs font-normal normal-case tracking-normal shadow-lg ring-1 ring-stone-200",
                            col.align === "right" && "ml-auto",
                          )}
                        >
                          {selected.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPicks((p) => ({ ...p, [col.key]: [] }))
                              }
                              className="mb-1 block w-full rounded px-2 py-1 text-left text-[11px] text-stone-500 hover:bg-stone-100"
                            >
                              Clear ({selected.length})
                            </button>
                          ) : null}
                          {options.length === 0 ? (
                            <p className="px-2 py-1 text-stone-400">
                              No values
                            </p>
                          ) : (
                            options.map((opt) => {
                              const on = selected.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => togglePick(col.key, opt)}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-stone-700 hover:bg-stone-100"
                                >
                                  <span
                                    className={cn(
                                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] ring-1 ring-inset",
                                      on
                                        ? "bg-amber-500 text-white ring-amber-500"
                                        : "bg-white ring-stone-300",
                                    )}
                                  >
                                    {on ? (
                                      <svg
                                        width="9"
                                        height="9"
                                        viewBox="0 0 10 10"
                                        fill="none"
                                        aria-hidden
                                      >
                                        <path
                                          d="M1.5 5.2 L4 7.5 L8.5 2.5"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    ) : null}
                                  </span>
                                  <span className="truncate">{opt}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          autoFocus
                          value={filters[col.key] ?? ""}
                          onChange={(e) =>
                            setColumnFilter(col.key, e.target.value)
                          }
                          placeholder="Filter…"
                          className="mt-1.5 w-full rounded bg-white px-2 py-1 text-xs font-normal normal-case tracking-normal text-stone-800 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-amber-500/40"
                        />
                      )
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={i}
                className="tbl-row border-b border-stone-200 last:border-0"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-2.5 text-stone-700",
                      ALIGN_CLASS[col.align ?? "left"],
                      col.align === "right" && "tnum",
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-stone-500"
                >
                  No rows match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Two-arrow sort glyph: the active direction lights up amber, the other dims. */
function SortIcon({ state }: { state: "none" | "asc" | "desc" }) {
  return (
    <svg
      width="9"
      height="13"
      viewBox="0 0 9 13"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M4.5 0.5 L7.5 4 H1.5 Z"
        className={cn(
          "transition-colors",
          state === "asc"
            ? "fill-amber-600"
            : "fill-stone-300 group-hover/sort:fill-stone-400",
        )}
      />
      <path
        d="M4.5 12.5 L1.5 9 H7.5 Z"
        className={cn(
          "transition-colors",
          state === "desc"
            ? "fill-amber-600"
            : "fill-stone-300 group-hover/sort:fill-stone-400",
        )}
      />
    </svg>
  );
}

/** Funnel filter glyph using currentColor; fills softly when a filter is on. */
function FunnelIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M1.75 3 H12.25 L8.25 7.5 V11 L5.75 12.25 V7.5 Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        className={active ? "fill-amber-500/20" : "fill-none"}
      />
    </svg>
  );
}
