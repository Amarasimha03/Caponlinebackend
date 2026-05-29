import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, ShieldCheck, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

/* ═══════════════════════════════════════════════════════════════ */
/*  WATER CANVAS ENGINE — pure Canvas 2D, no dependencies         */
/* ═══════════════════════════════════════════════════════════════ */
class WaterEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W      = canvas.width;
    this.H      = canvas.height;
    this.t      = 0;
    this.ripples    = [];
    this.particles  = [];
    this.raf        = null;
    this._initParticles();
  }

  _initParticles() {
    this.particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H * 0.65,
      r: Math.random() * 2.2 + 0.5,
      opacity: Math.random() * 0.55 + 0.1,
      speed: Math.random() * 0.35 + 0.08,
      drift: (Math.random() - 0.5) * 0.25,
      pulse: Math.random() * Math.PI * 2,
    }));
  }

  addRipple(x, y) {
    this.ripples.push({ x, y, r: 0, maxR: 110, o: 0.55, speed: 2.0 });
    if (this.ripples.length > 10) this.ripples.shift();
  }

  resize(w, h) { this.W = w; this.H = h; this._initParticles(); }

  _bg() {
    const { ctx, W, H, t } = this;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0,   `hsl(${230 + Math.sin(t * 0.04) * 7}, 58%, 5%)`);
    g.addColorStop(0.4, `hsl(${252 + Math.sin(t * 0.03) * 6}, 55%, 7%)`);
    g.addColorStop(0.75,`hsl(${262 + Math.sin(t * 0.05) * 9}, 65%, 6%)`);
    g.addColorStop(1,   `hsl(${220 + Math.sin(t * 0.04) * 7}, 50%, 4%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Atmospheric orbs
    [
      { x: W * 0.15, y: H * 0.30, r: 320, h: 240, a: 0.20 },
      { x: W * 0.82, y: H * 0.62, r: 270, h: 268, a: 0.16 },
      { x: W * 0.50, y: H * 0.08, r: 190, h: 200, a: 0.11 },
      { x: W * 0.70, y: H * 0.18, r: 155, h: 190, a: 0.13 },
    ].forEach(({ x, y, r, h, a }) => {
      const p = Math.sin(t * 0.03 + x * 0.001) * 0.38 + 1;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r * p);
      gr.addColorStop(0, `hsla(${h}, 80%, 28%, ${a})`);
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    });
  }

  _water() {
    const { ctx, W, H, t } = this;
    const baseY = H * 0.50;
    const layers = [
      { amp: 26, freq: 0.0080, spd: 0.55,  a: 0.10, h: 210 },
      { amp: 18, freq: 0.0120, spd: 0.88,  a: 0.08, h: 220 },
      { amp: 13, freq: 0.0175, spd: 1.20,  a: 0.07, h: 200 },
      { amp:  9, freq: 0.0240, spd: 1.60,  a: 0.055,h: 230 },
      { amp:  5, freq: 0.0340, spd: 2.10,  a: 0.04, h: 240 },
    ];

    layers.forEach(({ amp, freq, spd, a, h }) => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const y = baseY
          + Math.sin(x * freq + t * spd) * amp
          + Math.sin(x * freq * 2.2 - t * spd * 0.68) * (amp * 0.38)
          + Math.sin(x * freq * 0.68 + t * spd * 1.3) * (amp * 0.22);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      const gr = ctx.createLinearGradient(0, baseY - amp, 0, H);
      gr.addColorStop(0,   `hsla(${h}, 90%, 62%, ${a * 2.5})`);
      gr.addColorStop(0.35,`hsla(${h + 10}, 85%, 52%, ${a * 1.5})`);
      gr.addColorStop(1,   `hsla(${h + 20}, 70%, 32%, ${a * 3})`);
      ctx.fillStyle = gr;
      ctx.fill();
    });

    // Surface specular shimmer
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 7; i++) {
      const phase = (i / 7) * Math.PI * 2;
      const sx = ((t * 28 + i * (W / 7)) % (W + 180)) - 90;
      const sy = baseY + Math.sin(sx * 0.011 + t * 0.75 + phase) * 20;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 55 + Math.sin(t * 0.5 + phase) * 18);
      sg.addColorStop(0, `hsla(200, 100%, 90%, ${0.13 + Math.sin(t * 0.65 + phase) * 0.07})`);
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  _reflections() {
    const { ctx, W, H, t } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    [
      { x: 0.18, h: 210, w: 170, a: 0.028 },
      { x: 0.50, h: 248, w: 140, a: 0.022 },
      { x: 0.76, h: 192, w: 155, a: 0.018 },
    ].forEach(({ x, h, w, a }) => {
      const rx = x * W + Math.sin(t * 0.18 + x * 10) * 28;
      const gr = ctx.createLinearGradient(rx - w / 2, 0, rx + w / 2, H * 0.58);
      gr.addColorStop(0,   `hsla(${h}, 100%, 70%, ${a})`);
      gr.addColorStop(0.5, `hsla(${h}, 100%, 70%, ${a * 3})`);
      gr.addColorStop(1,   'transparent');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H * 0.65);
    });
    ctx.restore();
  }

  _ripples() {
    const { ctx } = this;
    this.ripples = this.ripples.filter(r => r.r < r.maxR && r.o > 0.005);
    this.ripples.forEach(r => {
      r.r += r.speed; r.o *= 0.955;
      for (let ring = 0; ring < 3; ring++) {
        const rr = r.r - ring * 13;
        if (rr <= 0) continue;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(200, 100%, 80%, ${r.o * (1 - ring * 0.28)})`;
        ctx.lineWidth = 1.5 - ring * 0.4;
        ctx.stroke();
      }
      const ig = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 11);
      ig.addColorStop(0, `hsla(200, 100%, 92%, ${r.o * 0.28})`);
      ig.addColorStop(1, 'transparent');
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.arc(r.x, r.y, 11, 0, Math.PI * 2); ctx.fill();
    });
  }

  _particles() {
    const { ctx, W, H, t } = this;
    this.particles.forEach(p => {
      p.x += p.drift + Math.sin(t * 0.28 + p.pulse) * 0.18;
      p.y -= p.speed * 0.38;
      p.pulse += 0.018;
      if (p.y < -8)  { p.y = H * 0.64; p.x = Math.random() * W; }
      if (p.x < 0)   p.x = W;
      if (p.x > W)   p.x = 0;
      const glow = Math.sin(p.pulse) * 0.28 + 0.72;
      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      pg.addColorStop(0, `hsla(210, 100%, 86%, ${p.opacity * glow})`);
      pg.addColorStop(0.5,`hsla(230, 90%, 76%, ${p.opacity * glow * 0.38})`);
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  tick() {
    this.t++;
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this._bg();
    this._reflections();
    this._water();
    this._ripples();
    this._particles();
    // Subtle scanlines for depth
    ctx.save(); ctx.globalAlpha = 0.016;
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, W, 1); }
    ctx.restore();
    this.raf = requestAnimationFrame(() => this.tick());
  }

  start() { this.raf = requestAnimationFrame(() => this.tick()); }
  stop()  { if (this.raf) cancelAnimationFrame(this.raf); }
}

