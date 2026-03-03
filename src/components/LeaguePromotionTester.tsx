/**
 * Test Component for League Promotion System
 * 
 * This component helps test the promotion/demotion modals without waiting for the cron job.
 * Add to your routes temporarily for testing, then remove.
 * 
 * Usage:
 * import { LeaguePromotionTester } from './components/LeaguePromotionTester';
 * 
 * Then in a page:
 * <LeaguePromotionTester />
 */

import { useState } from 'react';
import { PromotionModal } from './PromotionModal';
import { DemotionModal } from './DemotionModal';
import { supabase } from '../lib/supabase';

const LEAGUES = ['Bronze', 'Prata', 'Ouro', 'Diamante', 'Campeonato'];

export function LeaguePromotionTester() {
  const [showPromotion, setShowPromotion] = useState(false);
  const [showDemotion, setShowDemotion] = useState(false);
  const [fromLeague, setFromLeague] = useState('Bronze');
  const [toLeague, setToLeague] = useState('Prata');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [badges, setBadges] = useState<any[]>([]);

  const simulatePromotion = async () => {
    setLoading(true);
    setMessage('Simulando promoção...');
    try {
      // This would normally be triggered by the cron job
      // For testing, you can manually update the database
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setMessage('❌ Usuário não autenticado');
        return;
      }

      // Manual update for testing
      await supabase
        .from('profiles')
        .update({
          previous_league: fromLeague,
          league: toLeague,
          promotion_timestamp: new Date().toISOString(),
          promotion_seen: false
        })
        .eq('id', data.user.id);

      setMessage('✅ Promoção simulada! Recarregue a página de ranking.');
      setShowPromotion(true);
    } catch (error) {
      setMessage(`❌ Erro: ${error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const simulateDemotion = async () => {
    setLoading(true);
    setMessage('Simulando regressão...');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setMessage('❌ Usuário não autenticado');
        return;
      }

      await supabase
        .from('profiles')
        .update({
          previous_league: fromLeague,
          league: toLeague,
          demotion_timestamp: new Date().toISOString(),
          demotion_seen: false
        })
        .eq('id', data.user.id);

      setMessage('✅ Regressão simulada! Recarregue a página de ranking.');
      setShowDemotion(true);
    } catch (error) {
      setMessage(`❌ Erro: ${error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testCronEndpoint = async () => {
    setLoading(true);
    setMessage('Testando endpoint /api/promotions...');
    try {
      // Vite uses import.meta.env for environment variables instead of process
      const cronSecret = import.meta.env.VITE_CRON_SECRET || 'test-secret';
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ Cron endpoint respondeu: ${JSON.stringify(data)}`);
      } else {
        setMessage(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erro de conexão: ${error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setMessage('❌ Usuário não autenticado');
      return;
    }
    setLoading(true);
    try {
      const { data: bData, error: bErr } = await supabase.rpc('get_user_badges', { p_user_id: data.user.id });
      if (bErr) {
        setMessage(`❌ Erro ao buscar broches: ${bErr.message}`);
        setBadges([]);
      } else {
        setBadges(bData || []);
        setMessage(`✅ ${bData?.length || 0} broche(s) carregado(s)`);
      }
    } catch (e) {
      console.error(e);
      setMessage('❌ Erro inesperado ao buscar broches');
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-gray-900 border border-yellow-500 text-white max-w-sm z-40 text-xs">
      <div className="font-bold mb-3 text-yellow-500">🧪 League System Tester</div>

      <div className="space-y-2 mb-3">
        <div>
          <label className="block text-xs mb-1">De:</label>
          <select
            value={fromLeague}
            onChange={(e) => setFromLeague(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-xs"
          >
            {LEAGUES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Para:</label>
          <select
            value={toLeague}
            onChange={(e) => setToLeague(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-xs"
          >
            {LEAGUES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <button
          onClick={simulatePromotion}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-1 rounded text-xs font-bold"
        >
          {loading ? 'Processando...' : '⬆️ Testar Promoção'}
        </button>

        <button
          onClick={simulateDemotion}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 py-1 rounded text-xs font-bold"
        >
          {loading ? 'Processando...' : '⬇️ Testar Regressão'}
        </button>

        <button
          onClick={testCronEndpoint}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-1 rounded text-xs font-bold"
        >
          {loading ? 'Testando...' : '⚙️ Testar Cron'}
        </button>
          <button
            onClick={fetchBadges}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 py-1 rounded text-xs font-bold"
          >
            {loading ? '...' : '📜 Ver Broches'}
          </button>
      </div>

      {message && (
        <div className="text-xs py-2 px-2 bg-gray-800 rounded border border-gray-700 mb-2">
          {message}
        </div>
      )}

      {badges.length > 0 && (
        <div className="mt-2 text-xs font-mono max-h-32 overflow-y-auto bg-gray-800 p-2 rounded">
          {badges.map((b: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span>{b.icon_emoji} {b.name}</span>
              <span className="text-gray-400">{new Date(b.earned_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      <PromotionModal
        isOpen={showPromotion}
        fromLeague={fromLeague}
        toLeague={toLeague}
        onClose={() => setShowPromotion(false)}
      />

      <DemotionModal
        isOpen={showDemotion}
        fromLeague={fromLeague}
        toLeague={toLeague}
        onClose={() => setShowDemotion(false)}
      />
    </div>
  );
}
