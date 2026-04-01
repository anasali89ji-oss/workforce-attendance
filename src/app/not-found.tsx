import Link from 'next/link'
export default function NotFound() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{fontSize:80,fontWeight:900,color:'var(--border-strong)',letterSpacing:'-0.06em',lineHeight:1,marginBottom:16,fontFamily:'monospace'}}>404</div>
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:8}}>Page not found</h1>
        <p style={{color:'var(--text-3)',fontSize:14,marginBottom:28,lineHeight:1.6}}>This page doesn't exist or you don't have access. Check the URL or return to your dashboard.</p>
        <Link href="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:7,padding:'11px 24px',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',borderRadius:12,textDecoration:'none',fontSize:14,fontWeight:700,boxShadow:'0 4px 16px rgba(79,70,229,0.35)'}}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
