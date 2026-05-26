import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('OTP sent to your email');
      setStep(2);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP'); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: 20,
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <KeyRound size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {step === 1 ? 'Enter your email to receive a reset OTP' : 'Enter OTP and new password'}
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {step === 1 ? (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="you@company.com" style={{ paddingLeft: 44 }} />
                </div>
              </div>
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : <>Send OTP <ArrowRight size={18} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">OTP Code</label>
                <input className="form-input" value={otp} onChange={e => setOtp(e.target.value)} required placeholder="Enter 6-digit OTP"
                  style={{ textAlign: 'center', fontSize: 20, letterSpacing: 6, fontWeight: 700 }} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    required minLength={6} placeholder="Min 6 characters" style={{ paddingLeft: 44 }} />
                </div>
              </div>
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : <>Reset Password <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
          <Link to="/login" style={{ color: 'var(--primary-light)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
