// Main App component
import UserProfile from './components/UserProfile/UserProfile'
import Chat from './components/Chat/Chat'
import Settings from './components/Settings/Settings'

function App() {
  return (
    <div className="app">
      <UserProfile />
      <Chat />
      <Settings />
    </div>
  )
}

export default App
