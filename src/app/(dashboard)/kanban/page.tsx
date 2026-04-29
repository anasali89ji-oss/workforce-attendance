'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Columns2, Plus, Trash2, AlertCircle, CheckCircle2,
  Clock, Zap, X, FolderOpen, ChevronDown, LayoutTemplate
} from 'lucide-react'

interface Card { id: string; title: string; description?: string; priority: string; due_date?: string; labels: string[]; position: number }
interface Column { id: string; name: string; color: string; position: number; cards: Card[] }
interface Board { id: string; name: string; description?: string; columns: Column[] }

const PRI: Record<string, { label: string; color: string; bg: string; Icon: React.FC<{size?:number;strokeWidth?:number}> }> = {
  urgent: { label:'Urgent', color:'#ef4444', bg:'#fee2e2', Icon: Zap },
  high:   { label:'High',   color:'#f59e0b', bg:'#fef3c7', Icon: AlertCircle },
  medium: { label:'Medium', color:'#3b82f6', bg:'#dbeafe', Icon: Clock },
  low:    { label:'Low',    color:'#94a3b8', bg:'#f1f5f9', Icon: CheckCircle2 },
}
const COL_COLORS = ['#4f46e5','#0891b2','#f59e0b','#10b981','#8b5cf6','#ef4444']
const TEMPLATES = [
  { id:'sprint', icon:'🚀', name:'Sprint Board',  cols:['Backlog','In Progress','In Review','Done'] },
  { id:'hr',     icon:'👥', name:'HR Board',      cols:['To Do','Screening','Onboarding','Complete'] },
  { id:'blank',  icon:'📋', name:'Blank Board',   cols:['To Do','In Progress','Done'] },
]

