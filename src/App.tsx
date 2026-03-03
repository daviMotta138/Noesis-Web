import { useEffect } from 'react';
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
import { ChangelogModal } from './components/ChangelogModal';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          <Route path="/" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><HomePage /></motion.div>} />
          <Route path="/ranking" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><RankingPage /></motion.div>} />
          <Route path="/friends" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><FriendsPage /></motion.div>} />
          <Route path="/shop" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ShopPage /></motion.div>} />
          <Route path="/profile" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ProfilePage /></motion.div>} />
          <Route path="/nous" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><NousStorePage /></motion.div>} />
          <Route path="/streak" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><StreakPage /></motion.div>} />
          <Route path="/admin" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdminPage /></motion.div>} />
          <Route path="/notifications" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><NotificationsPage /></motion.div>} />
          <Route path="/settings" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><SettingsPage /></motion.div>} />
          <Route path="/playground" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><PlaygroundPage /></motion.div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const { user, setUser, fetchProfile } = useGameStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); fetchProfile(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
    });
    return () => subscription.unsubscribe();
  }, [setUser, fetchProfile]);

  const content = !user ? (
    <AnimatePresence mode="wait">
      <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}>
        <AuthPage />
      </motion.div>
    </AnimatePresence>
  ) : (
    <AnimatePresence mode="wait">
      <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        <BrowserRouter>
          <ChangelogModal />
          <AnimatedRoutes />
        </BrowserRouter>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen relative w-full text-white bg-transparent">
      <StarBackground interactive={!user} />
      <div className="relative z-10 w-full min-h-screen">
        {content}
      </div>
    </div>
  );
}