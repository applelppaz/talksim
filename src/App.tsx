import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DialoguePage } from './pages/Dialogue';
import { SettingsPage } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DialoguePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
