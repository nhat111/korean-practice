import { Link, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { vi } from './i18n/vi';
import { AiRoleplayPage } from './pages/AiRoleplayPage';
import { CustomPage } from './pages/CustomPage';
import { CustomPracticePage } from './pages/CustomPracticePage';
import { DailyPage } from './pages/DailyPage';
import { EmailExercisePage } from './pages/EmailExercisePage';
import { EmailsPage } from './pages/EmailsPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { HomePage } from './pages/HomePage';
import { ListeningPage } from './pages/ListeningPage';
import { PatternsPage } from './pages/PatternsPage';
import { ProgressPage } from './pages/ProgressPage';
import { ScenarioPlayerPage } from './pages/ScenarioPlayerPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShadowingPage } from './pages/ShadowingPage';
import { SongDetailPage } from './pages/SongDetailPage';
import { SongsPage } from './pages/SongsPage';
import { SpeakingPage } from './pages/SpeakingPage';

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
        <Route path="flashcards" element={<FlashcardsPage />} />
        <Route path="speaking" element={<SpeakingPage />} />
        <Route path="shadowing" element={<ShadowingPage />} />
        <Route path="patterns" element={<PatternsPage />} />
        <Route path="listening" element={<ListeningPage />} />
        <Route path="daily" element={<DailyPage />} />
        <Route path="songs" element={<SongsPage />} />
        <Route path="songs/:id" element={<SongDetailPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
