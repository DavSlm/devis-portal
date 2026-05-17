'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { archiveRequestsBulk, deleteRequestsBulk } from './actions';

export interface QuoteRequestRow {
  id: string;
  created_at: string;
  email: string;
  company_name: string | null;
  full_name: string | null;
  product_type: string | null;
  perso_level: string | null;
  grammage: string | null;
  quantity: number | null;
  estimated_total: number | null;
  status: string;
  odoo_order_name: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  pending_review: 'Nouveau',
  reviewed: 'Traité',
  converted: 'Envoyé',
  archived: 'Archivé',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-[var(--qw-gold-light)] text-[var(--qw-gold-dark)]',
  reviewed: 'bg-blue-50 text-blue-700',
  converted: 'bg-green-50 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

function formatEuro(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function RequestsList({ rows }: { rows: QuoteRequestRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function runArchive() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('ids', Array.from(selected).join(','));
      await archiveRequestsBulk(fd);
      clearSelection();
    });
  }

  async function runDelete() {
    if (selected.size === 0) return;
    const ok = window.confirm(
      `Supprimer définitivement ${selected.size} demande${
        selected.size > 1 ? 's' : ''
      } ? Cette action est irréversible.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('ids', Array.from(selected).join(','));
      await deleteRequestsBulk(fd);
      clearSelection();
    });
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0;

  return (
    <div className="space-y-3">
      {someSelected && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-[var(--qw-cream)] border border-[var(--qw-cream-strong)] rounded-[var(--qw-card-radius)] px-4 py-3">
          <div className="text-sm font-medium text-ink">
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            <button
              type="button"
              onClick={clearSelection}
              className="ml-3 text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-ink transition-colors"
            >
              Annuler
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runArchive}
              disabled={pending}
              className="px-3 py-1.5 text-xs uppercase tracking-[0.06em] font-semibold rounded border border-[var(--qw-gold)] text-gold-dark hover:bg-[var(--qw-gold-light)] transition-colors disabled:opacity-60"
            >
              Archiver
            </button>
            <button
              type="button"
              onClick={runDelete}
              disabled={pending}
              className="px-3 py-1.5 text-xs uppercase tracking-[0.06em] font-semibold rounded bg-[var(--qw-error)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {rows.map((r) => (
          <MobileCard
            key={r.id}
            row={r}
            checked={selected.has(r.id)}
            onToggle={() => toggle(r.id)}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--qw-cream)]/50 text-xs uppercase tracking-[0.06em] text-ink-soft">
            <tr>
              <th className="text-left px-3 py-3 font-semibold w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th className="text-left px-4 py-3 font-semibold">Reçu le</th>
              <th className="text-left px-4 py-3 font-semibold">Client</th>
              <th className="text-left px-4 py-3 font-semibold">Projet</th>
              <th className="text-right px-4 py-3 font-semibold">Quantité</th>
              <th className="text-right px-4 py-3 font-semibold">Total est.</th>
              <th className="text-center px-4 py-3 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-t border-[var(--qw-cream-strong)] hover:bg-[var(--qw-cream)]/30 transition-colors ${
                  i === 0 ? 'border-t-0' : ''
                } ${selected.has(r.id) ? 'bg-[var(--qw-gold-light)]/30' : ''}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Sélectionner ${r.company_name ?? r.email}`}
                  />
                </td>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/quotes/${r.id}`}
                    className="block hover:text-gold-dark transition-colors"
                  >
                    <div className="font-medium text-ink">
                      {r.company_name ?? r.full_name ?? '—'}
                    </div>
                    <div className="text-xs text-ink-soft">{r.email}</div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {[r.product_type, r.perso_level, r.grammage]
                    .filter(Boolean)
                    .join(' · ')}
                  {r.odoo_order_name && (
                    <span className="ml-2 font-mono text-[11px] text-ink-soft">
                      ({r.odoo_order_name})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.quantity ? r.quantity.toLocaleString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                  {r.estimated_total ? formatEuro(r.estimated_total) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      STATUS_TONE[r.status] ?? STATUS_TONE.archived
                    }`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileCard({
  row,
  checked,
  onToggle,
}: {
  row: QuoteRequestRow;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-[var(--qw-card-radius)] border p-4 transition-colors ${
        checked ? 'border-[var(--qw-gold)] bg-[var(--qw-gold-light)]/30' : 'border-[var(--qw-cream-strong)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1"
          aria-label={`Sélectionner ${row.company_name ?? row.email}`}
        />
        <Link href={`/admin/quotes/${row.id}`} className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="font-medium text-ink truncate">
                {row.company_name ?? row.full_name ?? '—'}
              </div>
              <div className="text-xs text-ink-soft truncate">{row.email}</div>
            </div>
            <span
              className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                STATUS_TONE[row.status] ?? STATUS_TONE.archived
              }`}
            >
              {STATUS_LABEL[row.status] ?? row.status}
            </span>
          </div>
          <div className="text-xs text-ink-soft mb-2">
            {[row.product_type, row.perso_level, row.grammage].filter(Boolean).join(' · ')}
            {row.odoo_order_name && (
              <span className="ml-2 font-mono">({row.odoo_order_name})</span>
            )}
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-ink-soft">{formatDate(row.created_at)}</span>
            <span className="font-medium text-ink">
              {row.quantity ? `${row.quantity.toLocaleString('fr-FR')} u.` : '—'}
              {' · '}
              {row.estimated_total ? formatEuro(row.estimated_total) : '—'}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
