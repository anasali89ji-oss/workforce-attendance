'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Columns2, Plus, Trash2, GripVertical, AlertCircle,
  CheckCircle2, Clock, Zap, X, ChevronDown
} from 'lucide-react'

interface Card {
  id: string; title: string; description?: string; priority: string
  due_date?: string; labels: string[]; position: number
}
interface Column { id: string; name: string; color: string; position: number; cards: Card[] }
interface Board  { id: string; name: string; columns: Column[] }

const PRI: Record<string, { label: string; color: string; bg: string; Icon: React.FC<{size?:number;strokeWidth?:number;color?:string}> }> = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: '#fee2e2', Icon: Zap },
  high:   { label: 'High',   color: '#f59e0b', bg: '#fef3c7', Icon: AlertCircle },
  medium: { label: 'Medium', color: '#3b82f6', bg: '#dbeafe', Icon: Clock },
  low:    { label: 'Low',    color: '#94a3b8', bg: '#f1f5f9', Icon: CheckCircle2 },
}

const COL_COLORS = ['#4f46e5','#0891b2','#f59e0b','#10b981','#8b5cf6','#ef4444']

export default function KanbanPage() {
  const [boards, setBoards]         = useState<Board[]>([])
  const [boardIdx, setBoardIdx]     = useState(0)
  const [loading, setLoading]       = useState(true)
  const [addingCard, setAddingCard] = useState<string|null>(null)
  const [newTitle, setNewTitle]     = useState('')
  const [newPri, setNewPri]         = useState('medium')
  const [dragCard, setDragCard]     = useState<{id:string;fromCol:string}|null>(null)
  const [overCol, setOverCol]       = useState<string|null>(null)
  const [addingCol, setAddingCol]   = useState(false)
  const [newColName, setNewColName] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/kanban')
    const json = await res.json()
    if (json.data) setBoards(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const board = boards[boardIdx]

  const addCard = async (colId: string) => {
    if (!newTitle.trim()) return
    const res = await fetch('/api/kanban', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_card', column_id: colId, title: newTitle.trim(), priority: newPri }),
    })
    if (!res.ok) { toast.error('Failed to add card'); return }
    setAddingCard(null); setNewTitle(''); setNewPri('medium')
    await load()
  }

  const deleteCard = async (cardId: string) => {
    // Optimistic remove
    setBoards(prev => prev.map((b, i) => i !== boardIdx ? b : {
      ...b, columns: b.columns.map(c => ({ ...c, cards: c.cards.filter(x => x.id !== cardId) }))
    }))
    await fetch('/api/kanban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_card', card_id: cardId }) })
    toast.success('Card removed')
  }

  const moveCard = async (cardId: string, toColId: string) => {
    if (!dragCard || toColId === dragCard.fromCol) return
    setBoards(prev => prev.map((b, i) => {
      if (i !== boardIdx) return b
      let moved: Card | null = null
      const cols = b.columns.map(c => ({ ...c, cards: c.cards.filter(x => { if (x.id === cardId) { moved = x; return false } return true }) }))
      return { ...b, columns: cols.map(c => c.id === toColId && moved ? { ...c, cards: [...c.cards, moved] } : c) }
    }))
    await fetch('/api/kanban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move_card', card_id: cardId, column_id: toColId, position: 9999 }) })
  }

  const addColumn = async () => {
    if (!newColName.trim() || !board) return
    const colorIdx = board.columns.length % COL_COLORS.length
    const res = await fetch('/api/kanban', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_column', board_id: board.id, name: newColName.trim(), color: COL_COLORS[colorIdx], position: board.columns.length }),
    })
    if (!res.ok) { toast.error('Failed to add column'); return }
    setAddingCol(false); setNewColName('')
    await load()
    toast.success('Column added')
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 12 }}>Loading board...</p>
      </div>
    </div>
  )

  if (!board) return (
    <div className="page">
      <div className="empty-state">
        <Columns2 size={48} strokeWidth={1.2} />
        <h3>No boards yet</h3>
        <p>Complete the setup wizard to generate your first Kanban board</p>
      </div>
    </div>
  )

  const totalCards = board.columns.reduce((a, c) => a + c.cards.length, 0)

  return (
    <div style={{ padding: '28px 32px', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Columns2 size={20} color="var(--brand-500)" strokeWidth={2} />
            {board.name}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>
            {board.columns.length} columns · {totalCards} cards
            {boards.length > 1 && ' — '}
            {boards.length > 1 && boards.map((b,i) => (
              <button key={b.id} onClick={() => setBoardIdx(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === boardIdx ? 'var(--brand-500)' : 'var(--text-3)', fontWeight: i === boardIdx ? 700 : 400, fontSize: 13, padding: '0 3px' }}>
                {b.name}
              </button>
            ))}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
            <GripVertical size={13} strokeWidth={1.8} />
            Drag cards between columns
          </div>
          <button onClick={() => setAddingCol(v => !v)} className="btn btn-primary btn-sm" style={{ gap: 5 }}>
            <Plus size={13} strokeWidth={2.5} />Add Column
          </button>
        </div>
      </div>

      {/* Add column inline */}
      {addingCol && (
        <div style={{ marginBottom: 14, display: 'flex', gap: 8, animation: 'fadeDown 0.2s ease', flexShrink: 0 }}>
          <input
            className="input input-sm" autoFocus placeholder="Column name..."
            value={newColName} onChange={e => setNewColName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') setAddingCol(false) }}
            style={{ maxWidth: 220 }}
          />
          <button onClick={addColumn} className="btn btn-primary btn-sm">Add</button>
          <button onClick={() => setAddingCol(false)} className="btn btn-ghost btn-sm">Cancel</button>
        </div>
      )}

      {/* Board */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', flex: 1, paddingBottom: 12, minHeight: 0, alignItems: 'flex-start' }}>
        {board.columns.sort((a, b) => a.position - b.position).map(col => {
          const isOver = overCol === col.id
          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setOverCol(col.id) }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => { if (dragCard) moveCard(dragCard.id, col.id); setDragCard(null); setOverCol(null) }}
              style={{
                width: 280, minWidth: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
                background: isOver ? 'var(--brand-50)' : 'var(--surface-2)',
                border: `2px solid ${isOver ? 'var(--brand-400)' : 'var(--border)'}`,
                borderRadius: 16, transition: 'all 0.15s', maxHeight: '100%',
              }}
            >
              {/* Col header */}
              <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{col.name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: 'var(--text-3)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  padding: '1px 7px', borderRadius: 99,
                }}>{col.cards.length}</span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, padding: '0 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                {col.cards.sort((a,b) => a.position - b.position).map(card => {
                  const pri = PRI[card.priority] || PRI.medium
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDragCard({ id: card.id, fromCol: col.id })}
                      onDragEnd={() => setDragCard(null)}
                      style={{
                        background: 'var(--surface)', borderRadius: 10, padding: '10px 12px',
                        boxShadow: 'var(--shadow-xs)', border: `1px solid var(--border)`,
                        borderLeft: `3px solid ${pri.color}`,
                        cursor: 'grab', position: 'relative',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-md)'; el.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-xs)'; el.style.transform = 'none' }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: card.description ? 5 : 8, paddingRight: 20 }}>{card.title}</p>
                      {card.description && <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.description}</p>}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: pri.bg, color: pri.color, border: `1px solid ${pri.color}30`, fontSize: 10, gap: 3 }}>
                          <pri.Icon size={9} strokeWidth={2.5} />{pri.label}
                        </span>
                        {card.due_date && (
                          <span style={{
                            fontSize: 10, color: new Date(card.due_date) < new Date() ? '#ef4444' : 'var(--text-3)',
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3
                          }}>
                            <Clock size={9} strokeWidth={2} />
                            {new Date(card.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          </span>
                        )}
                        {(card.labels || []).map(l => (
                          <span key={l} style={{ padding: '1px 6px', background: 'var(--brand-50)', color: 'var(--brand-600)', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{l}</span>
                        ))}
                      </div>

                      <button
                        onClick={() => deleteCard(card.id)}
                        style={{ position: 'absolute', top: 7, right: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 3, borderRadius: 5, display: 'flex', opacity: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.opacity = '1'; el.style.background = '#fee2e2'; el.style.color = '#dc2626' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.opacity = '0'; el.style.background = 'none'; el.style.color = 'var(--text-3)' }}
                        onFocus={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                      >
                        <Trash2 size={11} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add card */}
              <div style={{ padding: '8px 10px 12px', flexShrink: 0 }}>
                {addingCard === col.id ? (
                  <div style={{ animation: 'fadeUp 0.2s ease' }}>
                    <input
                      autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCard(col.id); if (e.key === 'Escape') { setAddingCard(null); setNewTitle('') }}}
                      placeholder="Card title..." className="input input-sm"
                      style={{ marginBottom: 8 }}
                    />
                    {/* Priority selector */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      {Object.entries(PRI).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => setNewPri(k)} style={{
                          flex: 1, padding: '4px 0', borderRadius: 6, border: `1.5px solid ${newPri === k ? v.color : 'var(--border)'}`,
                          background: newPri === k ? v.bg : 'transparent', cursor: 'pointer',
                          fontSize: 10, fontWeight: 700, color: newPri === k ? v.color : 'var(--text-3)',
                          transition: 'all 0.15s',
                        }}>{v.label}</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => addCard(col.id)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Add Card</button>
                      <button onClick={() => { setAddingCard(null); setNewTitle('') }} className="btn btn-ghost btn-sm"><X size={13} strokeWidth={2} /></button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingCard(col.id); setNewTitle('') }}
                    style={{
                      width: '100%', height: 34, background: 'none',
                      border: '1.5px dashed var(--border)', cursor: 'pointer',
                      borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      color: 'var(--text-3)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--brand-400)'; el.style.color = 'var(--brand-500)'; el.style.background = 'var(--brand-50)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-3)'; el.style.background = 'none' }}
                  >
                    <Plus size={13} strokeWidth={2.5} />Add card
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`@keyframes fadeDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}
