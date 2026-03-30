'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Card { id: string; title: string; description?: string; priority: string; due_date?: string; labels: string[]; position: number; assignments?: { user?: { id: string; first_name: string; last_name: string } }[] }
interface Column { id: string; name: string; color: string; position: number; cards: Card[] }
interface Board { id: string; name: string; columns: Column[] }

const PRIORITY_COLORS: Record<string, string> = { low: 'text-gray-400', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' }
const PRIORITY_ICONS: Record<string, string> = { low: '▽', medium: '▸', high: '▴', urgent: '⚑' }

export default function KanbanPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [boardIdx, setBoardIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addingCard, setAddingCard] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [dragging, setDragging] = useState<{ cardId: string; fromColId: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/kanban')
    const json = await res.json()
    if (json.data) setBoards(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const board = boards[boardIdx]

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return
    const res = await fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_card', column_id: columnId, title: newCardTitle }),
    })
    if (!res.ok) { toast.error('Failed to add card'); return }
    setAddingCard(null)
    setNewCardTitle('')
    await load()
  }

  const moveCard = async (cardId: string, toColId: string) => {
    await fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move_card', card_id: cardId, column_id: toColId, position: 999 }),
    })
    // Optimistic update
    setBoards(prev => prev.map((b, i) => {
      if (i !== boardIdx) return b
      let movedCard: Card | null = null
      const cols = b.columns.map(col => {
        const filtered = col.cards.filter(c => { if (c.id === cardId) { movedCard = c; return false } return true })
        return { ...col, cards: filtered }
      })
      return {
        ...b,
        columns: cols.map(col => col.id === toColId && movedCard ? { ...col, cards: [...col.cards, movedCard] } : col),
      }
    }))
  }

  const deleteCard = async (cardId: string) => {
    await fetch('/api/kanban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_card', card_id: cardId }) })
    toast.success('Card deleted')
    await load()
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading board...</div>
  if (boards.length === 0) return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">🗂️</div>
      <p className="text-gray-500">No boards yet. Creating default board...</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
        {boards.length > 1 && (
          <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" value={boardIdx} onChange={e => setBoardIdx(Number(e.target.value))}>
            {boards.map((b, i) => <option key={b.id} value={i}>{b.name}</option>)}
          </select>
        )}
      </div>

      {board && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map(col => (
            <div
              key={col.id}
              className="flex-shrink-0 w-72 bg-gray-100 rounded-xl flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragging) moveCard(dragging.cardId, col.id); setDragging(null) }}
            >
              {/* Column Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="font-semibold text-gray-700 text-sm">{col.name}</span>
                  <span className="text-xs bg-white px-1.5 py-0.5 rounded-full text-gray-500 font-medium">{col.cards.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 px-3 space-y-2 min-h-[100px]">
                {col.cards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDragging({ cardId: card.id, fromColId: col.id })}
                    className="bg-white rounded-lg p-3 shadow-sm cursor-grab hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 flex-1">{card.title}</p>
                      <button onClick={() => deleteCard(card.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs transition-all">✕</button>
                    </div>
                    {card.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{card.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-medium ${PRIORITY_COLORS[card.priority]}`}>
                        {PRIORITY_ICONS[card.priority]} {card.priority}
                      </span>
                      {card.due_date && <span className="text-xs text-gray-400">📅 {new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                    {(card.labels || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {card.labels.map(l => <span key={l} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">{l}</span>)}
                      </div>
                    )}
                    {(card.assignments || []).length > 0 && (
                      <div className="flex -space-x-1 mt-2">
                        {card.assignments!.map(a => a.user && (
                          <div key={a.user.id} title={`${a.user.first_name} ${a.user.last_name}`} className="w-5 h-5 rounded-full bg-indigo-400 text-white text-xs flex items-center justify-center border border-white">
                            {a.user.first_name[0]}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add card */}
              <div className="px-3 py-3">
                {addingCard === col.id ? (
                  <div>
                    <input
                      autoFocus
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Card title..."
                      value={newCardTitle}
                      onChange={e => setNewCardTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCard(col.id); if (e.key === 'Escape') { setAddingCard(null); setNewCardTitle('') } }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => addCard(col.id)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-all">Add</button>
                      <button onClick={() => { setAddingCard(null); setNewCardTitle('') }} className="text-xs text-gray-500 hover:text-gray-900">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingCard(col.id); setNewCardTitle('') }} className="w-full text-xs text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg py-1.5 transition-all">
                    + Add card
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
