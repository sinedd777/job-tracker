import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobDetailPage from './pages/JobDetailPage';
import Layout from './components/Layout';
import ResumePage from './pages/ResumePage';
import MailPage from './pages/MailPage';
import EmailPage from './pages/EmailPage';

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
        <Route path="/email" element={<EmailPage />} />
        <Route path="/email/:id" element={<EmailPage />} />
      </Routes>
    </Layout>
  );
};

export default App; 