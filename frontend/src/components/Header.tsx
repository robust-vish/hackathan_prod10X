import { Bot, Zap } from 'lucide-react'

export default function Header() {
  return (
    <header className="gradient-header text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2.5">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">RCA + A/B + Ticket Agent</h1>
            <p className="text-blue-200 text-xs font-medium">AI Engineering Productivity Copilot · IndiaMART Hackathon 2025</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
          <Zap size={14} className="text-yellow-300" />
          <span className="text-xs font-semibold text-white">10x Productivity</span>
        </div>
      </div>
    </header>
  )
}
