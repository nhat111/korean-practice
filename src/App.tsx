import { Link, Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { vi } from './i18n/vi';
import { AboutPage } from './pages/AboutPage';
import { AiRoleplayPage } from './pages/AiRoleplayPage';
import { CustomPage } from './pages/CustomPage';
import { CustomPracticePage } from './pages/CustomPracticePage';
import { DailyPage } from './pages/DailyPage';
import { EmailExercisePage } from './pages/EmailExercisePage';
import { EmailsPage } from './pages/EmailsPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { GrammarLessonPage, GrammarPage } from './pages/GrammarPage';
import { HomePage } from './pages/HomePage';
import { InterpretPage } from './pages/InterpretPage';
import { ListeningPage } from './pages/ListeningPage';
import { MessagesPage } from './pages/MessagesPage';
import { PassivePage } from './pages/PassivePage';
import { PatternsPage } from './pages/PatternsPage';
import { ProgressPage } from './pages/ProgressPage';
import { ScenarioPlayerPage } from './pages/ScenarioPlayerPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShadowingPage } from './pages/ShadowingPage';
import { TypingPage } from './pages/TypingPage';
import { WeakPage } from './pages/WeakPage';
import { SpeakingFreePage, SpeakingPage } from './pages/SpeakingPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="scenarios" element={<ScenariosPage />} />
        <Route path="scenarios/:id" element={<ScenarioPlayerPage />} />
        <Route path="custom" element={<CustomPage />} />
        <Route path="custom/:id" element={<CustomPracticePage />} />
        <Route path="emails" element={<EmailsPage />} />
        <Route path="emails/:id" element={<EmailExercisePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="typing" element={<TypingPage />} />
        <Route path="flashcards" element={<FlashcardsPage />} />
        <Route path="speaking" element={<SpeakingPage />} />
        <Route path="speaking/free" element={<SpeakingFreePage />} />
        <Route path="shadowing" element={<ShadowingPage />} />
        <Route path="patterns" element={<PatternsPage />} />
        <Route path="listening" element={<ListeningPage />} />
        <Route path="interpret" element={<InterpretPage />} />
        <Route path="passive" element={<PassivePage />} />
        <Route path="daily" element={<DailyPage />} />
        <Route path="weak" element={<WeakPage />} />
        <Route path="grammar" element={<GrammarPage />} />
        <Route path="grammar/:id" element={<GrammarLessonPage />} />
        {/* The K-pop songs section was replaced by grammar; keep old links working. */}
        <Route path="songs/*" element={<Navigate to="/grammar" replace />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="ai-roleplay" element={<AiRoleplayPage />} />
        <Route
          path="*"
          element={
            <div className="card center stack-sm">
              <p>{vi.common.notFound}</p>
              <Link to="/" className="btn">
                {vi.nav.home}
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
