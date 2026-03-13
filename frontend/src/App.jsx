import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TelemetryLab from './pages/TelemetryLab';
import CrossYear from './pages/CrossYear';
import TeamsBattle from './pages/TeamsBattle';
import SeasonTrends from './pages/SeasonTrends';
import ReportStudio from './pages/ReportStudio';
import RaceResults from './pages/RaceResults';
import NewsHub from './pages/NewsHub';
import YouTubeHub from './pages/YouTubeHub';
import Schedule from './pages/Schedule';
import TwitterHub from './pages/TwitterHub';
import HelpCenter from './pages/HelpCenter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TelemetryLab />} />
          <Route path="/results" element={<RaceResults />} />
          <Route path="/cross-year" element={<CrossYear />} />
          <Route path="/teams" element={<TeamsBattle />} />
          <Route path="/trends" element={<SeasonTrends />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/news" element={<NewsHub />} />
          <Route path="/youtube" element={<YouTubeHub />} />
          <Route path="/twitter" element={<TwitterHub />} />
          <Route path="/reports" element={<ReportStudio />} />
          <Route path="/help" element={<HelpCenter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
