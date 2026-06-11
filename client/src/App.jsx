import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import HostSetup from './pages/HostSetup.jsx';
import HostGame from './pages/HostGame.jsx';
import PlayerGame from './pages/PlayerGame.jsx';
import EditorList from './pages/EditorList.jsx';
import QuizEditor from './pages/QuizEditor.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host" element={<HostSetup />} />
      <Route path="/host/game" element={<HostGame />} />
      <Route path="/play" element={<PlayerGame />} />
      <Route path="/editor" element={<EditorList />} />
      <Route path="/editor/new" element={<QuizEditor />} />
      <Route path="/editor/:id" element={<QuizEditor />} />
    </Routes>
  );
}
