import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
//simport CollectInfoPage from './pages/CollectInfoPage';
import CollectInfoWizard from './pages/CollectInfo';

function App() {
  return (
    <Routes>
      <Route path = "/" element={<Home />}/>
      <Route path = "/info" element={<CollectInfoWizard />}/>
    </Routes>
  )
}

export default App