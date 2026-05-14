'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, FileCode } from 'lucide-react'

interface ExportMenuProps {
  onExport: (format: 'csv' | 'excel' | 'pdf' | 'json') => void
  disabled?: boolean
}

export function ExportMenu({ onExport, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false)

  const formats = [
    { key: 'csv' as const, label: 'CSV', icon: FileCode, desc: 'Spreadsheet data' },
    { key: 'excel' as const, label: 'Excel', icon: FileSpreadsheet, desc: 'Formatted workbook' },
    { key: 'pdf' as const, label: 'PDF', icon: FileText, desc: 'Printable report' },
    { key: 'json' as const, label: 'JSON', icon: FileCode, desc: 'Raw data' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="btn btn-secondary btn-sm"
      >
        <Download size={14} />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 card z-50 py-1 shadow-lg anim-scale-in">
            {formats.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => { onExport(key); setOpen(false) }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors text-left"
              >
                <Icon size={16} className="text-[var(--brand-500)] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-[var(--text)]">{label}</div>
                  <div className="text-xs text-[var(--text-3)]">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
