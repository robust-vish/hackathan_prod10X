import { Bot, Zap } from 'lucide-react'

export default function Header() {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexShrink: 0 }}>
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={18} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#4f46e5' }}>IndiaMART</span>
            <span style={{ color: '#0f172a' }}> Project Planner</span>
          </h1>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>AI Productivity Copilot · Hackathon 2025</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 999, padding: '5px 12px' }}>
          <Zap size={11} color="#6366f1" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>10x Productivity</span>
        </div>
      </div>
    </header>
  )
}
