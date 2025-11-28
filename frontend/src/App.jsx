import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CollectInfo from './pages/CollectInfo';
import Chat from './pages/Chat';
function App() {
  return (
    <Routes>
      <Route path = "/" element={<Home />}/>
      <Route path = "/info" element={<CollectInfo />}/>
      <Route path = "/chat" element={<Chat />}/>
    </Routes>
  )
}

export default App
