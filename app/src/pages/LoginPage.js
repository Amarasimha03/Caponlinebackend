import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

/* ─────────────────────────────────────────────────────────── */
/*  Animation Variants                                          */
/* ─────────────────────────────────────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 32 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 28, delay: 0.1 },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const shake = {
  initial: { x: 0 },
  shake: {
    x: [0, -10, 10, -8, 8, -5, 5, 0],
    transition: { duration: 0.55, ease: 'easeInOut' },
  },
};

/* ─────────────────────────────────────────────────────────── */
/*  Floating background shape component                        */
/* ─────────────────────────────────────────────────────────── */
function FloatingShape({ style, size, duration, delay }) {
  return (
    <motion.div
      animate={{ y: [0, -22, 0], x: [0, 10, 0], rotate: [0, 8, 0] }}
      transition={{ repeat: Infinity, duration, delay, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: '40%',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
        backdropFilter: 'blur(2px)',
        border: '1px solid rgba(255,255,255,0.06)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Premium Input component                                     */
/* ─────────────────────────────────────────────────────────── */
function PremiumInput({ id, label, icon: Icon, type, value, onChange, placeholder, error, rightElement }) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div variants={fadeUp} style={{ marginBottom: 20 }}>
      <motion.label
        animate={{ color: focused ? '#818cf8' : '#94a3b8' }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 8, cursor: 'text',
        }}
      >
        {label}
      </motion.label>
      <div style={{ position: 'relative' }}>
        <motion.div
          animate={{ color: focused ? '#818cf8' : '#475569' }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
          }}
        >
          <Icon size={16} />
        </motion.div>
        <motion.input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          animate={{
            boxShadow: focused
              ? '0 0 0 3px rgba(129,140,248,0.25), inset 0 1px 2px rgba(0,0,0,0.3)'
              : error
              ? '0 0 0 3px rgba(239,68,68,0.2)'
              : 'none',
            borderColor: focused ? '#6366f1' : error ? '#ef4444' : 'rgba(255,255,255,0.08)',
          }}
          transition={{ duration: 0.2 }}
          style={{
            width: '100%',
            padding: `13px 16px 13px ${rightElement ? '42px' : '42px'}`,
            paddingRight: rightElement ? 44 : 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            fontSize: 14,
            color: '#e2e8f0',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'background 0.2s',
            boxSizing: 'border-box',
          }}
        />
        {rightElement && (
          <div style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
          }}>
            {rightElement}
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: 12, color: '#f87171', marginTop: 6, marginLeft: 2 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main LoginPage                                              */
/* ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    try {
      const data = await login(username, password);
      setLoginSuccess(true);
      toast.success(`Welcome back, ${data.user.fullName}!`);
      setTimeout(() => {
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      }, 700);
    } catch (err) {
      setFieldError(err.message || 'Invalid credentials. Please try again.');
      setShakeKey(k => k + 1);
    }
  };

  /* User icon SVG */
  const UserIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
  const LockIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #060818 0%, #0d1030 40%, #0a0e28 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        padding: '20px',
      }}
    >
      {/* ── Animated background gradient ── */}
      <motion.div
        animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 70%, rgba(139,92,246,0.1) 0%, transparent 60%)',
          backgroundSize: '200% 200%',
          pointerEvents: 'none',
        }}
      />

      {/* ── Floating decorative shapes ── */}
      <FloatingShape size="380px" duration={9}  delay={0}   style={{ top: '-80px',  left: '-80px',  opacity: 0.6 }} />
      <FloatingShape size="260px" duration={12} delay={2}   style={{ bottom: '-60px', right: '-40px', opacity: 0.5 }} />
      <FloatingShape size="180px" duration={7}  delay={1.5} style={{ top: '30%',   right: '8%',   opacity: 0.4 }} />
      <FloatingShape size="120px" duration={10} delay={0.8} style={{ bottom: '20%', left: '6%',   opacity: 0.35 }} />

      {/* ── Login Card ── */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative', zIndex: 2,
          display: 'flex',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
          width: '100%',
          maxWidth: 880,
        }}
      >
        {/* ── LEFT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          style={{
            flex: '0 0 380px',
            background: 'linear-gradient(145deg, rgba(99,102,241,0.15), rgba(6,8,24,0.95))',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRight: 'none',
            padding: '52px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* background blur blob */}
          <div style={{
            position: 'absolute', top: -80, left: -60, width: 300, height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, right: -40, width: 220, height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Brand badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 100, padding: '5px 14px',
              marginBottom: 28,
            }}>
              <ShieldCheck size={13} color="#818cf8" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Secure Platform
              </span>
            </div>

            <h1 style={{
              fontSize: 30, fontWeight: 800,
              color: '#ffffff', lineHeight: 1.25,
              marginBottom: 16, letterSpacing: '-0.5px',
            }}>
              Robust Online<br />Test Workspace
            </h1>

            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.75, marginBottom: 44,
            }}>
              Unified assessment environment designed to conduct, evaluate, and proctor exams seamlessly for students and professionals.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 36 }}>
              {[
                { value: '99.9%', label: 'Uptime' },
                { value: '24/7', label: 'Support' },
                { value: '100+', label: 'Tests' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#818cf8', letterSpacing: '-0.5px' }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4,
                  }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          flex: 1,
          background: 'rgba(8, 11, 28, 0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '52px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Top right glow */}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Logo */}
            <motion.div variants={fadeUp} style={{ marginBottom: 36 }}>
              <img src="/logo.svg" alt="Logo" style={{ height: 52, objectFit: 'contain' }} />
            </motion.div>

            {/* Heading */}
            <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
              <h2 style={{
                fontSize: 22, fontWeight: 800, color: '#f1f5f9',
                letterSpacing: '-0.4px', marginBottom: 6,
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: '#475569' }}>
                Sign in to your account to continue
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              key={shakeKey}
              variants={shake}
              initial="initial"
              animate={fieldError ? 'shake' : 'initial'}
              onSubmit={handleSubmit}
              autoComplete="off"
            >
              {/* Username field */}
              <PremiumInput
                id="login-username"
                label="Username"
                icon={UserIcon}
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setFieldError(''); }}
                placeholder="Enter your username"
                error={null}
              />

              {/* Password field */}
              <PremiumInput
                id="login-password"
                label="Password"
                icon={LockIcon}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldError(''); }}
                placeholder="••••••••"
                error={fieldError || null}
                rightElement={
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    whileTap={{ rotate: 15, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#475569', padding: 4, display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </motion.button>
                }
              />

              {/* Remember & Forgot */}
              <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#475569' }}>
                  <motion.div
                    animate={{ scale: rememberMe ? 1.05 : 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                    style={{ position: 'relative' }}
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#6366f1', width: 15, height: 15, cursor: 'pointer' }}
                    />
                  </motion.div>
                  Remember me
                </label>
                <motion.div whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#818cf8'}
                    onMouseLeave={e => e.target.style.color = '#6366f1'}
                  >
                    Forgot Password?
                  </Link>
                </motion.div>
              </motion.div>

              {/* Submit button */}
              <motion.div variants={fadeUp}>
                <motion.button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading || loginSuccess}
                  whileHover={!isLoading && !loginSuccess ? { scale: 1.025, y: -2 } : {}}
                  whileTap={!isLoading && !loginSuccess ? { scale: 0.97 } : {}}
                  animate={{
                    background: loginSuccess
                      ? ['linear-gradient(135deg,#10b981,#059669)']
                      : ['linear-gradient(135deg,#4f46e5,#6366f1)'],
                  }}
                  transition={{ duration: 0.4 }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    letterSpacing: '0.3px',
                    boxShadow: '0 4px 24px rgba(79,70,229,0.45)',
                    fontFamily: 'inherit',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '40%', height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                      pointerEvents: 'none',
                    }}
                  />

                  <AnimatePresence mode="wait">
                    {loginSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <Check size={20} />
                      </motion.div>
                    ) : isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 size={18} />
                        </motion.div>
                        Signing in...
                      </motion.div>
                    ) : (
                      <motion.span
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Sign In
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </motion.form>

            {/* Divider */}
            <motion.div
              variants={fadeUp}
              style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}
            >
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>secured by</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </motion.div>

            {/* Security badges */}
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['256-bit SSL', 'GDPR Compliant', 'SOC 2'].map((badge, i) => (
                <motion.div
                  key={badge}
                  whileHover={{ y: -2, scale: 1.04 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 100, cursor: 'default',
                  }}
                >
                  <ShieldCheck size={11} color="#6366f1" />
                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{badge}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
