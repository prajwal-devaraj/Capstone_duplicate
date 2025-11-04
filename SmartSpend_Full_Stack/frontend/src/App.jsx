import React, { useEffect, useState } from 'react'
import { ping } from './api'

export default function App() {
  const [status, setStatus] = useState('Checking backend...')
  const [json, setJson] = useState(null)

  useEffect(() => {
    ping().then((data) => {
      setJson(data)
      setStatus(data.ok ? '✅ Connected to Flask + MongoDB' : '❌ Not connected')
    }).catch(() => setStatus('❌ Not connected'))
  }, [])

  return (
    <div style={{fontFamily:'ui-sans-serif,system-ui',padding:'2rem'}}>
      <h1>SmartSpend Frontend</h1>
      <p>{status}</p>
      <pre style={{background:'#111', color:'#0f0', padding:'1rem', borderRadius:8}}>
        {JSON.stringify(json, null, 2)}
      </pre>
    </div>
  )
}
