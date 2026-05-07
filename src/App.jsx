import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Lexicon from './pages/Lexicon';
import EntityProfile from './pages/EntityProfile';
import Approval from './pages/Approval';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/lexicon" element={<Lexicon />} />
            <Route path="/approval" element={<Approval />} />
            <Route path="/entity/:id" element={<EntityProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/lexicon" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
