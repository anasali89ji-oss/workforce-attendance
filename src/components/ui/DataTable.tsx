'use client'

import { useState, useMemo, ReactNode } from 'react'
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  width?: number | string
  render?: (row: T, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyTitle?: string
  emptyMessage?: string
  emptyAction?: ReactNode
  selectable?: boolean
  onSelectionChange?: (ids: string[]) => void
  bulkActions?: ReactNode
  searchable?: boolean
  searchPlaceholder?: string
  exportable?: boolean
  exportFileName?: string
  pageSize?: number
  stickyHeader?: boolean
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  toolbar?: ReactNode
}

function getVal(row: any, key: string): any {
  return key.split('.').reduce((o, k) => o?.[k], row)
}

export function DataTable<T extends { id: string }>({
  data, columns, loading, emptyTitle = 'No results', emptyMessage = 'No data found.',
  emptyAction, selectable, onSelectionChange, bulkActions,
  searchable = true, searchPlaceholder = 'Search...', exportable,
  exportFileName = 'export', pageSize: defaultPageSize = 20,
  stickyHeader, onRowClick, rowClassName, toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const filtered = useMemo(() => {
    let rows = [...data]
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r => columns.some(c => {
        const v = getVal(r, c.key as string)
        return v != null && String(v).toLowerCase().includes(q)
      }))
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = getVal(a, sortKey), bv = getVal(b, sortKey)
        if (av == null) return 1; if (bv == null) return -1
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, search, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const toggleRow = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
    onSelectionChange?.([...next])
  }

  const toggleAll = () => {
    const allIds = paged.map(r => r.id)
    const allSelected = allIds.every(id => selected.has(id))
    const next = new Set(selected)
    if (allSelected) allIds.forEach(id => next.delete(id))
    else allIds.forEach(id => next.add(id))
    setSelected(next)
    onSelectionChange?.([...next])
  }

  const exportCSV = () => {
    const headers = columns.map(c => c.header)
    const rows = filtered.map(r => columns.map(c => {
      const v = getVal(r, c.key as string)
      return v != null ? `"${String(v).replace(/"/g, '""')}"` : ''
    }))
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${exportFileName}.csv`
    a.click()
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} color="var(--text-3)" style={{ flexShrink: 0 }} />
    return sortDir === 'asc'
      ? <ChevronUp size={12} color="var(--brand-500)" style={{ flexShrink: 0 }} />
      : <ChevronDown size={12} color="var(--brand-500)" style={{ flexShrink: 0 }} />
  }

  const allOnPageSelected = paged.length > 0 && paged.every(r => selected.has(r.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      {(searchable || exportable || toolbar) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 200 }}>
            {searchable && (
              <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                <Search size={13} color="var(--text-3)" strokeWidth={1.8} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  className="input input-sm"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ paddingLeft: 30 }}
                />
              </div>
            )}
            {toolbar}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            {exportable && (
              <button onClick={exportCSV} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                <Download size={13} strokeWidth={2} />Export
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--brand-50)', borderBottom: '1px solid var(--brand-100)', flexShrink: 0, animation: 'fadeDown 0.15s ease' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-700)' }}>{selected.size} selected</span>
          {bulkActions}
          <button onClick={() => { setSelected(new Set()); onSelectionChange?.([]) }} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: stickyHeader ? 'auto' : 'visible' }}>
        {loading ? (
          <div style={{ padding: '12px 16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                {selectable && <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />}
                {columns.map(c => <div key={c.key as string} className="skeleton" style={{ height: 20, flex: 1, borderRadius: 6 }} />)}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>{emptyTitle}</h3>
            <p>{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : (
          <table className="data-table">
            <thead style={stickyHeader ? { position: 'sticky', top: 0, zIndex: 1 } : {}}>
              <tr>
                {selectable && (
                  <th style={{ width: 40, paddingRight: 8 }}>
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} style={{ accentColor: 'var(--brand-500)', width: 14, height: 14 }} />
                  </th>
                )}
                {columns.map(col => (
                  <th key={col.key as string} style={{ width: col.width, textAlign: col.align || 'left', cursor: col.sortable ? 'pointer' : 'default', userSelect: col.sortable ? 'none' : 'auto' }}
                    onClick={() => col.sortable && toggleSort(col.key as string)}
                    className={col.sortable ? 'sortable' : ''}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {col.header}
                      {col.sortable && <SortIcon col={col.key as string} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => (
                <tr key={row.id}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  className={rowClassName?.(row)}
                >
                  {selectable && (
                    <td style={{ paddingRight: 8 }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} style={{ accentColor: 'var(--brand-500)', width: 14, height: 14 }} />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key as string} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row, idx) : String(getVal(row, col.key as string) ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Rows per page:</span>
            <select className="input input-sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} style={{ width: 70, height: 28, fontSize: 12 }}>
              {[10, 20, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost btn-sm" style={{ padding: '4px 7px' }}>
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-ghost btn-sm" style={{ padding: '4px 7px' }}>
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
