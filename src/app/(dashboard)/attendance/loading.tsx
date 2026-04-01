export default function Loading() {
  return (
    <div className="page">
      <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:16,marginBottom:24}}>
        <div className="skeleton" style={{height:320,borderRadius:20}}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'1fr 1fr',gap:12}}>
          {Array.from({length:6}).map((_,i)=><div key={i} className="skeleton" style={{borderRadius:14}}/>)}
        </div>
      </div>
      <div className="skeleton" style={{height:56,borderRadius:14,marginBottom:16}}/>
      <div className="skeleton" style={{height:400,borderRadius:14}}/>
    </div>
  )
}
