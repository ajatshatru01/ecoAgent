import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CollectInfo from './pages/CollectInfo';
import ResultPage from './pages/ResultPage';

function App() {
  return (
    <Routes>
      <Route path = "/" element={<Home />}/>
      <Route path = "/info" element={<CollectInfo />}/>
      <Route path = "/result" element={<ResultPage />}/>
    </Routes>
  )
}

export default App