
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function M5Data5GTab(){
  const [balance, setBalance] = useState(512000)
  const [total] = useState(1048576)
  const [msisdn, setMsisdn] = useState('0987654321')
  const [amount, setAmount] = useState(1024)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(()=>{
    supabase.from('vnpt_config').select('balance_mb,total_mb').limit(1).single().then(({data})=>{
      if(data){ setBalance(data.balance_mb) }
    })
  },[])

  const buy = async()=>{
    setLoading(true)
    try{
      const res = await fetch('/api/mock-vnpt/msimapi/shareTraffic',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer mock_token'},
        body: JSON.stringify({
          fromMsisdn:'84912345678',
          toMsisdn:'84'+msisdn.replace(/^0/,''),
          amount,
          type:'DATA',
          effectiveDate: new Date().toISOString().split('T')[0],
          expireDate: new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0],
          note: `Xanh24 Data 5G - MSSV 2021001234 - 1GB - Test Day1`
        })
      })
      const data = await res.json()
      setResult(data)
      if(data.errorCode===0){ setBalance(prev=>prev-amount) }
    }finally{ setLoading(false) }
  }

  const percent = Math.round(balance/total*100)
  return (
    <div style={{fontFamily:'sans-serif', padding:24, maxWidth:800, margin:'0 auto'}}>
      <h1 style={{color:'#0A7A42'}}>🟢 M5 Data 5G VNPT M2M - Day 1 Mock Live</h1>
      <div style={{background:'#F0FDF4', border:'1px solid #00B578', borderRadius:12, padding:16, marginTop:16}}>
        <div style={{display:'flex', justifyContent:'space-between'}}><b>Ví bán buôn 1TB</b><span>{balance} / {total} MB - {percent}%</span></div>
        <div style={{background:'#e5e7eb', height:12, borderRadius:6, marginTop:8}}><div style={{width:percent+'%', background: percent<10?'#ef4444':'#0A7A42', height:12, borderRadius:6}}></div></div>
        {percent<10 && <div style={{color:'#ef4444', marginTop:8}}>⚠️ Cảnh báo X0 Telegram: Balance {`<`}100GB - Cần nạp thêm!</div>}
      </div>
      <div style={{marginTop:24, border:'1px solid #ddd', borderRadius:12, padding:16}}>
        <h3>Mua Data 5G Test</h3>
        <input value={msisdn} onChange={e=>setMsisdn(e.target.value)} placeholder="SĐT 0987654321" style={{padding:8, borderRadius:8, border:'1px solid #ccc', width:'100%', marginTop:8}}/>
        <div style={{display:'flex', gap:8, marginTop:12}}>
          {[1024,2048,5120].map(m=>(
            <button key={m} onClick={()=>setAmount(m)} style={{padding:'8px 12px', borderRadius:8, border: amount===m?'2px solid #0A7A42':'1px solid #ccc', background: amount===m?'#F0FDF4':'white'}}>{m/1024}GB - {m===1024?'50k 5000Xu':m===2048?'90k 9000Xu':'200k 20000Xu'}</button>
          ))}
        </div>
        <button onClick={buy} disabled={loading} style={{marginTop:16, padding:'12px 24px', background:'#0A7A42', color:'white', borderRadius:8, border:'none', width:'100%'}}>{loading?'Đang mua...':'Mua ngay -5000 Xu'}</button>
        {result && <pre style={{background:'#111', color:'#0f0', padding:12, borderRadius:8, marginTop:12, overflow:'auto'}}>{JSON.stringify(result,null,2)}</pre>}
        {result?.errorCode===422 && <div style={{color:'#ef4444', marginTop:8}}>❌ {result.errorDesc} - Rate limiting 1 req/phút - Đợi {result.retryAfter}s - BullMQ queue concurrency 1</div>}
        {result?.errorCode===0 && <div style={{color:'#0A7A42', marginTop:8}}>✅ SUCCESS - TransactionId: {result.transactionId} - Balance còn {result.balance} MB - Source: VNPT - Đã lưu data_orders + data_codes + vnpt_logs</div>}
      </div>
      <div style={{marginTop:24, fontSize:12, color:'#666'}}>Supabase: {process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0,30)}... | Mock API: /api/mock-vnpt/* | 12 Test Cases Postman + Jest đã có sẵn</div>
    </div>
  )
}
