import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Medications } from './pages/Medications';
import { MedicationForm } from './pages/MedicationForm';
import { History } from './pages/History';
import { Inventory } from './pages/Inventory';
import { Profiles } from './pages/Profiles';
import { Conditions } from './pages/Conditions';
import { ConditionForm } from './pages/ConditionForm';
import { ConditionDetail } from './pages/ConditionDetail';
import { DailySymptomLog } from './pages/DailySymptomLog';
import { Search } from './pages/Search';
import { AIInsights } from './pages/AIInsights';
import { NotFound } from './pages/NotFound';
import { ProfileProvider } from './context/ProfileContext';

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="medications" element={<Medications />} />
            <Route path="medications/new" element={<MedicationForm />} />
            <Route path="medications/:id/edit" element={<MedicationForm />} />
            <Route path="history" element={<History />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="conditions" element={<Conditions />} />
            <Route path="conditions/new" element={<ConditionForm />} />
            <Route path="conditions/:id" element={<ConditionDetail />} />
            <Route path="conditions/:id/edit" element={<ConditionForm />} />
            <Route path="conditions/:id/log" element={<DailySymptomLog />} />
            <Route path="search" element={<Search />} />
            <Route path="ai-insights" element={<AIInsights />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  );
}
