import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CollectInfo from './pages/CollectInfo';

function App() {
  return (
    <Routes>
      <Route path = "/" element={<Home />}/>
      <Route path = "/info" element={<CollectInfo />}/>
    </Routes>
  )
}

export default App