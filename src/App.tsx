import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import { useGameStore } from './store/useGameStore';
import { StarBackground } from './components/StarBackground';
import AuthPage from './pages/Auth';
import HomePage from './pages/Home';
import RankingPage from './pages/Ranking';
import ShopPage from './pages/Shop';
import ProfilePage from './pages/Profile';
import FriendsPage from './pages/Friends';
import NousStorePage from './pages/NousStore';
import StreakPage from './pages/StreakPage';
import AdminPage from './pages/Admin';
import NotificationsPage from './pages/Notifications';
import SettingsPage from './pages/Settings';
import Layout from './components/Layout';
import PlaygroundPage from './pages/Playground';
import BattleRoyalePage from './pages/BattleRoyale';
import { ChangelogModal } from './components/ChangelogModal';
import HorizontalCanvas, { CANVAS_ROUTES } from './components/HorizontalCanvas';
import { MusicPlayer } from './components/MusicPlayer';
import { initCapacitorNotifications } from './lib/notifications';
import SplashLoader from './components/SplashLoader';

// ── Inline fade-wrapper ──────────────────────────────────────────────────────
function Fade({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{children}</motion.div>;
}

// ── Mobile detection (Horizontal Canvas only on mobile) ─────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Routes ───────────────────────────────────────────────────────────────────
function AnimatedRoutes() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isCanvasRoute = CANVAS_ROUTES.includes(location.pathname as any);

  // Mobile: canvas routes use HorizontalCanvas swipe navigation
  if (isCanvasRoute && isMobile) {
    return (
      <Layout isCanvas>
        <HorizontalCanvas>
          <div className="min-h-[100dvh] pb-20 overflow-y-auto"><HomePage /></div>
          <div className="min-h-[100dvh] pb-20 overflow-y-auto"><RankingPage /></div>
          <div className="min-h-[100dvh] pb-20 overflow-y-auto"><ProfilePage /></div>
        </HorizontalCanvas>
      </Layout>
    );
  }

  // Desktop (or non-canvas route): standard Layout + Outlet routing
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          <Route path="/" element={<Fade><HomePage /></Fade>} />
          <Route path="/ranking" element={<Fade><RankingPage /></Fade>} />
          <Route path="/profile" element={<Fade><ProfilePage /></Fade>} />
          <Route path="/friends" element={<Fade><FriendsPage /></Fade>} />
          <Route path="/shop" element={<Fade><ShopPage /></Fade>} />
          <Route path="/nous" element={<Fade><NousStorePage /></Fade>} />
          <Route path="/streak" element={<Fade><StreakPage /></Fade>} />
          <Route path="/admin" element={<Fade><AdminPage /></Fade>} />
          <Route path="/notifications" element={<Fade><NotificationsPage /></Fade>} />
          <Route path="/settings" element={<Fade><SettingsPage /></Fade>} />
          <Route path="/playground" element={<Fade><PlaygroundPage /></Fade>} />
          <Route path="/battle-royale" element={<Fade><BattleRoyalePage /></Fade>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const { user, setUser, fetchProfile } = useGameStore();
  // authReady: true once we know the session state (null or user) — hides splash
  const [authReady, setAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let profileDone = false;

    // Fetch session + profile in parallel (avoids sequential await chain)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Fire profile fetch without blocking — mark ready after it resolves
        fetchProfile(session.user.id).finally(() => {
          profileDone = true;
          setAuthReady(true);
        });
      } else {
        setAuthReady(true); // No user, show auth page immediately
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        if (!profileDone) {
          fetchProfile(u.id).finally(() => setAuthReady(true));
        }
        initCapacitorNotifications().catch(console.warn);
      } else {
        setAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, fetchProfile]);

  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  const showSplash = !splashDone;

  return (
    <div className="min-h-screen relative w-full text-white bg-transparent">
      <StarBackground interactive={!user} />

      {/* ── Boot Splash — overlays everything until auth+profile ready ── */}
      {showSplash && (
        <SplashLoader isReady={authReady} onFinish={handleSplashFinish} />
      )}

      {/* ── App content — renders behind splash until splashDone ── */}
      <div className="relative z-10 w-full min-h-screen">
        {splashDone && (
          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}>
                <AuthPage />
              </motion.div>
            ) : (
              <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <BrowserRouter>
                  <MusicPlayer />
                  <ChangelogModal />
                  <AnimatedRoutes />
                </BrowserRouter>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}