import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TournamentList from "@/pages/TournamentList";
import TournamentSettings from "@/pages/TournamentSettings";
import PlayerManagement from "@/pages/PlayerManagement";
import Pairing from "@/pages/Pairing";
import Results from "@/pages/Results";
import Ranking from "@/pages/Ranking";
import DisplayBoard from "@/pages/DisplayBoard";
import DataCenter from "@/pages/DataCenter";
import Layout from "@/components/Layout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TournamentList />} />
        <Route path="/tournament/:id" element={<Navigate to="settings" replace />} />
        <Route path="/tournament/:id" element={<Layout />}>
          <Route path="settings" element={<TournamentSettings />} />
          <Route path="players" element={<PlayerManagement />} />
          <Route path="pairing" element={<Pairing />} />
          <Route path="results" element={<Results />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="display" element={<DisplayBoard />} />
          <Route path="data" element={<DataCenter />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
