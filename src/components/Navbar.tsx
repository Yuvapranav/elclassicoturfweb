import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../lib/auth-context';
import { LogOut, ShieldCheck, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [visible, setVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      // Scroll down -> hide, scroll up -> show
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 30;
      
      setVisible(isVisible);
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out bg-gradient-to-b from-black/80 via-black/30 to-transparent py-4 px-6 md:px-12
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-16 pointer-events-none'}`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
          <Logo size="sm" />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink 
            to="/" 
            className={({ isActive }) => `text-xs uppercase tracking-wide transition-all cursor-pointer ${isActive ? 'font-bold text-white' : 'font-medium text-ink-secondary hover:text-white'}`}
          >
            Home
          </NavLink>
          <NavLink 
            to="/locations" 
            className={({ isActive }) => `text-xs uppercase tracking-wide transition-all cursor-pointer ${isActive ? 'font-bold text-white' : 'font-medium text-ink-secondary hover:text-white'}`}
          >
            Locations
          </NavLink>
          <NavLink 
            to="/bookings" 
            className={({ isActive }) => `text-xs uppercase tracking-wide transition-all cursor-pointer ${isActive ? 'font-bold text-white' : 'font-medium text-ink-secondary hover:text-white'}`}
          >
            My Bookings
          </NavLink>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="liquid-glass rounded-full px-4 py-1.5 flex items-center gap-2.5 border border-white/10 shadow-md">
              {/* User badge */}
              <div className="flex flex-col items-end mr-1">
                <span className="text-[11px] font-semibold text-white tracking-wide leading-tight">
                  {user.name}
                </span>
                <span className="text-[8px] font-sans tracking-wide text-ink-secondary uppercase font-semibold">
                  {user.role === 'admin' ? 'Director' : 'Member'}
                </span>
              </div>

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 px-3 py-1 text-[9px] font-sans font-bold uppercase tracking-wide rounded-full bg-white text-brand-navy hover:scale-105 transition-all duration-300"
                >
                  <ShieldCheck className="w-2.5 h-2.5" strokeWidth={2} />
                  Admin
                </Link>
              )}

              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Logout"
                className="p-1 rounded-full hover:bg-white/10 text-ink-secondary hover:text-white transition-all duration-300 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 bg-white text-brand-navy text-[10px] font-sans font-bold uppercase tracking-wider rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-md shadow-white/5 cursor-pointer"
            >
              Begin Journey
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-white/5 text-ink-secondary transition-all"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" strokeWidth={1.5} /> : <Menu className="w-4 h-4" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-[65px] left-0 right-0 bg-black/90 backdrop-blur-md border-b border-white/10 p-4 shadow-xl flex flex-col gap-2 md:hidden animate-in fade-in duration-300">
          <NavLink 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => `w-full text-left py-2 px-4 text-xs font-sans uppercase tracking-wide rounded-full transition-all ${isActive ? 'bg-white/5 font-bold text-white' : 'text-ink-secondary hover:text-white'}`}
          >
            Home
          </NavLink>
          <NavLink 
            to="/locations" 
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => `w-full text-left py-2 px-4 text-xs font-sans uppercase tracking-wide rounded-full transition-all ${isActive ? 'bg-white/5 font-bold text-white' : 'text-ink-secondary hover:text-white'}`}
          >
            Locations
          </NavLink>
          <NavLink 
            to="/bookings" 
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => `w-full text-left py-2 px-4 text-xs font-sans uppercase tracking-wide rounded-full transition-all ${isActive ? 'bg-white/5 font-bold text-white' : 'text-ink-secondary hover:text-white'}`}
          >
            My Bookings
          </NavLink>
        </div>
      )}
    </nav>
  );
}
