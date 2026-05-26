import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function EmployeeLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Nav */}
      <header style={{
        padding: '0 32px', height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)',
        background: 'rgba(15,16,25,0.85)', backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>AssessHub</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavLink to="/dashboard" end className="btn btn-ghost btn-sm"
            style={({ isActive }) => ({ color: isActive ? 'var(--primary-light)' : 'var(--text-muted)' })}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.department || 'Employee'}</div>
          </div>
          <div className="avatar" style={{ width: 36, height: 36 }}>
            {user?.fullName?.[0] || 'E'}
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
