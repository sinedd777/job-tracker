import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobDetailPage from './pages/JobDetailPage';
import Layout from './components/Layout';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/job/:id" element={<JobDetailPage />} />
      </Routes>
    </Layout>
  );
};

export default App; 