import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, TurfType, DashboardStats, TurfLocation, TurfConfig } from '../types';
import { TURF_CONFIGS, TURF_LOCATIONS, TIME_SLOTS } from '../utils/mockData';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPatch, apiPost, apiDelete } from '../lib/api';
import CustomChart from '../components/CustomChart';
import Logo from '../components/Logo';
import {
  BarChart3,
  Calendar,
  Users,
  Search,
  Ban,
  Lock,
  ChevronDown,
  Clock,
  TrendingUp,
  DollarSign,
  BookOpen,
  Percent,
  LineChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Flame
} from 'lucide-react';

type LocationWithConfigs = TurfLocation & { turfConfigs: TurfConfig[] };

interface CustomerRow {
  name: string;
  phone: string;
  bookingsCount: number;
  totalSpend: number;
  lastBookingDate: string;
}

interface Analytics {
  revenue: {
    today: number;
    thisMonth: number;
    lastMonth: number;
    outstanding: number;
    collectedAllTime: number;
  };
  counts: { paid: number; pending: number; cancelled: number; active: number };
  revenueByBranch: { locationId: string; name: string; revenue: number; bookings: number }[];
  dailyTrend: { date: string; revenue: number; bookings: number }[];
  bestDay: { date: string; revenue: number } | null;
  peakSlots: { timeSlot: string; count: number }[];
}