/* ═══════════════════════════════════════════════════════════════ */
/*  FLOATING LABEL INPUT                                           */
/* ═══════════════════════════════════════════════════════════════ */
function FloatingInput({ id, label, icon: Icon, type, value, onChange, rightEl, error }) {
  const [focused, setFocused] = useState(false);
  const floating = focused || value.length > 0;

  return (
    <motion.div
      variants={{
        hidden:  { opacity: 0, y: 22 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 155, damping: 20 } },
      }}
      style={{ position: 'relative', marginBottom: 20 }}
    >
      {/* Focus glow ring */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: -1, borderRadius: 14, pointerEvents: 'none', zIndex: 1,
              boxShadow: '0 0 0 1.5px rgba(139,92,246,0.75), 0 0 22px rgba(139,92,246,0.22), 0 0 44px rgba(99,102,241,0.10)',
            }}
          />
        )}
      </AnimatePresence>
      {/* Error glow ring */}
      {error && !focused && (
        <div style={{
          position: 'absolute', inset: -1, borderRadius: 14, pointerEvents: 'none', zIndex: 1,
          boxShadow: '0 0 0 1.5px rgba(239,68,68,0.5), 0 0 18px rgba(239,68,68,0.12)',
        }} />
      )}

      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.038)',
        border: `1px solid ${error && !focused ? 'rgba(239,68,68,0.38)' : focused ? 'rgba(139,92,246,0.60)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, transition: 'border-color 0.22s',
        backdropFilter: 'blur(6px)',
      }}>
        {/* Icon */}
        <motion.div
          animate={{ color: focused ? '#a78bfa' : error ? '#f87171' : '#3f4d5c' }}
          transition={{ duration: 0.2 }}
          style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }}
        >
          <Icon size={15} />
        </motion.div>

        {/* Floating label */}
        <motion.label
          htmlFor={id}
          animate={{
            top:       floating ? 9  : '50%',
            translateY:floating ? 0  : '-50%',
            fontSize:  floating ? 10 : 14,
            color: focused ? '#a78bfa' : error ? '#f87171' : floating ? '#5d6b7a' : '#3f4d5c',
            left: floating ? 15 : 44,
          }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            fontWeight: 600, letterSpacing: floating ? '0.07em' : '0',
            textTransform: floating ? 'uppercase' : 'none',
            userSelect: 'none',
          }}
        >
          {label}
        </motion.label>

        <input
          id={id} type={type} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          required autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: floating ? '25px 48px 9px 44px' : '17px 48px 17px 44px',
            paddingRight: rightEl ? 46 : 16,
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f1f5f9', fontSize: 14.5, fontFamily: 'inherit',
            transition: 'padding 0.18s',
          }}
        />
        {rightEl && (
          <div style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
            {rightEl}
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: '#f87171', fontSize: 11, fontWeight: 500, marginTop: 6, marginLeft: 4, overflow: 'hidden' }}
          >
            ⚠ {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                 */
/* ═══════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const canvasRef   = useRef(null);
  const engineRef   = useRef(null);
  const cardRef     = useRef(null);

  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [fieldError,   setFieldError]   = useState('');
  const [shaking,      setShaking]      = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  /* Tilt motion */
  const mouseX  = useMotionValue(0);
  const mouseY  = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [ 5, -5]), { stiffness: 170, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5,  5]), { stiffness: 170, damping: 30 });
  const glowX   = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 190, damping: 30 });
  const glowY   = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 190, damping: 30 });

  /* Init canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      engineRef.current?.resize(canvas.width, canvas.height);
    };
    resize();
    engineRef.current = new WaterEngine(canvas);
    engineRef.current.start();
    window.addEventListener('resize', resize);
    return () => { engineRef.current?.stop(); window.removeEventListener('resize', resize); };
  }, []);

  /* Mouse ripple + tilt */
  const handleMouseMove = useCallback((e) => {
    engineRef.current?.addRipple(e.clientX, e.clientY);
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2));
      mouseY.set((e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2));
    }
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => { mouseX.set(0); mouseY.set(0); }, [mouseX, mouseY]);

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    try {
      const data = await login(username, password);
      setLoginSuccess(true);
      toast.success(`Welcome back, ${data.user.fullName}!`);
      setTimeout(() => navigate(data.user.role === 'admin' ? '/admin' : '/dashboard'), 900);
    } catch (err) {
      setFieldError(err.message || 'Invalid credentials');
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  };

  /* Variants */
  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.28 } } };
  const fadeUp  = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* ── Water canvas ── */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

      {/* ── Vignette overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 28%, rgba(0,0,6,0.58) 100%)',
      }} />

      {/* ── Layout ── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

        {/* ── 3D tilt card ── */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.88, y: 44 }}
          animate={shaking
            ? { x: [0, -11, 11, -8, 8, -5, 5, -2, 2, 0], transition: { duration: 0.52 } }
            : { opacity: 1, scale: 1, y: 0 }
          }
          transition={{ type: 'spring', stiffness: 135, damping: 22, delay: 0.08 }}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1100, width: '100%', maxWidth: 432, position: 'relative' }}
        >
          {/* Pulsing glow behind card */}
          <motion.div
            animate={{ opacity: [0.45, 0.78, 0.45], scale: [1, 1.07, 1] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: -32, borderRadius: 38, zIndex: -1,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.32) 0%, rgba(139,92,246,0.13) 50%, transparent 80%)',
              filter: 'blur(18px)',
            }}
          />

          {/* Mouse-follow specular */}
          <motion.div
            style={{
              position: 'absolute', inset: 0, borderRadius: 24, zIndex: 2, pointerEvents: 'none',
              background: useTransform([glowX, glowY], ([x, y]) =>
                `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.055) 0%, transparent 58%)`
              ),
            }}
          />

          {/* ── Glass card ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(6, 8, 24, 0.74)',
            backdropFilter: 'blur(44px)', WebkitBackdropFilter: 'blur(44px)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 24,
            boxShadow: '0 36px 88px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.055), inset 0 1px 0 rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}>
            {/* Top shimmer edge */}
            <div style={{
              position: 'absolute', top: 0, left: '12%', right: '12%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
              pointerEvents: 'none',
            }} />

            <motion.div variants={stagger} initial="hidden" animate="visible" style={{ padding: '44px 40px 40px' }}>

              {/* Logo */}
              <motion.div variants={fadeUp} style={{ marginBottom: 30 }}>
                <img src="/logo.svg" alt="Logo" style={{ height: 42, objectFit: 'contain', filter: 'brightness(1.08)' }} />
              </motion.div>

              {/* Heading */}
              <motion.div variants={fadeUp} style={{ marginBottom: 34 }}>
                <h1 style={{ fontSize: 25, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', lineHeight: 1.22, marginBottom: 7 }}>
                  Welcome back
                </h1>
                <p style={{ fontSize: 13.5, color: 'rgba(148,163,184,0.75)', lineHeight: 1.6 }}>
                  Sign in to your workspace to continue
                </p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} autoComplete="off">
                <motion.div variants={stagger} initial="hidden" animate="visible">

                  <FloatingInput
                    id="login-username" label="Username" icon={User}
                    type="text" value={username}
                    onChange={e => { setUsername(e.target.value); setFieldError(''); }}
                  />

                  <FloatingInput
                    id="login-password" label="Password" icon={Lock}
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setFieldError(''); }}
                    error={fieldError}
                    rightEl={
                      <motion.button
                        type="button" tabIndex={-1}
                        onClick={() => setShowPw(v => !v)}
                        whileTap={{ rotate: 16, scale: 0.80 }}
                        transition={{ type: 'spring', stiffness: 480 }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f4d5c', padding: 4, display: 'flex' }}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </motion.button>
                    }
                  />

                  {/* Remember + Forgot */}
                  <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#55657a' }}>
                      <motion.div
                        animate={rememberMe ? { scale: [1, 1.22, 1] } : {}}
                        transition={{ duration: 0.22 }}
                      >
                        <input
                          type="checkbox" checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          style={{ accentColor: '#8b5cf6', width: 14, height: 14, cursor: 'pointer' }}
                        />
                      </motion.div>
                      Remember me
                    </label>
                    <motion.div whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 380 }}>
                      <Link to="/forgot-password" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>
                        Forgot password?
                      </Link>
                    </motion.div>
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div variants={fadeUp}>
                    <motion.button
                      id="login-submit"
                      type="submit"
                      disabled={isLoading || loginSuccess}
                      whileHover={!isLoading && !loginSuccess ? { scale: 1.03, y: -2 } : {}}
                      whileTap={!isLoading && !loginSuccess ? { scale: 0.975 } : {}}
                      style={{
                        width: '100%', padding: '14.5px',
                        background: loginSuccess
                          ? 'linear-gradient(135deg, #059669, #10b981)'
                          : 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 42%, #7c3aed 72%, #8b5cf6 100%)',
                        color: '#fff', border: 'none', borderRadius: 14,
                        fontSize: 14.5, fontWeight: 700,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        letterSpacing: '0.25px', fontFamily: 'inherit',
                        boxShadow: loginSuccess
                          ? '0 6px 26px rgba(5,150,105,0.42)'
                          : '0 6px 26px rgba(109,40,217,0.52), 0 2px 8px rgba(0,0,0,0.38)',
                        position: 'relative', overflow: 'hidden',
                        transition: 'box-shadow 0.3s, background 0.4s',
                      }}
                    >
                      {/* Shimmer sweep */}
                      {!loginSuccess && (
                        <motion.div
                          animate={{ x: ['-120%', '220%'] }}
                          transition={{ duration: 2.1, repeat: Infinity, repeatDelay: 1.9, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '48%', height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      <AnimatePresence mode="wait">
                        {loginSuccess ? (
                          <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                            <Check size={21} strokeWidth={3} />
                          </motion.div>
                        ) : isLoading ? (
                          <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                              <Loader2 size={17} />
                            </motion.div>
                            Authenticating…
                          </motion.div>
                        ) : (
                          <motion.span key="txt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            Sign In
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 13, margin: '26px 0 22px' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.055)' }} />
                <span style={{ fontSize: 10.5, color: '#2d3748', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' }}>secured by</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.055)' }} />
              </motion.div>

              {/* Trust badges */}
              <motion.div variants={fadeUp} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['256-bit TLS', 'Zero Breach', 'SOC 2'].map(b => (
                  <motion.div
                    key={b}
                    whileHover={{ y: -3, scale: 1.06 }}
                    transition={{ type: 'spring', stiffness: 390 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px',
                      background: 'rgba(139,92,246,0.065)',
                      border: '1px solid rgba(139,92,246,0.16)',
                      borderRadius: 100, cursor: 'default',
                    }}
                  >
                    <ShieldCheck size={10} color="#8b5cf6" />
                    <span style={{ fontSize: 10.5, color: '#3d4f62', fontWeight: 700, letterSpacing: '0.04em' }}>{b}</span>
                  </motion.div>
                ))}
              </motion.div>

            </motion.div>
          </div>

          {/* Card floating shadow */}
          <motion.div
            animate={{ scaleX: [1, 0.96, 1], opacity: [0.32, 0.22, 0.32] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', bottom: -22, left: '12%', right: '12%', height: 38,
              background: 'rgba(99,102,241,0.38)', filter: 'blur(20px)',
              borderRadius: '50%', zIndex: -2, pointerEvents: 'none',
            }}
          />
        </motion.div>
      </div>

      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  );
}
