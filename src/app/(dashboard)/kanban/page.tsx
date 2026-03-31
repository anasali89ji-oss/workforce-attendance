'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Columns, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react'

interface Card { id:string; title:string; description?:string; priority:string; due_date?:string; labels:string[]; position:number }
interface Column { id:string; name:string; color:string; position:number; cards:Card[] }
interface Board { id:string; name:string; columns:Column[] }

const PRI_CFG: Record<string,{ label:string; color:string; Icon:React.FC<{size?:number;strokeWidth?:number;color?:string}> }> = {
  low:    { label:'Low',    color:'#94A3B8', Icon:CheckCircle2 },
  medium: { label:'Medium', color:'#3B82F6', Icon:Clock },
  high:   { label:'High',   color:'#F59E0B', Icon:AlertCircle },
  urgent: { label:'Urgent', color:'#EF4444', Icon:Zap },
}

export default function KanbanPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [boardIdx, setBoardIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addingCol, setAddingCol] = useState<string|null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [dragging, setDragging] = useState<{cardId:string}|null>(null)
  const [over, setOver] = useState<string|null>(null)
  const [newPriority, setNewPriority] = useState('medium')

  const load = useCallback(async () => {
    const res = await fetch('/api/kanban')
    const json = await res.json()
    if (json.data) setBoards(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const board = boards[boardIdx]

  const addCard = async (colId:string) => {
    if (!newTitle.trim()) return
    const res = await fetch('/api/kanban', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action:'create_card', column_id:colId, title:newTitle, priority:newPriority }),
    })
    if (!res.ok) { toast.error('Failed to add card'); return }
    setAddingCol(null); setNewTitle(''); setNewPriority('medium')
    await load()
  }

  const moveCard = async (cardId:string, toColId:string) => {
    // Optimistic update
    setBoards(prev => prev.map((b,i) => {
      if (i!==boardIdx) return b
      let moved:Card|null = null
      const cols = b.columns.map(col => ({ ...col, cards: col.cards.filter(c => { if(c.id===cardId){moved=c;return false}return true }) }))
      return { ...b, columns: cols.map(col => col.id===toColId&&moved ? { ...col, cards:[...col.cards,moved] } : col) }
    }))
    await fetch('/api/kanban', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'move_card', card_id:cardId, column_id:toColId, position:999 }) })
  }

  const deleteCard = async (cardId:string) => {
    setBoards(prev => prev.map((b,i) => i!==boardIdx ? b : { ...b, columns:b.columns.map(col => ({ ...col, cards:col.cards.filter(c=>c.id!==cardId) })) }))
    await fetch('/api/kanban', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'delete_card', card_id:cardId }) })
    toast.success('Card removed')
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#94A3B8', gap:8 }}>
      <div className="spinner-blue" style={{ width:20, height:20, borderRadius:'50%' }} />
      Loading board...
    </div>
  )

  if (!board) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <Columns size={40} color="#E2E8F0" strokeWidth={1.2} style={{ display:'block', margin:'0 auto 12px' }} />
      <p style={{ fontWeight:600, color:'#374151', fontSize:14 }}>No boards yet</p>
      <p style={{ color:'#94A3B8', fontSize:13, marginTop:4 }}>Complete setup to get a default board</p>
    </div>
  )

  return (
    <div style={{ animation:'fadeUp 0.35s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
          <Columns size={20} color="#2563EB" strokeWidth={2} />
          Kanban Board
        </h1>
        {boards.length > 1 && (
          <select value={boardIdx} onChange={e=>setBoardIdx(Number(e.target.value))}
          style={{ height:36, padding:'0 12px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, color:'#374151', outline:'none', background:'#fff', cursor:'pointer' }}>
            {boards.map((b,i)=><option key={b.id} value={i}>{b.name}</option>)}
          </select>
        )}
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center', fontSize:12, color:'#94A3B8' }}>
          <GripVertical size={13} strokeWidth={1.8} />
          Drag cards between columns
        </div>
      </div>

      <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:16, minHeight:500 }}>
        {board.columns.map(col => {
          const isOver = over === col.id
          return (
            <div key={col.id}
            onDragOver={e => { e.preventDefault(); setOver(col.id) }}
            onDragLeave={() => setOver(null)}
            onDrop={() => { if(dragging) moveCard(dragging.cardId, col.id); setDragging(null); setOver(null) }}
            style={{
              width:274, flexShrink:0, background: isOver?'#EFF6FF':'#F8FAFC',
              borderRadius:14, display:'flex', flexDirection:'column',
              border:`2px solid ${isOver?'#93C5FD':'#E2E8F0'}`,
              transition:'all 0.15s',
            }}>
              {/* Column header */}
              <div style={{ padding:'12px 14px 8px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:col.color, flexShrink:0 }} />
                <span style={{ fontWeight:700, fontSize:13, color:'#374151', flex:1 }}>{col.name}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#94A3B8', background:'#fff', border:'1px solid #E2E8F0', padding:'1px 7px', borderRadius:99 }}>{col.cards.length}</span>
              </div>

              {/* Cards */}
              <div style={{ flex:1, padding:'0 10px', display:'flex', flexDirection:'column', gap:8, minHeight:80 }}>
                {col.cards.map(card => {
                  const pri = PRI_CFG[card.priority] || PRI_CFG.medium
                  const { Icon:PriIcon } = pri
                  return (
                    <div key={card.id}
                    draggable
                    onDragStart={() => setDragging({ cardId:card.id })}
                    onDragEnd={() => setDragging(null)}
                    style={{
                      background:'#fff', borderRadius:10, padding:'10px 12px',
                      boxShadow:'0 1px 3px rgba(0,0,0,0.07)',
                      cursor:'grab', border:'1px solid #E2E8F0',
                      position:'relative', transition:'all 0.15s',
                      borderLeft:`3px solid ${pri.color}`,
                    }}
                    onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 4px 14px rgba(0,0,0,0.1)'; el.style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.07)'; el.style.transform='translateY(0)' }}
                    >
                      <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', paddingRight:20, lineHeight:1.4 }}>{card.title}</p>
                      {card.description && <p style={{ fontSize:11, color:'#94A3B8', marginTop:4, lineHeight:1.4 }}>{card.description}</p>}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:pri.color, display:'flex', alignItems:'center', gap:3 }}>
                          <PriIcon size={10} strokeWidth={2.5} color={pri.color} />{pri.label}
                        </span>
                        {card.due_date && (
                          <span style={{ fontSize:10, color:'#94A3B8', display:'flex', alignItems:'center', gap:3 }}>
                            <Clock size={9} strokeWidth={2} />
                            {new Date(card.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          </span>
                        )}
                      </div>
                      {(card.labels||[]).length > 0 && (
                        <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                          {card.labels.map(l => (
                            <span key={l} style={{ padding:'1px 7px', background:'#EFF6FF', color:'#2563EB', borderRadius:4, fontSize:10, fontWeight:600 }}>{l}</span>
                          ))}
                        </div>
                      )}
                      <button onClick={()=>deleteCard(card.id)} style={{
                        position:'absolute', top:7, right:7, width:20, height:20,
                        background:'none', border:'none', cursor:'pointer',
                        color:'#CBD5E1', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
                        opacity:0, transition:'all 0.15s',
                      }}
                      onMouseEnter={e => { const el=e.currentTarget as HTMLButtonElement; el.style.opacity='1'; el.style.background='#FEF2F2'; el.style.color='#DC2626' }}
                      onMouseLeave={e => { const el=e.currentTarget as HTMLButtonElement; el.style.opacity='0' }}
                      ><Trash2 size={11} strokeWidth={2} /></button>
                    </div>
                  )
                })}
              </div>

              {/* Add card */}
              <div style={{ padding:'8px 10px 12px' }}>
                {addingCol === col.id ? (
                  <div style={{ animation:'fadeUp 0.2s ease' }}>
                    <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Card title..."
                    onKeyDown={e => { if(e.key==='Enter')addCard(col.id); if(e.key==='Escape'){setAddingCol(null);setNewTitle('')} }}
                    style={{ width:'100%', height:36, border:'1.5px solid #2563EB', borderRadius:8, padding:'0 10px', fontSize:12, outline:'none', background:'#fff', marginBottom:6 }} />
                    <div style={{ display:'flex', gap:5, marginBottom:6 }}>
                      {Object.entries(PRI_CFG).map(([k,v]) => (
                        <button key={k} type="button" onClick={()=>setNewPriority(k)} style={{
                          flex:1, height:26, borderRadius:6, border:`1.5px solid ${newPriority===k?v.color:'#E2E8F0'}`,
                          background:newPriority===k?`${v.color}15`:'transparent',
                          cursor:'pointer', fontSize:10, fontWeight:700, color:newPriority===k?v.color:'#94A3B8',
                          transition:'all 0.15s',
                        }}>{v.label}</button>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={()=>addCard(col.id)} style={{ flex:1, height:30, background:'#2563EB', border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>Add Card</button>
                      <button onClick={()=>{setAddingCol(null);setNewTitle('')}} style={{ height:30, padding:'0 10px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:7, fontSize:12, color:'#64748B', cursor:'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>{setAddingCol(col.id);setNewTitle('')}} style={{
                    width:'100%', height:32, background:'none', border:'1.5px dashed #E2E8F0',
                    cursor:'pointer', color:'#94A3B8', fontSize:12, borderRadius:8,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                    transition:'all 0.15s',
                  }}
                  onMouseEnter={e => { const el=e.currentTarget as HTMLButtonElement; el.style.borderColor='#2563EB'; el.style.color='#2563EB'; el.style.background='#EFF6FF' }}
                  onMouseLeave={e => { const el=e.currentTarget as HTMLButtonElement; el.style.borderColor='#E2E8F0'; el.style.color='#94A3B8'; el.style.background='none' }}
                  >
                    <Plus size={13} strokeWidth={2} />Add card
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
