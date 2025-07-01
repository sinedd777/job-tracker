import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobDetailPage from './pages/JobDetailPage';
import Layout from './components/Layout';
import ResumePage from './pages/ResumePage';
import MailPage from './pages/MailPage';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/job/:id" element={<JobDetailPage />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/resume/:id" element={<ResumePage />} />
        <Route path="/mail" element={<MailPage />} />
        <Route path="/mail/:id" element={<MailPage />} />
      </Routes>
    </Layout>
  );
};

export default App; 