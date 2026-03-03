// src/pages/BattleRoyale.tsx
// Battle Royale Memory Pairs - Main page

import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useMatchStore } from '../store/useMatchStore';
import BRLobby from '../components/BRLobby';
import BRMatch from '../components/BRMatch';

export default function BattleRoyalePage() {
  const navigate = useNavigate();
  const { user } = useGameStore();
  const { match, reset } = useMatchStore();

  if (!user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const handleBackToHome = () => {
    reset();
    navigate('/playground');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToHome}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white">
            🏆 Battle Royale
            <span className="text-xs bg-purple-600 px-2 py-1 rounded ml-2">MVP</span>
          </h1>
        </div>
      </div>

      {/* Route based on match state */}
      {!match || match.status === 'waiting' ? (
        <BRLobby
          onMatchStart={() => {
            // Match state is already set by store, just re-render
          }}
        />
      ) : (
        <BRMatch
          matchId={match.id}
          onMatchEnd={() => {
            reset();
            navigate('/playground');
          }}
        />
      )}
    </div>
  );
}
