export default function Loading() {{
  return (
    <div className="page">
      <div style={{{{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}}}>
        <div><div className="skeleton" style={{{{width:200,height:26,borderRadius:8,marginBottom:8}}}}/><div className="skeleton" style={{{{width:150,height:14,borderRadius:6}}}}/></div>
        <div className="skeleton" style={{{{width:120,height:38,borderRadius:10}}}}/>
      </div>
      <div className="skeleton" style={{{{height:400,borderRadius:14}}}}/>
    </div>
  )
}}
