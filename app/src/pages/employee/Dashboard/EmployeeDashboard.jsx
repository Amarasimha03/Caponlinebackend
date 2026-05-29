import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LayoutDashboard, Search, Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../../services/api';
import socket from '../../../services/socket';
import useAuthStore from '../../../store/authStore';
import DashboardStats from './DashboardStats';
import { MyExamsTable, CompletedResultsTable } from './DashboardTable';

const LS_ASSESSMENTS_KEY = 'employee_assessments_cache';
const LS_ASSESSMENTS_TIMESTAMP = 'employee_assessments_timestamp';

export default function EmployeeDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const loadAbortController = useRef(new AbortController());

  const [assessments, setAssessments] = useState(() => {
    try {
      const cached = localStorage.getItem(LS_ASSESSMENTS_KEY);
      if (!cached) return [];
      const timestamp = localStorage.getItem(LS_ASSESSMENTS_TIMESTAMP);
      const age = timestamp ? Date.now() - parseInt(timestamp) : Infinity;
      if (age > 120000) {
        localStorage.removeItem(LS_ASSESSMENTS_KEY);
        localStorage.removeItem(LS_ASSESSMENTS_TIMESTAMP);
        return [];
      }
      return JSON.parse(cached);
    } catch (error) {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem(LS_ASSESSMENTS_KEY);
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (isBackground = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!isBackground && assessments.length === 0) setLoading(true);

    try {
      loadAbortController.current.abort();
      loadAbortController.current = new AbortController();

      const { data } = await api.get('/assessments/my', {
        signal: loadAbortController.current.signal
      });

      const list = data.assessments || [];
      const sorted = list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setAssessments(sorted);
      localStorage.setItem(LS_ASSESSMENTS_KEY, JSON.stringify(sorted));
      localStorage.setItem(LS_ASSESSMENTS_TIMESTAMP, Date.now().toString());

      const notifs = [];
      const now = new Date();
      sorted.forEach(a => {
        if (!a.result && a.createdAt) {
          const daysOld = (now - new Date(a.createdAt)) / (1000 * 60 * 60 * 24);
          if (daysOld < 3) {
            notifs.push({ id: a._id, message: `New assessment assigned: ${a.title}`, time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread: true });
          }
        }
      });
      setNotifications(notifs);

    } catch (err) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') {
        if (!isBackground && assessments.length === 0) toast.error('Failed to load assessments');
      }
    } finally {
      setLoading(false);
    }
  }, [assessments.length]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);

    if (user?._id) {
      socket.emit('employee:join-room', { employeeId: user._id });
    }

    socket.on('db:sync', () => {
      console.log('📡 Real-time sync signal received by employee: updating exam list');
      load(true);
    });

    return () => {
      clearInterval(interval);
      loadAbortController.current.abort();
      socket.off('db:sync');
    };
  }, [load, user?._id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleViewResult = (exam) => {
    if (exam.result && exam.result._id) {
      navigate(`/employee/results/${exam.result._id}`);
    } else {
      toast.error('Result not found or exam not completed.');
    }
  };

  const validAssessments = Array.isArray(assessments) ? assessments : [];
  
  const filteredAssessments = validAssessments.filter(a => 
    a.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completed = filteredAssessments.filter(a => a.status === 'completed' || a.result?.examCompleted);
  const pending = filteredAssessments.filter(a => a.status !== 'completed' && !a.result?.examCompleted);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Navbar */}
      <nav style={{
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)',
        padding: '0 32px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Employee<span style={{ color: 'var(--primary)' }}>Portal</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 99, padding: '8px 16px 8px 36px', fontSize: 14, color: 'var(--text-primary)',
                width: 200, transition: 'all 0.2s', outline: 'none'
              }}
              onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'var(--primary)'; e.target.style.width = '240px'; }}
              onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.width = '200px'; }}
            />
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative', padding: 8, borderRadius: '50%', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }} />
              )}
            </button>

            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: 50, right: 0, width: 320, background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', overflow: 'hidden', zIndex: 100
                  }}
                >
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
                    <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', padding: 8 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No new notifications</div>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} style={{ padding: '12px 16px', borderRadius: 8, transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, fontWeight: 500 }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.time}</div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.fullName || 'Employee'}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.department || 'Candidate'}</span>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', border: '2px solid rgba(255,255,255,0.1)' }}>
              {(user?.fullName || 'E').charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="btn" style={{
              background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s'
            }} onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '40px 32px', maxWidth: 1400, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
                Welcome, {user?.fullName?.split(' ')[0] || 'Employee'}! 👋
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Here's your assessment overview</p>
            </div>
          </div>

          <DashboardStats assessments={validAssessments} />
          
          <MyExamsTable loading={loading} assessments={pending} handleViewResult={handleViewResult} />
          
          <CompletedResultsTable loading={loading} completed={completed} handleViewResult={handleViewResult} />

        </motion.div>
      </main>
    </div>
  );
}
