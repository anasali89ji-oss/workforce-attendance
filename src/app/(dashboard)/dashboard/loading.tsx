export default function Loading() {
  return (
    <div className="page" style={{animation:'none'}}>
      <div style={{marginBottom:28,display:'flex',justifyContent:'space-between'}}>
        <div><div className="skeleton" style={{width:280,height:28,marginBottom:8}}/><div className="skeleton" style={{width:200,height:16}}/></div>
        <div className="skeleton" style={{width:100,height:24}}/>
      </div>
      <div className="skeleton" style={{height:120,borderRadius:20,marginBottom:24}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:24}}>
        {Array.from({length:6}).map((_,i)=><div key={i} className="skeleton" style={{height:100,borderRadius:14}}/>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
        <div className="skeleton" style={{height:280,borderRadius:16}}/>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="skeleton" style={{height:130,borderRadius:14}}/>
          <div className="skeleton" style={{height:130,borderRadius:14}}/>
        </div>
      </div>
    </div>
  )
}
