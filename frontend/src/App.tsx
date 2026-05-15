import { useState } from 'react'
import { Search, PlusCircle, BookOpen, Cpu } from 'lucide-react'
import Header from './components/Header'
import TicketAnalyzer from './components/TicketAnalyzer'
import TicketCreator from './components/TicketCreator'

type Tab = 'analyze' | 'create'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('analyze')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'analyze'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search size={16} />
              Analyze Ticket
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <PlusCircle size={16} />
              Create Ticket
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analyze' && <TicketAnalyzer />}
        {activeTab === 'create' && <TicketCreator />}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Cpu size={14} />
            <span>Powered by Google Gemini · IndiaMART Hackathon 2025</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen size={12} /> RCA + A/B Hypothesis + Ticket Management
            </span>
            <span>Theme: 10x Productivity</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
