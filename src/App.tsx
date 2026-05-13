import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { SetupPage } from './pages/Setup';
import { ConversationPage } from './pages/Conversation';
import { VocabularyPage } from './pages/Vocabulary';
import { SettingsPage } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="conversation" element={<ConversationPage />} />
        <Route path="vocabulary" element={<VocabularyPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