export default function KanbanPage() {
  const [boards,setBoards]           = useState<Board[]>([])
  const [boardIdx,setBoardIdx]       = useState(0)
  const [loading,setLoading]         = useState(true)
  const [addingCard,setAddingCard]   = useState<string|null>(null)
  const [newTitle,setNewTitle]       = useState('')
  const [newPri,setNewPri]           = useState('medium')
  const [dragCard,setDragCard]       = useState<{id:string;fromCol:string}|null>(null)
  const [overCol,setOverCol]         = useState<string|null>(null)
  const [addingCol,setAddingCol]     = useState(false)
  const [newColName,setNewColName]   = useState('')
  const [showCreate,setShowCreate]   = useState(false)
  const [newName,setNewName]         = useState('')
  const [newDesc,setNewDesc]         = useState('')
  const [tpl,setTpl]                 = useState('sprint')
  const [creating,setCreating]       = useState(false)
  const [dropdown,setDropdown]       = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/kanban')
    const json = await res.json()
    if (json.data) setBoards(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  // close dropdown on outside click
  useEffect(() => {
    if (!dropdown) return
    const close = () => setDropdown(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [dropdown])

  const board = boards[boardIdx]

  const createBoard = async () => {
    if (!newName.trim()) { toast.error('Board name required'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/kanban', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'create_board', name:newName.trim(), description:newDesc.trim(), template:tpl }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error||'Failed'); return }
      toast.success(`"${newName}" created!`)
      setShowCreate(false); setNewName(''); setNewDesc('')
      await load()
    } finally { setCreating(false) }
  }

  const addCard = async (colId: string) => {
    if (!newTitle.trim()) return
    await fetch('/api/kanban', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'create_card', column_id:colId, title:newTitle.trim(), priority:newPri }) })
    setAddingCard(null); setNewTitle(''); setNewPri('medium'); await load()
  }

  const deleteCard = async (cardId: string) => {
    setBoards(prev => prev.map((b,i) => i!==boardIdx ? b : { ...b, columns: b.columns.map(c => ({ ...c, cards:c.cards.filter(x=>x.id!==cardId) })) }))
    await fetch('/api/kanban', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete_card', card_id:cardId }) })
    toast.success('Card removed')
  }

  const moveCard = async (cardId: string, toColId: string) => {
    if (!dragCard || toColId===dragCard.fromCol) return
    setBoards(prev => prev.map((b,i) => {
      if (i!==boardIdx) return b
      let moved: Card|null = null
      const cols = b.columns.map(c => ({ ...c, cards: c.cards.filter(x => { if (x.id===cardId){moved=x;return false} return true }) }))
      return { ...b, columns: cols.map(c => c.id===toColId && moved ? {...c,cards:[...c.cards,moved]} : c) }
    }))
    await fetch('/api/kanban', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'move_card', card_id:cardId, column_id:toColId, position:9999 }) })
  }

  const addColumn = async () => {
    if (!newColName.trim()||!board) return
    const color = COL_COLORS[board.columns.length % COL_COLORS.length]
    await fetch('/api/kanban', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'create_column', board_id:board.id, name:newColName.trim(), color, position:board.columns.length }) })
    setAddingCol(false); setNewColName(''); await load(); toast.success('Column added')
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:360 }}>
      <span className="spinner spinner-lg" style={{borderTopColor:'var(--brand-500)'}}/>
    </div>
  )

  // ── Create Board Modal ────────────────────────────────────
  if (showCreate) return (
    <div className="modal-overlay">
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <div>
            <h2 style={{fontSize:15,fontWeight:800,color:'var(--text)'}}>Create New Board</h2>
            <p style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>Pick a template and name your board</p>
          </div>
          <button onClick={()=>setShowCreate(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:5,borderRadius:7,display:'flex'}}><X size={15} strokeWidth={2}/></button>
        </div>
        <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <label className="form-label" style={{marginBottom:8,display:'block'}}>Template</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9}}>
              {TEMPLATES.map(t => (
                <button key={t.id} type="button" onClick={()=>setTpl(t.id)} style={{ padding:'13px 11px', borderRadius:11, border:`2px solid ${tpl===t.id?'var(--brand-500)':'var(--border)'}`, background:tpl===t.id?'var(--brand-50)':'var(--surface-2)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                  <div style={{fontSize:20,marginBottom:6}}>{t.icon}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text)',marginBottom:3}}>{t.name}</div>
                  <div style={{fontSize:10,color:'var(--text-3)'}}>{t.cols.join(' → ')}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Board Name *</label>
            <input autoFocus className="input" placeholder="e.g. Sprint #1, HR Tasks…" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')createBoard()}}/>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="input" placeholder="What is this board for?" value={newDesc} onChange={e=>setNewDesc(e.target.value)}/>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={()=>setShowCreate(false)} className="btn btn-ghost">Cancel</button>
          <button onClick={createBoard} disabled={!newName.trim()||creating} className="btn btn-primary" style={{gap:6}}>
            {creating ? <><span className="spinner spinner-sm"/>Creating…</> : <><LayoutTemplate size={13} strokeWidth={2}/>Create Board</>}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Empty state ───────────────────────────────────────────
  if (!board) return (
    <div style={{padding:'32px 28px'}}>
      <div style={{ maxWidth:560, margin:'40px auto', textAlign:'center', padding:'48px 36px', background:'var(--surface)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'var(--shadow-md)' }}>
        <div style={{ width:68,height:68,borderRadius:18,background:'linear-gradient(135deg,var(--brand-50),#e0e7ff)',border:'1px solid var(--brand-100)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px' }}>
          <Columns2 size={30} color="var(--brand-500)" strokeWidth={1.5}/>
        </div>
        <h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:8,letterSpacing:'-0.02em'}}>No boards yet</h2>
        <p style={{color:'var(--text-3)',fontSize:13,lineHeight:1.7,marginBottom:28,maxWidth:360,margin:'0 auto 28px'}}>Create your first Kanban board to organize tasks and track team progress.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={()=>{setTpl(t.id);setShowCreate(true)}} style={{ padding:'14px 12px', borderRadius:11, border:'1px solid var(--border)', background:'var(--surface-2)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
              onMouseEnter={e=>{const el=e.currentTarget;el.style.borderColor='var(--brand-400)';el.style.background='var(--brand-50)'}}
              onMouseLeave={e=>{const el=e.currentTarget;el.style.borderColor='var(--border)';el.style.background='var(--surface-2)'}}>
              <div style={{fontSize:22,marginBottom:7}}>{t.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text)',marginBottom:3}}>{t.name}</div>
              <div style={{fontSize:10,color:'var(--text-3)',lineHeight:1.4}}>{t.cols.slice(0,2).join(' → ')}…</div>
            </button>
          ))}
        </div>
        <button onClick={()=>{setTpl('sprint');setShowCreate(true)}} className="btn btn-primary btn-lg" style={{gap:7}}>
          <Plus size={15} strokeWidth={2.5}/>Create Your First Board
        </button>
      </div>
    </div>
  )

  const totalCards = board.columns.reduce((a,c)=>a+c.cards.length,0)

  return (
    <div style={{padding:'20px 24px',height:'calc(100vh - 60px)',display:'flex',flexDirection:'column'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexShrink:0,gap:10,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {/* Board selector */}
          <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setDropdown(v=>!v)} style={{ display:'flex',alignItems:'center',gap:7,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'7px 13px',cursor:'pointer',fontSize:14,fontWeight:700,color:'var(--text)' }}>
              <Columns2 size={14} color="var(--brand-500)" strokeWidth={2}/>
              {board.name}
              <ChevronDown size={12} color="var(--text-3)" strokeWidth={2} style={{transform:dropdown?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
            </button>
            {dropdown && (
              <div style={{ position:'absolute',top:'calc(100% + 5px)',left:0,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'var(--shadow-lg)',minWidth:210,zIndex:50,overflow:'hidden',animation:'fadeDown 0.15s ease' }}>
                {boards.map((b,i) => (
                  <button key={b.id} onClick={()=>{setBoardIdx(i);setDropdown(false)}} style={{ display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 13px',background:'none',border:'none',cursor:'pointer',fontSize:13,color:i===boardIdx?'var(--brand-600)':'var(--text)',fontWeight:i===boardIdx?700:400,textAlign:'left',transition:'background 0.1s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background='var(--surface-2)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background='none'}>
                    <FolderOpen size={13} strokeWidth={1.8}/>
                    <span style={{flex:1}}>{b.name}</span>
                    <span style={{fontSize:10,color:'var(--text-3)'}}>{b.columns.reduce((a,c)=>a+c.cards.length,0)}</span>
                  </button>
                ))}
                <div style={{height:1,background:'var(--border)',margin:'3px 0'}}/>
                <button onClick={()=>{setDropdown(false);setShowCreate(true)}} style={{ display:'flex',alignItems:'center',gap:7,width:'100%',padding:'9px 13px',background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--brand-500)',fontWeight:600,textAlign:'left' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background='var(--brand-50)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background='none'}>
                  <Plus size={13} strokeWidth={2.5}/>New Board
                </button>
              </div>
            )}
          </div>
          <span style={{fontSize:11,color:'var(--text-3)'}}>{board.columns.length} cols · {totalCards} cards</span>
        </div>

        <div style={{display:'flex',gap:8}}>
          {addingCol ? (
            <div style={{display:'flex',gap:6',animation:'fadeDown 0.2s ease'}}>
              <input autoFocus className="input input-sm" placeholder="Column name…" value={newColName} onChange={e=>setNewColName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addColumn();if(e.key==='Escape')setAddingCol(false)}} style={{width:180}}/>
              <button onClick={addColumn} className="btn btn-primary btn-sm">Add</button>
              <button onClick={()=>setAddingCol(false)} className="btn btn-ghost btn-sm"><X size={12} strokeWidth={2}/></button>
            </div>
          ) : (
            <button onClick={()=>setAddingCol(true)} className="btn btn-primary btn-sm" style={{gap:5}}>
              <Plus size={12} strokeWidth={2.5}/>Add Column
            </button>
          )}
        </div>
      </div>

      {/* Board columns */}
      <div style={{display:'flex',gap:12,overflowX:'auto',flex:1,paddingBottom:8,minHeight:0,alignItems:'flex-start'}}>
        {board.columns.sort((a,b)=>a.position-b.position).map(col => {
          const isOver = overCol===col.id
          return (
            <div key={col.id}
              onDragOver={e=>{e.preventDefault();setOverCol(col.id)}}
              onDragLeave={()=>setOverCol(null)}
              onDrop={()=>{if(dragCard)moveCard(dragCard.id,col.id);setDragCard(null);setOverCol(null)}}
              style={{ width:272,minWidth:272,flexShrink:0,display:'flex',flexDirection:'column',background:isOver?'var(--brand-50)':'var(--surface-2)',border:`2px solid ${isOver?'var(--brand-400)':'var(--border)'}`,borderRadius:15,transition:'all 0.15s',maxHeight:'100%' }}>

              {/* Column header */}
              <div style={{padding:'11px 13px 9px',display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
                <div style={{width:9,height:9,borderRadius:'50%',background:col.color,flexShrink:0}}/>
                <span style={{flex:1,fontWeight:700,fontSize:13,color:'var(--text)',letterSpacing:'-0.01em'}}>{col.name}</span>
                <span style={{ fontSize:10,fontWeight:800,color:col.cards.length>0?'white':'var(--text-3)',background:col.cards.length>0?col.color:'var(--surface)',border:`1px solid ${col.cards.length>0?col.color:'var(--border)'}`,padding:'1px 7px',borderRadius:99,minWidth:20,textAlign:'center' }}>{col.cards.length}</span>
              </div>

              {/* Cards */}
              <div style={{flex:1,padding:'0 9px',overflowY:'auto',display:'flex',flexDirection:'column',gap:7,minHeight:40}}>
                {col.cards.sort((a,b)=>a.position-b.position).map(card => {
                  const pri = PRI[card.priority]||PRI.medium
                  return (
                    <div key={card.id} draggable
                      onDragStart={()=>setDragCard({id:card.id,fromCol:col.id})}
                      onDragEnd={()=>setDragCard(null)}
                      style={{ background:'var(--surface)',borderRadius:9,padding:'9px 11px',boxShadow:'var(--shadow-xs)',border:'1px solid var(--border)',borderLeft:`3px solid ${pri.color}`,cursor:'grab',position:'relative',transition:'all 0.15s' }}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.boxShadow='var(--shadow-md)';el.style.transform='translateY(-2px)'}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.boxShadow='var(--shadow-xs)';el.style.transform='none'}}
                    >
                      <p style={{fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1.4,marginBottom:card.description?5:7,paddingRight:20}}>{card.title}</p>
                      {card.description && <p style={{fontSize:11,color:'var(--text-3)',marginBottom:7,lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{card.description}</p>}
                      <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                        <span className="badge" style={{background:pri.bg,color:pri.color,border:`1px solid ${pri.color}30`,fontSize:10,gap:3,padding:'1px 6px'}}>
                          <pri.Icon size={9} strokeWidth={2.5}/>{pri.label}
                        </span>
                        {card.due_date && (
                          <span style={{fontSize:10,fontWeight:600,color:new Date(card.due_date)<new Date()?'#ef4444':'var(--text-3)',display:'flex',alignItems:'center',gap:3}}>
                            <Clock size={9} strokeWidth={2}/>{new Date(card.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          </span>
                        )}
                        {(card.labels||[]).map(l => <span key={l} style={{padding:'1px 5px',background:'var(--brand-50)',color:'var(--brand-600)',borderRadius:4,fontSize:9,fontWeight:700}}>{l}</span>)}
                      </div>
                      <button onClick={()=>deleteCard(card.id)} style={{ position:'absolute',top:6,right:6,background:'none',border:'none',cursor:'pointer',color:'transparent',padding:3,borderRadius:5,display:'flex',transition:'all 0.15s' }}
                        onMouseEnter={e=>{const el=e.currentTarget;el.style.color='#dc2626';el.style.background='#fee2e2'}}
                        onMouseLeave={e=>{const el=e.currentTarget;el.style.color='transparent';el.style.background='none'}}>
                        <Trash2 size={11} strokeWidth={2}/>
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add card */}
              <div style={{padding:'7px 9px 11px',flexShrink:0}}>
                {addingCard===col.id ? (
                  <div style={{animation:'fadeUp 0.2s ease'}}>
                    <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter')addCard(col.id);if(e.key==='Escape'){setAddingCard(null);setNewTitle('')}}}
                      placeholder="Card title…" className="input input-sm" style={{marginBottom:7}}/>
                    <div style={{display:'flex',gap:3,marginBottom:7}}>
                      {Object.entries(PRI).map(([k,v]) => (
                        <button key={k} type="button" onClick={()=>setNewPri(k)} style={{ flex:1,padding:'3px 0',borderRadius:5,border:`1.5px solid ${newPri===k?v.color:'var(--border)'}`,background:newPri===k?v.bg:'transparent',cursor:'pointer',fontSize:9,fontWeight:700,color:newPri===k?v.color:'var(--text-3)',transition:'all 0.15s' }}>{v.label}</button>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:5}}>
                      <button onClick={()=>addCard(col.id)} className="btn btn-primary btn-sm" style={{flex:1}}>Add</button>
                      <button onClick={()=>{setAddingCard(null);setNewTitle('')}} className="btn btn-ghost btn-sm"><X size={12} strokeWidth={2}/></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>{setAddingCard(col.id);setNewTitle('')}} style={{ width:'100%',height:32,background:'none',border:'1.5px dashed var(--border)',cursor:'pointer',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',gap:4,color:'var(--text-3)',fontSize:11,fontWeight:600,transition:'all 0.15s' }}
                    onMouseEnter={e=>{const el=e.currentTarget;el.style.borderColor='var(--brand-400)';el.style.color='var(--brand-500)';el.style.background='var(--brand-50)'}}
                    onMouseLeave={e=>{const el=e.currentTarget;el.style.borderColor='var(--border)';el.style.color='var(--text-3)';el.style.background='none'}}>
                    <Plus size={12} strokeWidth={2.5}/>Add card
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes fadeDown{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}
