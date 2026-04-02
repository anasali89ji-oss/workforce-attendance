export default function Loading() {{
  return (
    <div className="page">
      <div style={{{{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}}}>
        <div><div className="skeleton" style={{{{width:220,height:26,borderRadius:8,marginBottom:8}}}}/><div className="skeleton" style={{{{width:160,height:14,borderRadius:6}}}}/></div>
        <div className="skeleton" style={{{{width:130,height:38,borderRadius:10}}}}/>
      </div>
      <div style={{{{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:20}}}}>
        {{Array.from({{length:4}}).map((_,i)=><div key={{i}} className="skeleton" style={{{{height:96,borderRadius:14}}}}/>)}}
      </div>
      <div className="skeleton" style={{{{height:360,borderRadius:14}}}}/>
    </div>
  )
}}
