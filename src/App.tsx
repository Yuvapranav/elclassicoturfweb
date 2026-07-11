import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider } from './lib/auth-context';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ReviewsPage from './pages/ReviewsPage';
import LocationsPage from './pages/LocationsPage';
import BookingsPage from './pages/BookingsPage';
import PaymentPage from './pages/PaymentPage';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import Logo from './components/Logo';
// @ts-ignore
import turfBg from './assets/images/turf_sunset_background_1783617030520.jpg';

function AnimatedAppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen text-white relative flex flex-col justify-between">
      {/* Cinematic Background elements */}
      <div className="cinematic-bg" style={{ backgroundImage: `url(${turfBg})` }} />
      <div
        className="cinematic-overlay"
        style={{
          opacity: isHome ? 0.45 : 0.7
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Persistent Navbar */}
        <Navbar />

        {/* Main View Router */}
        <main className="flex-grow">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/bookings/payment" element={<PaymentPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>

        {/* Persistent Shared Footer */}
        <footer className="py-12 px-6 md:px-12 bg-transparent border-t border-white/5 relative z-10 mt-auto">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" />

            <div className="flex flex-wrap gap-6 text-[10px] font-mono uppercase tracking-wider text-ink-secondary justify-center">
              <span>© 2026 El Classico Turf Ltd.</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Cancellation Policy</span>
            </div>

            <div className="text-[9px] font-mono text-ink-secondary uppercase tracking-widest">
              Open daily: 24/7, all week
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AnimatedAppContent />
      </Router>
    </AuthProvider>
  );
}
