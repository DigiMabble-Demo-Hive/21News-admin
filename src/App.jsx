import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Lexicon from './pages/Lexicon';
import EntityProfile from './pages/EntityProfile';
import Approval from './pages/Approval';
import FeaturedContent from './pages/FeaturedContent';
import ContactSubmissions from './pages/ContactSubmissions';
import OrganizationProfile from './pages/OrganizationProfile';
import ChangeRequests from './pages/ChangeRequests';
import BlogList from './pages/BlogList';
import BlogEditor from './pages/BlogEditor';
import DocList from './pages/DocList';
import DocEditor from './pages/DocEditor';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/lexicon" element={<Lexicon />} />
            <Route path="/approval" element={<Approval />} />
            <Route path="/change-requests" element={<ChangeRequests />} />
            <Route path="/featured" element={<FeaturedContent />} />
            <Route path="/contact" element={<ContactSubmissions />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/new" element={<BlogEditor />} />
            <Route path="/blog/:id" element={<BlogEditor />} />
            <Route path="/docs" element={<DocList />} />
            <Route path="/docs/new" element={<DocEditor />} />
            <Route path="/docs/:id" element={<DocEditor />} />
            <Route path="/entity/:id" element={<EntityProfile />} />
            <Route path="/organization/:id" element={<OrganizationProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/lexicon" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}


export default App;
