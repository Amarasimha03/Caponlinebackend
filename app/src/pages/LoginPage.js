import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, ShieldCheck, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

/* ═══════════════════════════════════════════════════════════════ */
/*  WATER CANVAS ENGINE                                            */
/* ═══════════════════════════════════════════════════════════════ */

class WaterEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.time = 0;
    this.ripples = [];
    this.particles = [];
    this.raf = null;
    this._initParticles();
  }

  _initParticles() {
    this.particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height * 0.6,
      r: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.4 + 0.1,
      drift: (Math.random() - 0.5) * 0.3,
      pulse: Math.random() * Math.PI * 2,
    }));
  }

  addRipple(x, y) {
    this.ripples.push({ x, y, radius: 0, maxRadius: 120, opacity: 0.6, speed: 2.2 });
    if (this.ripples.length > 12) this.ripples.shift();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this._initParticles();
  }

  _drawBackground() {
    const { ctx, width, height, time } = this;
    // Cinematic layered gradient background
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, `hsl(${230 + Math.sin(time * 0.04) * 8}, 60%, 5%)`);
    bg.addColorStop(0.35, `hsl(${250 + Math.sin(time * 0.03) * 6}, 55%, 7%)`);
    bg.addColorStop(0.7, `hsl(${260 + Math.sin(time * 0.05) * 10}, 65%, 6%)`);
    bg.addColorStop(1, `hsl(${220 + Math.sin(time * 0.04) * 8}, 50%, 4%)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Atmospheric glow orbs
    const orbs = [
      { x: width * 0.15, y: height * 0.3, r: 320, h: 240, s: 80, l: 28, a: 0.22 },
      { x: width * 0.82, y: height * 0.6, r: 280, h: 270, s: 75, l: 25, a: 0.18 },
      { x: width * 0.5,  y: height * 0.1, r: 200, h: 200, s: 70, l: 30, a: 0.12 },
      { x: width * 0.7,  y: height * 0.15, r: 160, h: 190, s: 80, l: 22, a: 0.14 },
    ];
    orbs.forEach(({ x, y, r, h, s, l, a }) => {
      const pulse = Math.sin(time * 0.03 + x) * 0.4 + 1;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * pulse);
      grad.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${a})`);
      grad.addColorStop(0.6, `hsla(${h + 20}, ${s - 10}%, ${l - 5}%, ${a * 0.4})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    });
  }

  _drawWater() {
    const { ctx, width, height, time } = this;
    const waterY = height * 0.48;
    const layers = [
      { amp: 28, freq: 0.008, speed: 0.6,  alpha: 0.08, h: 210, s: 90, l: 60 },
      { amp: 20, freq: 0.012, speed: 0.9,  alpha: 0.07, h: 220, s: 85, l: 65 },
      { amp: 14, freq: 0.018, speed: 1.2,  alpha: 0.06, h: 200, s: 88, l: 70 },
      { amp: 10, freq: 0.025, speed: 1.6,  alpha: 0.05, h: 230, s: 80, l: 68 },
      { amp: 6,  freq: 0.035, speed: 2.1,  alpha: 0.04, h: 240, s: 75, l: 72 },
    ];

    layers.forEach(({ amp, freq, speed, alpha, h, s, l }) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 3) {
        // Compound wave: primary + secondary + tertiary harmonics
        const y = waterY
          + Math.sin(x * freq + time * speed) * amp
          + Math.sin(x * freq * 2.3 - time * speed * 0.7) * (amp * 0.4)
          + Math.sin(x * freq * 0.7 + time * speed * 1.3) * (amp * 0.25);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, waterY - amp, 0, height);
      grad.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${alpha * 2.5})`);
      grad.addColorStop(0.3, `hsla(${h + 10}, ${s}%, ${l - 10}%, ${alpha * 1.5})`);
      grad.addColorStop(1, `hsla(${h + 20}, ${s - 20}%, ${l - 20}%, ${alpha * 3})`);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Surface shimmer / specular highlights
    for (let i = 0; i < 8; i++) {
      const phase = (i / 8) * Math.PI * 2;
      const sx = ((time * 30 + i * (width / 8)) % (width + 200)) - 100;
      const sy = waterY + Math.sin(sx * 0.01 + time * 0.8 + phase) * 22;
      const shimmerGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60 + Math.sin(time * 0.5 + phase) * 20);
      shimmerGrad.addColorStop(0, `hsla(200, 100%, 90%, ${0.15 + Math.sin(time * 0.7 + phase) * 0.08})`);
      shimmerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shimmerGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Caustic light lines on water surface
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let c = 0; c < 5; c++) {
      const cx = ((time * 18 + c * 200) % (width + 400)) - 200;
      const cy = waterY + Math.sin(cx * 0.015 + time + c) * 18;
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy + 6);
      ctx.bezierCurveTo(cx - 30, cy - 4, cx + 30, cy - 4, cx + 80, cy + 6);
      ctx.strokeStyle = `hsla(195, 100%, 80%, ${0.06 + Math.sin(time * 0.8 + c) * 0.03})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawReflections() {
    const { ctx, width, height, time } = this;
    // Reflective aurora-like streaks
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const reflections = [
      { x: 0.2, color: '210, 100%, 70%', width: 180, opacity: 0.03 },
      { x: 0.5, color: '250, 90%, 75%', width: 140, opacity: 0.025 },
      { x: 0.75, color: '190, 100%, 72%', width: 160, opacity: 0.02 },
    ];
    reflections.forEach(({ x, color, width: w, opacity }) => {
      const rx = x * width + Math.sin(time * 0.2 + x * 10) * 30;
      const grad = ctx.createLinearGradient(rx - w / 2, 0, rx + w / 2, height * 0.6);
      grad.addColorStop(0, `hsla(${color}, ${opacity})`);
      grad.addColorStop(0.5, `hsla(${color}, ${opacity * 3})`);
      grad.addColorStop(1, `hsla(${color}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height * 0.65);
    });
    ctx.restore();
  }

  _drawRipples() {
    const { ctx } = this;
    this.ripples = this.ripples.filter(r => r.radius < r.maxRadius && r.opacity > 0.005);
    this.ripples.forEach(r => {
      r.radius += r.speed;
      r.opacity *= 0.96;
      // Multi-ring ripple
      for (let ring = 0; ring < 3; ring++) {
        const ringR = r.radius - ring * 14;
        if (ringR <= 0) continue;
        ctx.beginPath();
        ctx.arc(r.x, r.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(200, 100%, 80%, ${r.opacity * (1 - ring * 0.3)})`;
        ctx.lineWidth = 1.5 - ring * 0.4;
        ctx.stroke();
      }
      // Inner glow dot
      const grd = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 12);
      grd.addColorStop(0, `hsla(200, 100%, 90%, ${r.opacity * 0.3})`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _drawParticles() {
    const { ctx, width, height, time } = this;
    this.particles.forEach(p => {
      p.x += p.drift + Math.sin(time * 0.3 + p.pulse) * 0.2;
      p.y -= p.speed * 0.4;
      p.pulse += 0.02;
      if (p.y < -10) { p.y = height * 0.65; p.x = Math.random() * width; }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      const glow = Math.sin(p.pulse) * 0.3 + 0.7;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, `hsla(210, 100%, 85%, ${p.opacity * glow})`);
      grad.addColorStop(0.5, `hsla(230, 90%, 75%, ${p.opacity * glow * 0.4})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _drawScanlines() {
    const { ctx, width, height } = this;
    // Subtle CRT-style depth scanlines (very faint)
    ctx.save();
    ctx.globalAlpha = 0.018;
    for (let y = 0; y < height; y += 4) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  tick() {
    this.time += 1;
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    this._drawBackground();
    this._drawReflections();
    this._drawWater();
    this._drawRipples();
    this._drawParticles();
    this._drawScanlines();
    this.raf = requestAnimationFrame(() => this.tick());
  }

  start() { this.raf = requestAnimationFrame(() => this.tick()); }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); }
}

/* ═══════════════════════════════════════════════════════════════ */
/*  FLOATING LABEL INPUT COMPONENT                                 */
/* ═══════════════════════════════════════════════════════════════ */
function FloatingInput({ id, label, icon: Icon, type, value, onChange, rightEl, error }) {
  const [focused, setFocused] = useState(false);
  const floating = focused || value.length > 0;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 160, damping: 20 } } }}
      style={{ position: 'relative', marginBottom: 22 }}
    >
      {/* Glow layer */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: -1, borderRadius: 14,
              background: 'transparent',
              boxShadow: '0 0 0 1px rgba(139,92,246,0.7), 0 0 24px rgba(139,92,246,0.25), 0 0 48px rgba(99,102,241,0.12)',
              pointerEvents: 'none', zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            position: 'absolute', inset: -1, borderRadius: 14,
            boxShadow: '0 0 0 1px rgba(239,68,68,0.6), 0 0 20px rgba(239,68,68,0.15)',
            pointerEvents: 'none', zIndex: 1,
          }}
        />
      )}

      {/* Input wrapper */}
      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : focused ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, transition: 'border-color 0.25s, background 0.25s',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Icon */}
        <motion.div
          animate={{ color: focused ? '#a78bfa' : error ? '#f87171' : '#4b5563' }}
          transition={{ duration: 0.2 }}
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }}
        >
          <Icon size={16} />
        </motion.div>

        {/* Floating label */}
        <motion.label
          htmlFor={id}
          animate={{
            top: floating ? 9 : '50%',
            translateY: floating ? 0 : '-50%',
            fontSize: floating ? 10 : 14,
            color: focused ? '#a78bfa' : error ? '#f87171' : floating ? '#6b7280' : '#4b5563',
            left: floating ? 16 : 46,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            fontWeight: 600, letterSpacing: floating ? '0.06em' : '0',
            textTransform: floating ? 'uppercase' : 'none',
            userSelect: 'none',
          }}
        >
          {label}
        </motion.label>

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: floating ? '26px 48px 10px 46px' : '18px 48px 18px 46px',
            paddingRight: rightEl ? 48 : 16,
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f1f5f9', fontSize: 15, fontFamily: 'inherit',
            transition: 'padding 0.2s',
          }}
        />
        {rightEl && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
            {rightEl}
          </div>
        )}
      </div>

      {/* Error msg */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
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
/*  MAIN PAGE COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const cardRef = useRef(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [shaking, setShaking]   = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // 3D tilt motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 180, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 180, damping: 30 });
  const glowX   = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 30 });
  const glowY   = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 30 });

  /* ── Init canvas engine ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      if (engineRef.current) engineRef.current.resize(canvas.width, canvas.height);
    };
    resize();
    engineRef.current = new WaterEngine(canvas);
    engineRef.current.start();
    window.addEventListener('resize', resize);
    return () => {
      engineRef.current?.stop();
      window.removeEventListener('resize', resize);
    };
  }, []);

  /* ── Mouse ripple + tilt ── */
  const handleMouseMove = useCallback((e) => {
    // Ripple on canvas
    if (engineRef.current) engineRef.current.addRipple(e.clientX, e.clientY);
    // Card tilt
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseX.set((e.clientX - cx) / (rect.width / 2));
      mouseY.set((e.clientY - cy) / (rect.height / 2));
    }
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  /* ── Submit ── */
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

  /* ── Animation variants ── */
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* ── Water canvas ── */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* ── Vignette ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,4,0.55) 100%)',
      }} />

      {/* ── Center layout ── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

        {/* ── Glass card with 3D tilt ── */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.88, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 22, delay: 0.1 }}
          style={{
            rotateX, rotateY,
            transformStyle: 'preserve-3d',
            perspective: 1200,
            width: '100%', maxWidth: 440,
            position: 'relative',
          }}
          animate={shaking ? {
            x: [0, -12, 12, -9, 9, -6, 6, -3, 3, 0],
            transition: { duration: 0.55, ease: 'easeInOut' },
          } : { opacity: 1, scale: 1, y: 0 }}
        >
          {/* ── Floating glow behind card ── */}
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.06, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: -30, borderRadius: 36, zIndex: -1,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.15) 50%, transparent 80%)',
              filter: 'blur(20px)',
            }}
          />

          {/* Dynamic mouse-follow highlight */}
          <motion.div
            style={{
              position: 'absolute', inset: 0, borderRadius: 24, zIndex: 2,
              background: useTransform([glowX, glowY], ([x, y]) =>
                `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.06) 0%, transparent 60%)`
              ),
              pointerEvents: 'none',
            }}
          />

          {/* ── Main glass panel ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(8, 10, 26, 0.72)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 24,
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            {/* Top edge shimmer */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
              pointerEvents: 'none',
            }} />

            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              style={{ padding: '44px 40px 40px' }}
            >
              {/* Logo */}
              <motion.div variants={fadeUp} style={{ marginBottom: 32, display: 'flex', alignItems: 'center' }}>
                <img src="/logo.svg" alt="Logo" style={{ height: 44, objectFit: 'contain', filter: 'brightness(1.1)' }} />
              </motion.div>

              {/* Heading */}
              <motion.div variants={fadeUp} style={{ marginBottom: 36 }}>
                <h1 style={{
                  fontSize: 26, fontWeight: 800, color: '#f8fafc',
                  letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 8,
                }}>
                  Welcome back
                </h1>
                <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.8)', lineHeight: 1.6 }}>
                  Sign in to your workspace to continue
                </p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} autoComplete="off">
                <motion.div variants={stagger} initial="hidden" animate="visible">
                  {/* Username */}
                  <FloatingInput
                    id="login-username"
                    label="Username"
                    icon={User}
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setFieldError(''); }}
                    error={null}
                  />

                  {/* Password */}
                  <FloatingInput
                    id="login-password"
                    label="Password"
                    icon={Lock}
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFieldError(''); }}
                    error={fieldError}
                    rightEl={
                      <motion.button
                        type="button" tabIndex={-1}
                        onClick={() => setShowPw(v => !v)}
                        whileTap={{ rotate: 18, scale: 0.82 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 4, display: 'flex' }}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </motion.button>
                    }
                  />

                  {/* Remember + Forgot */}
                  <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
                      <motion.div
                        whileTap={{ scale: 0.85 }}
                        animate={rememberMe ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.25 }}
                      >
                        <input
                          type="checkbox" checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          style={{ accentColor: '#8b5cf6', width: 15, height: 15, cursor: 'pointer' }}
                        />
                      </motion.div>
                      Remember me
                    </label>
                    <motion.div whileHover={{ x: 2, color: '#a78bfa' }}>
                      <Link to="/forgot-password" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>
                        Forgot password?
                      </Link>
                    </motion.div>
                  </motion.div>

                  {/* Submit button */}
                  <motion.div variants={fadeUp}>
                    <motion.button
                      id="login-submit"
                      type="submit"
                      disabled={isLoading || loginSuccess}
                      whileHover={!isLoading && !loginSuccess ? { scale: 1.03, y: -2 } : {}}
                      whileTap={!isLoading && !loginSuccess ? { scale: 0.97 } : {}}
                      style={{
                        width: '100%', padding: '15px',
                        background: loginSuccess
                          ? 'linear-gradient(135deg, #059669, #10b981)'
                          : 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 40%, #7c3aed 70%, #8b5cf6 100%)',
                        color: '#fff', border: 'none', borderRadius: 14,
                        fontSize: 15, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        letterSpacing: '0.3px', fontFamily: 'inherit',
                        boxShadow: loginSuccess
                          ? '0 6px 28px rgba(5,150,105,0.45)'
                          : '0 6px 28px rgba(109,40,217,0.55), 0 2px 8px rgba(0,0,0,0.4)',
                        position: 'relative', overflow: 'hidden',
                        transition: 'box-shadow 0.3s, background 0.4s',
                      }}
                    >
                      {/* Animated shimmer */}
                      {!loginSuccess && (
                        <motion.div
                          animate={{ x: ['-120%', '220%'] }}
                          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      <AnimatePresence mode="wait">
                        {loginSuccess ? (
                          <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                            <Check size={22} strokeWidth={3} />
                          </motion.div>
                        ) : isLoading ? (
                          <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}>
                              <Loader2 size={18} />
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
              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0 24px' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 11, color: '#334155', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  secured by
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </motion.div>

              {/* Trust badges */}
              <motion.div variants={fadeUp} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['256-bit TLS', 'Zero Breach', 'SOC 2'].map(b => (
                  <motion.div
                    key={b}
                    whileHover={{ y: -3, scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px',
                      background: 'rgba(139,92,246,0.07)',
                      border: '1px solid rgba(139,92,246,0.18)',
                      borderRadius: 100, cursor: 'default',
                    }}
                  >
                    <ShieldCheck size={10} color="#8b5cf6" />
                    <span style={{ fontSize: 10.5, color: '#475569', fontWeight: 700, letterSpacing: '0.04em' }}>{b}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Card floating shadow */}
          <motion.div
            animate={{ scaleX: [1, 0.97, 1], opacity: [0.35, 0.25, 0.35] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', bottom: -24, left: '10%', right: '10%', height: 40,
              background: 'rgba(99,102,241,0.4)',
              filter: 'blur(22px)', borderRadius: '50%', zIndex: -2,
              pointerEvents: 'none',
            }}
          />
        </motion.div>
      </div>

      {/* Inline styles for font import */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  );
}
