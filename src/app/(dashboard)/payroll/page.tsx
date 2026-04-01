'use client'
import { DollarSign, Users, TrendingUp, FileText, Download } from 'lucide-react'

export default function PayrollPage() {
  return (
    <div className="page anim-fade-up">
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
          <DollarSign size={20} color="var(--brand-500)" strokeWidth={2}/>Payroll
        </h1>
        <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>Payroll management and salary overview</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
        {[{label:'Total Payroll',val:'Coming Soon',Icon:DollarSign,color:'#4f46e5',bg:'#eef2ff'},
          {label:'Employees',val:'—',Icon:Users,color:'#10b981',bg:'#d1fae5'},
          {label:'This Month',val:'—',Icon:TrendingUp,color:'#f59e0b',bg:'#fef3c7'},
        ].map(({label,val,Icon,color,bg})=>(
          <div key={label} className="kpi-card" style={{padding:'16px 18px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon size={19} color={color} strokeWidth={1.8}/></div>
            <div><div style={{fontSize:20,fontWeight:800,color:'var(--text)'}}>{val}</div><div style={{fontSize:11,color:'var(--text-3)',fontWeight:500}}>{label}</div></div>
          </div>
        ))}
      </div>
      <div className="card"><div className="empty-state"><DollarSign size={48} strokeWidth={1.2}/><h3>Payroll Module</h3><p>Connect your payroll provider to manage salaries, deductions, and generate payslips.</p><button className="btn btn-primary btn-sm" style={{marginTop:8}}>Configure Payroll</button></div></div>
    </div>
  )
}
