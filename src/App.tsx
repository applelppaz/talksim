import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DialoguePage } from './pages/Dialogue';
import { SettingsPage } from './pages/Settings';
import { HomePage as ChatHome } from './legacy/chat/pages/Home';
import { SetupPage as ChatSetup } from './legacy/chat/pages/Setup';
import { ConversationPage as ChatConversation } from './legacy/chat/pages/Conversation';
import { VocabularyPage as ChatVocab } from './legacy/chat/pages/Vocabulary';
import { useApp } from './store/AppContext';

function ModeRedirect() {
  const { settings } = useApp();
  return <Navigate to={settings.mode === 'chat' ? '/chat' : '/practice'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ModeRedirect />} />
        <Route path="practice" element={<DialoguePage />} />
        <Route path="chat" element={<ChatHome />} />
        <Route path="chat/setup" element={<ChatSetup />} />
        <Route path="chat/conversation" element={<ChatConversation />} />
        <Route path="chat/vocab" element={<ChatVocab />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
