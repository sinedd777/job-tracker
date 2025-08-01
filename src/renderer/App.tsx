import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobDetailPage from './pages/JobDetailPage';
import Layout from './components/Layout';
import ResumePage from './pages/ResumePage';
import ResumesListPage from './pages/ResumesListPage';
import MailPage from './pages/MailPage';
import EmailsListPage from './pages/EmailsListPage';
import EmailPage from './pages/EmailPage';
import HistoricalPage from './pages/HistoricalPage';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/historical" element={<HistoricalPage />} />
        <Route path="/job/:id" element={<JobDetailPage />} />
        <Route path="/resume" element={<ResumesListPage />} />
        <Route path="/resume/:id" element={<ResumePage />} />
        <Route path="/email" element={<EmailsListPage />} />
        <Route path="/email/:id" element={<EmailPage />} />
      </Routes>
    </Layout>
  );
};

export default App; 