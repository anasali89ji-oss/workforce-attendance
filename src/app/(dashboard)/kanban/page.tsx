'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Card { id: string; title: string; description?: string; priority: string; due_date?: string; labels: string[]; position: number }
interface Column { id: string; name: string; color: string; position: number; cards: Card[] }
interface Board { id: string; name: string; columns: Column[] }

const PRI: Record<string,{label:string;color:string}> = { low:{label:'Low',color:'#94a3b8'}, medium:{label:'Medium',color:'#3b82f6'}, high:{label:'High',color:'#f59e0b'}, urgent:{label:'Urgent',color:'#ef4444'} }

export default function KanbanPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addingCol, setAddingCol] = useState<string|null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [dragging, setDragging] = useState<{cardId:string}|null>(null)
  const [over, setOver] = useState<string|null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/kanban')
    const json = await res.json()
    if (json.data) setBoards(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const board = boards[idx]

  const addCard = async (columnId: string) => {
    if (!newTitle.trim()) return
    await fetch('/api/kanban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_card', column_id: columnId, title: newTitle }) })
    setAddingCol(null); setNewTitle('')
    await load()
  }

  const moveCard = async (cardId: string, toColId: string) => {
    setBoards(prev => prev.map((b, i) => {
      if (i !== idx) return b
      let moved: Card | null = null
      const cols = b.columns.map(col => ({ ...col, cards: col.cards.filter(c => { if (c.id === cardId) { moved = c; return false } return true }) }))
      return { ...b, columns: cols.map(col => col.id === toColId && moved ? { ...col, cards: [...col.cards, moved] } : col) }
    }))
    await fetch('/api/kanban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move_card', card_id: cardId, column_id: toColId, position: 999 }) })
  }

  const deleteCard = async (cardId: string) => {
    setBoards(prev => prev.map((b, i) => i !== idx ? b : { ...b, columns: b.columns.map(col => ({ ...col, cards: col.cards.filter(c => c.id !== cardId) })) }))
    await fetch('/api/kanban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_card', card_id: cardId }) })
    toast.success('Card deleted')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading...</div>
  if (!board) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div><p style={{ color: '#64748b' }}>No boards found</p></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Kanban Board</h1>
        {boards.length > 1 && (
          <select value={idx} onChange={e => setIdx(Number(e.target.value))} style={{ height: 36, padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
            {boards.map((b, i) => <option key={b.id} value={i}>{b.name}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
        {board.columns.map(col => (
          <div key={col.id} style={{ width: 280, flexShrink: 0, background: over === col.id ? '#eef2ff' : '#f1f5f9', borderRadius: 14, display: 'flex', flexDirection: 'column', minHeight: 200, border: over === col.id ? '2px dashed #818cf8' : '2px solid transparent', transition: 'all 0.15s' }}
          onDragOver={e => { e.preventDefault(); setOver(col.id) }}
          onDragLeave={() => setOver(null)}
          onDrop={() => { if (dragging) moveCard(dragging.cardId, col.id); setDragging(null); setOver(null) }}
          >
            <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: '#374151', flex: 1 }}>{col.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#fff', padding: '1px 7px', borderRadius: 99 }}>{col.cards.length}</span>
            </div>

            <div style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.cards.map(card => {
                const pri = PRI[card.priority] || PRI.medium
                return (
                  <div key={card.id} draggable onDragStart={() => setDragging({ cardId: card.id })} onDragEnd={() => setDragging(null)}
                  style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'grab', border: '1px solid #f1f5f9', position: 'relative', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)' }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', paddingRight: 18 }}>{card.title}</p>
                    {card.description && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{card.description}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: pri.color }}>● {pri.label}</span>
                      {card.due_date && <span style={{ fontSize: 10, color: '#94a3b8' }}>📅 {new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                    <button onClick={() => deleteCard(card.id)} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: 11, padding: '2px 4px', borderRadius: 4, transition: 'all 0.15s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#ef4444'; el.style.background = '#fef2f2' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#cbd5e1'; el.style.background = 'none' }}
                    >✕</button>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '8px 10px 12px' }}>
              {addingCol === col.id ? (
                <div>
                  <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Card title..." onKeyDown={e => { if (e.key === 'Enter') addCard(col.id); if (e.key === 'Escape') { setAddingCol(null); setNewTitle('') } }} style={{ width: '100%', height: 36, border: '1.5px solid #818cf8', borderRadius: 8, padding: '0 10px', fontSize: 12, outline: 'none', background: '#fff' }} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => addCard(col.id)} style={{ flex: 1, height: 30, background: '#4f46e5', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                    <button onClick={() => { setAddingCol(null); setNewTitle('') }} style={{ height: 30, padding: '0 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingCol(col.id); setNewTitle('') }} style={{ width: '100%', height: 32, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12, borderRadius: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#fff'; el.style.color = '#4f46e5' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'none'; el.style.color = '#94a3b8' }}
                >+ Add card</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
