import Header from './components/Header'
import ChatInterface from './components/ChatInterface'

export default function App() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header />
      <ChatInterface />
    </div>
  )
}