const EMPTY_STATS: DashboardStats = {
  totalBookingsToday: 0,
  totalRevenueToday: 0,
  totalBookingsThisMonth: 0,
  occupancyRate: 0
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Enforce Admin-only access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login?redirect=admin');
    }
  }, [user, navigate]);

  // Dashboard Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'bookings' | 'slots' | 'customers'>('overview');

  // 1. Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState('');

  // 2. Slot Management states
  const [slotManageDate, setSlotManageDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slotManageTurf, setSlotManageTurf] = useState<TurfType>('5-a-side');
  const [slotManageLocation, setSlotManageLocation] = useState<string>('potheri');

  // Data from the server
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [customerList, setCustomerList] = useState<CustomerRow[]>([]);
  const [apiLocations, setApiLocations] = useState<LocationWithConfigs[]>([]);

  const isAdmin = !!user && user.role === 'admin';

  const refreshStats = useCallback(() => {
    if (!isAdmin) return;
    apiGet<DashboardStats>('/admin/stats').then(setStats).catch(() => setStats(EMPTY_STATS));
    apiGet<Analytics>('/admin/analytics').then(setAnalytics).catch(() => setAnalytics(null));
  }, [isAdmin]);

  const refreshBookings = useCallback(() => {
    if (!isAdmin) return;
    apiGet<Booking[]>('/admin/bookings').then(setAllBookings).catch(() => setAllBookings([]));
  }, [isAdmin]);

  const refreshCustomers = useCallback(() => {
    if (!isAdmin) return;
    apiGet<CustomerRow[]>('/admin/customers').then(setCustomerList).catch(() => setCustomerList([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    refreshStats();
    refreshBookings();
    refreshCustomers();
    apiGet<LocationWithConfigs[]>('/locations').then(setApiLocations).catch(() => setApiLocations([]));
  }, [isAdmin, refreshStats, refreshBookings, refreshCustomers]);

  // Filter Bookings for Bookings Table (client-side over the fetched set)
  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      const matchesDate = !dateFilter || b.date === dateFilter;
      const matchesLocation = locationFilter === 'All' || b.locationId === locationFilter;
      return matchesSearch && matchesStatus && matchesDate && matchesLocation;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first
  }, [allBookings, searchQuery, statusFilter, dateFilter, locationFilter]);

  // Resolve real turfConfigId for the slot-blocker's selected location + turf type
  const slotManageTurfConfigId = useMemo(() => {
    const loc = apiLocations.find(l => l.id === slotManageLocation);
    return loc?.turfConfigs.find(tc => (tc as any).type === slotManageTurf)?.id;
  }, [apiLocations, slotManageLocation, slotManageTurf]);

  // Slots representation for selected date in Slot Management
  const slotGridStatus = useMemo(() => {
    return TIME_SLOTS.map(slot => {
      const activeBooking = allBookings.find(
        b => b.date === slotManageDate && b.turfType === slotManageTurf && b.timeSlot === slot && b.status !== 'Cancelled' && b.locationId === slotManageLocation
      );
      return {
        slot,
        booking: activeBooking || null
      };
    });
  }, [allBookings, slotManageDate, slotManageTurf, slotManageLocation]);

  // Month-over-month revenue change (%) for the Sales view; null when there's
  // no prior month to compare against.
  const momChange = useMemo(() => {
    if (!analytics || analytics.revenue.lastMonth <= 0) return null;
    const { thisMonth, lastMonth } = analytics.revenue;
    return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  }, [analytics]);

  const maxBranchRevenue = useMemo(
    () => Math.max(1, ...(analytics?.revenueByBranch.map((b) => b.revenue) ?? [1])),
    [analytics],
  );
  const maxPeakCount = useMemo(
    () => Math.max(1, ...(analytics?.peakSlots.map((s) => s.count) ?? [1])),
    [analytics],
  );

  const handleUpdateBookingStatus = async (id: string, status: string, paymentStatus?: string) => {
    try {
      await apiPatch(`/admin/bookings/${id}`, { status, paymentStatus });
      refreshBookings();
      refreshStats();
    } catch (e) {
      alert('Failed to update booking.');
    }
  };

  // Handle slot block/unblock action
  const handleToggleSlotBlock = async (slot: string, existingBooking: Booking | null) => {
    if (existingBooking) {
      if (existingBooking.customerName === 'ADMIN LOCK') {
        // Unblock manual lock -> delete booking completely
        try {
          await apiDelete(`/admin/slot-block/${existingBooking.id}`);
          refreshBookings();
          refreshStats();
        } catch (e) {
          alert('Failed to unblock slot.');
        }
      } else {
        // Regular booking -> ask to cancel
        if (confirm(`Do you want to CANCEL the booking of ${existingBooking.customerName} at ${slot}?`)) {
          handleUpdateBookingStatus(existingBooking.id, 'Cancelled');
        }
      }
    } else {
      if (!slotManageTurfConfigId) {
        alert('Turf configuration not loaded yet, please try again in a moment.');
        return;
      }
      try {
        await apiPost('/admin/slot-block', {
          locationId: slotManageLocation,
          turfConfigId: slotManageTurfConfigId,
          date: slotManageDate,
          timeSlot: slot
        });
        refreshBookings();
        refreshStats();
      } catch (e) {
        alert('Failed to block slot.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row text-white font-sans relative">

      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 liquid-glass border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between p-6 flex-shrink-0 z-20 font-sans">
        <div className="space-y-8 text-left">

          {/* Logo element */}
          <div className="flex justify-start">
            <Logo size="sm" />
          </div>

          {/* Nav List */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-sans font-semibold uppercase tracking-wider text-ink-secondary mb-3 pl-3">
              Workspace
            </span>

            {[
              { id: 'overview', label: 'Live Overview', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'analytics', label: 'Sales & Insights', icon: <LineChart className="w-4 h-4" /> },
              { id: 'bookings', label: 'Bookings Table', icon: <Calendar className="w-4 h-4" /> },
              { id: 'slots', label: 'Slot Blocker', icon: <Clock className="w-4 h-4" /> },
              { id: 'customers', label: 'Customer Directory', icon: <Users className="w-4 h-4" /> }
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-sans font-medium tracking-wide uppercase transition-all duration-300 cursor-pointer text-left
                    ${isSelected
                      ? 'bg-white text-brand-navy font-bold shadow-lg scale-[0.98]'
                      : 'text-ink-secondary hover:text-white hover:bg-white/5'}`}
                >
                  <span className={`${isSelected ? 'text-brand-navy' : 'text-ink-secondary'}`}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="pt-6 border-t border-white/5 mt-8 text-left hidden md:block">
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-ink-secondary">
            System Status
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-sans text-white">Live Connection</span>
          </div>
          <span className="text-[8px] font-sans text-ink-secondary block mt-1">v2.0.0 • Prestige Console</span>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 text-left max-w-6xl mx-auto w-full font-sans">

        {/* Workspace Title bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/5 mb-8 gap-4">
          <div>
            <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wider">
              El Classico Control Panel
            </span>
            <h2 className="font-sans font-light text-white text-3xl md:text-4xl tracking-tight leading-none mt-2 capitalize">
              {activeTab === 'overview'
                ? 'Live Analytics & Performance'
                : activeTab === 'analytics'
                  ? 'Sales & Insights'
                  : `${activeTab} Management`}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-sans text-white uppercase tracking-wider">
              System: Online
            </span>
            <span className="px-3.5 py-1.5 bg-white text-brand-navy rounded-full text-[9px] font-sans font-bold uppercase tracking-wider shadow-lg">
              Role: Director
            </span>
          </div>
        </div>

        {/* ==================== A. OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-rise duration-500">

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Today's Revenue */}
              <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wide text-ink-secondary">Revenue Today</span>
                  <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-sans font-light text-white">₹{stats.totalRevenueToday.toLocaleString('en-IN')}</h3>
                  <div className="flex items-center gap-1 text-[9px] text-ink-secondary mt-1 font-sans uppercase tracking-wide">
                    <TrendingUp className="w-3 h-3 text-white/80" />
                    <span>Real-time tracking</span>
                  </div>
                </div>
              </div>

              {/* Total Bookings Today */}
              <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wide text-ink-secondary">Bookings Today</span>
                  <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-sans font-light text-white">{stats.totalBookingsToday}</h3>
                  <p className="text-[9px] font-sans text-ink-secondary mt-1 uppercase tracking-wide">Slots allocated</p>
                </div>
              </div>

              {/* Bookings This Month */}
              <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wide text-ink-secondary">Bookings Month</span>
                  <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-sans font-light text-white">{stats.totalBookingsThisMonth}</h3>
                  <p className="text-[9px] font-sans text-ink-secondary mt-1 uppercase tracking-wide">This calendar month</p>
                </div>
              </div>

              {/* Occupancy Rate */}
              <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wide text-ink-secondary">Occupancy Today</span>
                  <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-sans font-light text-white">{stats.occupancyRate}%</h3>

                  {/* Miniature visual bar */}
                  <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all duration-700"
                      style={{ width: `${stats.occupancyRate}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Custom SVG Interactive Chart block */}
            <div className="liquid-glass p-6 rounded-2xl border border-white/5">
              <CustomChart bookings={allBookings} />
            </div>

            {/* Recent Bookings Peek Table */}
            <div className="liquid-glass p-6 rounded-2xl border border-white/5 space-y-4 font-sans">
              <div className="flex justify-between items-center">
                <h3 className="font-sans font-semibold text-white text-base tracking-tight">Recent reservations</h3>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-[10px] font-sans font-bold uppercase tracking-wide text-white hover:opacity-80 cursor-pointer transition-opacity"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-ink-secondary uppercase font-sans font-semibold tracking-wider text-[9px]">
                      <th className="pb-3 text-left font-semibold">Ref ID</th>
                      <th className="pb-3 text-left font-semibold">Customer</th>
                      <th className="pb-3 text-left font-semibold">Date</th>
                      <th className="pb-3 text-left font-semibold">Slot</th>
                      <th className="pb-3 text-left font-semibold">Arena</th>
                      <th className="pb-3 text-right font-semibold">Amount</th>
                      <th className="pb-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBookings.slice(0, 5).map((b) => {
                      const isBlock = b.customerName === 'ADMIN LOCK';
                      return (
                        <tr key={b.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all duration-200">
                          <td className="py-3 font-sans font-medium text-white">{b.id}</td>
                          <td className="py-3 text-white font-medium">
                            {isBlock ? (
                              <span className="text-slate-300 font-sans text-[9px] uppercase tracking-wide bg-white/10 border border-white/10 px-1.5 py-0.5 rounded">BLOCK</span>
                            ) : b.customerName}
                          </td>
                          <td className="py-3 font-sans text-ink-secondary">{b.date}</td>
                          <td className="py-3 font-sans text-ink-secondary">{b.timeSlot}</td>
                          <td className="py-3 text-ink-secondary capitalize">{b.turfType}</td>
                          <td className="py-3 text-right font-sans text-white">
                            {isBlock ? '-' : `₹${b.amount.toLocaleString('en-IN')}`}
                          </td>
                          <td className="py-3 text-right font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-sans uppercase tracking-wide border
                              ${b.status === 'Completed' || b.status === 'Confirmed'
                                ? 'bg-white/10 text-white border-white/20' :
                                b.status === 'Cancelled'
                                  ? 'bg-red-400/10 text-red-300 border-red-400/20' :
                                  'bg-white/5 text-white/50 border-white/10'}`}>
                              {b.status === 'Confirmed' ? 'Booked' : b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== A2. SALES & INSIGHTS TAB ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-rise duration-500">
            {!analytics ? (
              <div className="liquid-glass p-12 rounded-2xl border border-white/5 text-center text-ink-secondary text-sm">
                Loading sales data…
              </div>
            ) : (
              <>
                {/* Revenue summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* This month + MoM trend */}
                  <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">Revenue This Month</span>
                      <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white"><DollarSign className="w-3.5 h-3.5" /></div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-light text-white">₹{analytics.revenue.thisMonth.toLocaleString('en-IN')}</h3>
                      {momChange === null ? (
                        <p className="text-[9px] text-ink-secondary mt-1 uppercase tracking-wide">No prior month to compare</p>
                      ) : (
                        <div className={`flex items-center gap-1 text-[10px] mt-1 font-semibold ${momChange >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {momChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{Math.abs(momChange)}% vs last month</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Outstanding (money owed) */}
                  <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">Payments Due</span>
                      <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-amber-300"><Wallet className="w-3.5 h-3.5" /></div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-light text-amber-300">₹{analytics.revenue.outstanding.toLocaleString('en-IN')}</h3>
                      <p className="text-[9px] text-ink-secondary mt-1 uppercase tracking-wide">{analytics.counts.pending} unpaid bookings</p>
                    </div>
                  </div>

                  {/* Collected all time */}
                  <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">Collected (All Time)</span>
                      <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-emerald-300"><TrendingUp className="w-3.5 h-3.5" /></div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-light text-white">₹{analytics.revenue.collectedAllTime.toLocaleString('en-IN')}</h3>
                      <p className="text-[9px] text-ink-secondary mt-1 uppercase tracking-wide">{analytics.counts.paid} paid bookings</p>
                    </div>
                  </div>

                  {/* Best sales day */}
                  <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">Best Day (30d)</span>
                      <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white"><Trophy className="w-3.5 h-3.5" /></div>
                    </div>
                    <div className="mt-4">
                      {analytics.bestDay ? (
                        <>
                          <h3 className="text-3xl font-light text-white">₹{analytics.bestDay.revenue.toLocaleString('en-IN')}</h3>
                          <p className="text-[9px] text-ink-secondary mt-1 uppercase tracking-wide">on {analytics.bestDay.date}</p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-3xl font-light text-white/40">—</h3>
                          <p className="text-[9px] text-ink-secondary mt-1 uppercase tracking-wide">No paid revenue yet</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Revenue trend chart (reuses the SVG chart, fed real bookings) */}
                <div className="liquid-glass p-6 rounded-2xl border border-white/5">
                  <CustomChart bookings={allBookings} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue by branch */}
                  <div className="liquid-glass p-6 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="font-semibold text-white text-base tracking-tight">Revenue by Branch</h3>
                    {analytics.revenueByBranch.length === 0 ? (
                      <p className="text-xs text-ink-secondary">No revenue recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.revenueByBranch.map((b) => (
                          <div key={b.locationId} className="space-y-1">
                            <div className="flex justify-between items-baseline text-xs">
                              <span className="text-white font-medium">{b.name.split(' (')[0]}</span>
                              <span className="text-white font-sans">₹{b.revenue.toLocaleString('en-IN')} <span className="text-ink-secondary text-[10px]">· {b.bookings} bookings</span></span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div className="bg-brand-green h-full rounded-full transition-all duration-700" style={{ width: `${(b.revenue / maxBranchRevenue) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Peak booking hours */}
                  <div className="liquid-glass p-6 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="font-semibold text-white text-base tracking-tight flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-300" /> Busiest Time Slots
                    </h3>
                    {analytics.peakSlots.length === 0 ? (
                      <p className="text-xs text-ink-secondary">No bookings recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.peakSlots.map((s) => (
                          <div key={s.timeSlot} className="space-y-1">
                            <div className="flex justify-between items-baseline text-xs">
                              <span className="text-white font-medium">{s.timeSlot}</span>
                              <span className="text-ink-secondary text-[10px]">{s.count} booking{s.count === 1 ? '' : 's'}</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div className="bg-white h-full rounded-full transition-all duration-700" style={{ width: `${(s.count / maxPeakCount) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== B. BOOKINGS TABLE TAB ==================== */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-fade-rise duration-500">

            {/* Filter controls panel */}
            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between font-sans">

              {/* Text Search */}
              <div className="relative w-full md:w-72">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary">
                  <Search className="w-4 h-4" strokeWidth={1.5} />
                </span>
                <input
                  type="text"
                  placeholder="Search Ref ID or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs text-white font-sans focus:outline-none focus:border-white/30 placeholder:opacity-30"
                />
              </div>

              <div className="flex flex-wrap w-full md:w-auto gap-3 items-center justify-end">
                {/* Date filter */}
                <div className="relative">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-4 pr-8 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white font-sans focus:outline-none focus:border-white/30"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/5 text-ink-secondary"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status dropdown */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-4 pr-8 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white focus:outline-none appearance-none cursor-pointer font-sans uppercase tracking-wide focus:border-white/30"
                  >
                    <option value="All" className="bg-brand-navy text-white">All Statuses</option>
                    <option value="Confirmed" className="bg-brand-navy text-white">Booked</option>
                    <option value="Completed" className="bg-brand-navy text-white">Completed</option>
                    <option value="Cancelled" className="bg-brand-navy text-white">Cancelled</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none">
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </div>

                {/* Location branch dropdown */}
                <div className="relative">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="pl-4 pr-8 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white focus:outline-none appearance-none cursor-pointer font-sans uppercase tracking-wide focus:border-white/30"
                  >
                    <option value="All" className="bg-[#0a1118] text-white">All Branches</option>
                    {TURF_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id} className="bg-[#0a1118] text-white">{loc.name.split(' (')[0]}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none">
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </div>
              </div>

            </div>

            {/* Main searchable list of bookings */}
            <div className="liquid-glass rounded-2xl border border-white/5 shadow-sm overflow-hidden font-sans">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-ink-secondary bg-white/5 uppercase font-sans tracking-wide text-[9px] font-semibold">
                      <th className="p-4 font-semibold">Ref ID</th>
                      <th className="p-4 font-semibold">Customer Details</th>
                      <th className="p-4 font-semibold">Branch</th>
                      <th className="p-4 font-semibold">Play Date</th>
                      <th className="p-4 font-semibold">Time Slot</th>
                      <th className="p-4 font-semibold">Booked On</th>
                      <th className="p-4 font-semibold">Arena Type</th>
                      <th className="p-4 text-right font-semibold">Cost</th>
                      <th className="p-4 text-center font-semibold">Payment</th>
                      <th className="p-4 text-center font-semibold">Status</th>
                      <th className="p-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-ink-secondary">
                          <Ban className="w-8 h-8 mx-auto text-ink-secondary/30 mb-2.5" strokeWidth={1.5} />
                          No reservations match the specified parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => {
                        const isBlock = b.customerName === 'ADMIN LOCK';
                        return (
                          <tr key={b.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all duration-150">
                            <td className="p-4 font-sans font-medium text-white">{b.id}</td>
                            <td className="p-4">
                              {isBlock ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 text-slate-300 border border-slate-300/20 rounded-full text-[8px] font-sans uppercase tracking-wide">
                                  <Lock className="w-2.5 h-2.5 text-slate-300" strokeWidth={1.5} />
                                  Manual Slot Block
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-white">{b.customerName}</div>
                                  <div className="text-[10px] text-ink-secondary font-sans">{b.customerPhone}</div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-sans text-[10px] uppercase font-semibold text-white/90">
                              {TURF_LOCATIONS.find(l => l.id === b.locationId)?.name.split(' (')[0] || 'Potheri'}
                            </td>
                            <td className="p-4 font-sans text-ink-secondary">{b.date}</td>
                            <td className="p-4 font-sans text-ink-secondary">{b.timeSlot} ({b.duration}h)</td>
                            <td className="p-4 font-sans text-ink-secondary whitespace-nowrap">
                              {new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-4 text-ink-secondary font-medium capitalize">{b.turfType}</td>
                            <td className="p-4 text-right font-sans text-white">
                              {isBlock ? '-' : `₹${b.amount.toLocaleString('en-IN')}`}
                            </td>
                            <td className="p-4 text-center">
                              {isBlock ? '-' : (
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-sans uppercase tracking-wide border
                                  ${b.paymentStatus === 'Paid'
                                    ? 'bg-white/10 text-white border-white/20'
                                    : 'bg-amber-400/10 text-amber-400 border-amber-400/20'}`}>
                                  {b.paymentStatus}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-sans uppercase tracking-wide border
                                ${b.status === 'Completed' || b.status === 'Confirmed'
                                  ? 'bg-white/10 text-white border-white/20' :
                                  b.status === 'Cancelled'
                                    ? 'bg-red-400/10 text-red-300 border-red-400/20' :
                                    'bg-white/5 text-white/50 border-white/10'}`}>
                                {b.status === 'Confirmed' ? 'Booked' : b.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {b.status === 'Confirmed' && (
                                <div className="flex gap-2 justify-end">
                                  {b.paymentStatus === 'Pending' && !isBlock && (
                                    <button
                                      onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed', 'Paid')}
                                      title="Mark as Paid"
                                      className="p-1 text-white hover:bg-white/10 border border-white/20 rounded-lg cursor-pointer transition-colors"
                                    >
                                      <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                                    </button>
                                  )}

                                  {!isBlock && (
                                    <button
                                      onClick={() => handleUpdateBookingStatus(b.id, 'Completed')}
                                      title="Mark Completed"
                                      className="p-1 text-white hover:bg-white/10 border border-white/20 rounded-lg cursor-pointer transition-colors"
                                    >
                                      <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      if (isBlock) {
                                        apiDelete(`/admin/slot-block/${b.id}`).then(() => { refreshBookings(); refreshStats(); });
                                      } else if (confirm(`Are you sure you want to Cancel booking ${b.id}?`)) {
                                        handleUpdateBookingStatus(b.id, 'Cancelled');
                                      }
                                    }}
                                    title={isBlock ? "Unblock Slot" : "Cancel Booking"}
                                    className="p-1 text-red-300 hover:bg-red-400/10 border border-red-400/20 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Ban className="w-4 h-4" strokeWidth={1.5} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== C. SLOT MANAGEMENT TAB (Slot Blocker) ==================== */}
        {activeTab === 'slots' && (
          <div className="space-y-6 animate-fade-rise duration-500">

            {/* Date & Turf Selection bar */}
            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between font-sans">

              <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
                {/* Branch selector */}
                <div className="flex bg-white/5 p-1 rounded-full border border-white/10 overflow-x-auto max-w-full">
                  {TURF_LOCATIONS.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => setSlotManageLocation(loc.id)}
                      className={`px-3 py-2 text-[10px] font-sans font-bold tracking-wide uppercase rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap
                        ${slotManageLocation === loc.id
                          ? 'bg-white text-brand-navy font-bold'
                          : 'text-ink-secondary hover:text-white'}`}
                    >
                      {loc.name.split(' (')[0]}
                    </button>
                  ))}
                </div>

                {/* Turf Picker */}
                <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                  {TURF_CONFIGS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSlotManageTurf(t.id)}
                      className={`px-4 py-2 text-[10px] font-sans font-bold tracking-wide uppercase rounded-full transition-all duration-300 cursor-pointer
                        ${slotManageTurf === t.id
                          ? 'bg-white text-brand-navy font-bold'
                          : 'text-ink-secondary hover:text-white'}`}
                    >
                      {t.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Input */}
              <div className="relative">
                <input
                  type="date"
                  value={slotManageDate}
                  onChange={(e) => setSlotManageDate(e.target.value)}
                  className="pl-4 pr-8 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white font-sans focus:outline-none focus:border-white/30"
                />
              </div>

            </div>

            {/* Slots Interactive Layout */}
            <div className="liquid-glass p-6 rounded-2xl border border-white/5 shadow-sm space-y-4 font-sans">
              <div className="text-left">
                <h3 className="font-sans font-semibold text-white text-base tracking-tight">Interactive Slot Overrides</h3>
                <p className="text-xs text-ink-secondary mt-1 font-light leading-relaxed">
                  Click on an available slot to block/lock it for maintenance or external offline reservations. Click a blocked/reserved slot to release it.
                </p>
              </div>

              {/* Legend */}
              <div className="flex gap-4 font-sans text-[10px] text-ink-secondary border-t border-white/5 pt-4 uppercase tracking-wide font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/10 border border-white/20" />
                  Available (Click to Lock)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  Manual Admin Block
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-300" />
                  Booked by Customer
                </span>
              </div>

              {/* Grid of Slots */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-3">
                {slotGridStatus.map(({ slot, booking }) => {
                  const isBlocked = booking?.customerName === 'ADMIN LOCK';
                  const isBooked = booking && !isBlocked;

                  return (
                    <button
                      key={slot}
                      onClick={() => handleToggleSlotBlock(slot, booking)}
                      className={`py-4 px-4 border rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 text-center cursor-pointer select-none
                        ${isBlocked
                          ? 'bg-white/5 border-slate-300/30 text-slate-300 shadow-sm hover:bg-white/10'
                          : isBooked
                            ? 'bg-red-300/15 border-red-300/30 text-white hover:bg-red-300/20'
                            : 'bg-white/5 border-white/10 text-white hover:border-white/30 hover:bg-white/10'}`}
                    >
                      <span className="font-sans text-xs font-semibold">{slot}</span>

                      {isBlocked ? (
                        <span className="text-[8px] font-sans uppercase tracking-wide text-slate-300 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" strokeWidth={1.5} />
                          Blocked
                        </span>
                      ) : isBooked ? (
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-sans uppercase tracking-wide text-red-300 block">
                            Reserved
                          </span>
                          <span className="text-[9px] font-semibold text-white truncate max-w-[100px] block">
                            {booking!.customerName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[8px] font-sans uppercase tracking-wide text-white/50">
                          Unoccupied
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* ==================== D. CUSTOMERS DIRECTORY TAB ==================== */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-fade-rise duration-500">

            {/* Customer table card */}
            <div className="liquid-glass rounded-2xl border border-white/5 shadow-sm overflow-hidden font-sans">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-ink-secondary bg-white/5 uppercase font-sans tracking-wide text-[9px] font-semibold">
                      <th className="p-4 font-semibold">Customer Name</th>
                      <th className="p-4 font-semibold">Contact Phone</th>
                      <th className="p-4 text-center font-semibold">Successful Games</th>
                      <th className="p-4 text-right font-semibold">Lifetime Spend</th>
                      <th className="p-4 text-right font-semibold">Last Visited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-ink-secondary">
                          <Users className="w-8 h-8 mx-auto text-ink-secondary/30 mb-2.5" strokeWidth={1.5} />
                          No customer details gathered yet.
                        </td>
                      </tr>
                    ) : (
                      customerList.map((customer, idx) => (
                        <tr key={idx} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all duration-150">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 text-white font-sans font-bold flex items-center justify-center border border-white/10">
                                {customer.name.charAt(0)}
                              </div>
                              <span className="font-semibold text-white">{customer.name}</span>
                            </div>
                          </td>
                          <td className="p-4 font-sans text-ink-secondary">{customer.phone}</td>
                          <td className="p-4 text-center font-sans text-white">{customer.bookingsCount}</td>
                          <td className="p-4 text-right font-sans text-white font-semibold">₹{customer.totalSpend.toLocaleString('en-IN')}</td>
                          <td className="p-4 text-right font-sans text-ink-secondary">{customer.lastBookingDate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
