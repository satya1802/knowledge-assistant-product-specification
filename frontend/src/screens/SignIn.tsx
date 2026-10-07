// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Check, X, Users, Clock, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } = Icons;

const MIN_PW = 10;

const PALETTES = {
  dark: {
    bg: '#101418',
    panel: '#161B22',
    panelAlt: '#1B222B',
    border: '#28313B',
    borderStrong: '#36414E',
    text: '#E9EEF4',
    muted: '#8A95A1',
    field: '#0C1014',
    danger: '#F0857A',
    dangerBg: 'rgba(240, 133, 122, 0.10)',
    ok: '#6FD79A',
    okBg: 'rgba(111, 215, 154, 0.10)',
    warn: '#F4A259',
    warnBg: 'rgba(244, 162, 89, 0.10)'
  },
  light: {
    bg: '#F3F6FA',
    panel: '#FFFFFF',
    panelAlt: '#EDF1F7',
    border: '#D6DEE8',
    borderStrong: '#BCC7D4',
    text: '#101720',
    muted: '#54606E',
    field: '#FFFFFF',
    danger: '#B23A2C',
    dangerBg: 'rgba(178, 58, 44, 0.08)',
    ok: '#1F7A4D',
    okBg: 'rgba(31, 122, 77, 0.08)',
    warn: '#8A5215',
    warnBg: 'rgba(244, 162, 89, 0.14)'
  }
};

const SEED_USERS = [
  {
    id: 'u_01',
    name: 'Dana Okafor',
    email: 'dana.okafor@northwind.co',
    password: 'northwind2026',
    is_admin: true,
    is_enabled: true,
    created_at: '2026-01-14'
  },
  {
    id: 'u_02',
    name: 'Marcus Hale',
    email: 'marcus.hale@northwind.co',
    password: 'northwind2026',
    is_admin: false,
    is_enabled: true,
    created_at: '2026-02-02'
  },
  {
    id: 'u_03',
    name: 'Priya Raman',
    email: 'priya.raman@northwind.co',
    password: 'northwind2026',
    is_admin: false,
    is_enabled: true,
    created_at: '2026-03-19'
  },
  {
    id: 'u_04',
    name: 'Tomás Lindqvist',
    email: 'tomas.lindqvist@northwind.co',
    password: 'northwind2026',
    is_admin: false,
    is_enabled: false,
    created_at: '2025-11-28'
  }
];

const HIGHLIGHTS = [
  'Ask in plain language — the answer streams in live, written from your own documents.',
  'Amber source chips open the exact file and excerpt the answer was drawn from.',
  'Drop in PDF, DOCX, TXT or Markdown; it is searchable within seconds.',
  'Conversations are saved privately to your account and grouped by date.'
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
];

const GENERIC_SIGNIN_ERROR =
  'We could not sign you in with those details. Check your email address and password and try again.';
const GENERIC_REGISTER_ERROR =
  'Those details cannot be used to create an account. Try a different email address, or sign in instead.';

export default function Screen() {
  const navigate = useNavigate();
  const [themeChoice, setThemeChoice] = React.useState('dark');
  const [systemDark, setSystemDark] = React.useState(true);
  const [mode, setMode] = React.useState('signin');
  const [selfRegEnabled, setSelfRegEnabled] = React.useState(true);

  const [users, setUsers] = React.useState(SEED_USERS);
  const [attempts, setAttempts] = React.useState({});
  const [lockedUntil, setLockedUntil] = React.useState({});

  const [signinEmail, setSigninEmail] = React.useState('');
  const [signinPassword, setSigninPassword] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [showSigninPw, setShowSigninPw] = React.useState(false);

  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');
  const [showRegPw, setShowRegPw] = React.useState(false);

  const [errors, setErrors] = React.useState({});
  const [banner, setBanner] = React.useState(null);
  const [helpOpen, setHelpOpen] = React.useState(false);

  const signinTabRef = React.useRef(null);
  const registerTabRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const handler = (event) => setSystemDark(event.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, []);

  React.useEffect(() => {
    if (!selfRegEnabled && mode === 'register') {
      setMode('signin');
      setErrors({});
      setBanner({
        tone: 'warn',
        title: 'Account creation is disabled',
        text: 'This instance was started with SELF_REGISTRATION=false in backend/.env. Ask an administrator to create your account.'
      });
    }
  }, [selfRegEnabled, mode]);

  const dark = themeChoice === 'dark' || (themeChoice === 'system' && systemDark);
  const t = dark ? PALETTES.dark : PALETTES.light;
  const radius = brand.radius || '0.5rem';

  const lockLabel = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isLocked = (email) => {
    const until = lockedUntil[email];
    return Boolean(until) && until > Date.now();
  };

  const fieldStyle = (hasError) => ({
    backgroundColor: t.field,
    color: t.text,
    border: `1px solid ${hasError ? t.danger : t.border}`,
    borderRadius: radius
  });

  const resetFeedback = () => {
    setErrors({});
    setBanner(null);
  };

  function handleSignIn(event) {
    event.preventDefault();
    const email = signinEmail.trim().toLowerCase();
    const nextErrors = {};
    if (!email) nextErrors.signinEmail = 'Enter your work email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.signinEmail = 'Enter a valid email address, for example name@northwind.co.';
    if (!signinPassword) nextErrors.signinPassword = 'Enter your password.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setBanner(null);
      return;
    }

    if (isLocked(email)) {
      setErrors({});
      setBanner({
        tone: 'warn',
        title: 'Temporarily locked',
        text:
          'Too many sign-in attempts for this email address. Sign-in is refused until about ' +
          lockLabel(lockedUntil[email]) +
          ', even with the correct password.'
      });
      return;
    }

    const match = users.find(
      (u) => u.email === email && u.password === signinPassword && u.is_enabled
    );

    if (match) {
      setErrors({});
      setAttempts((prev) => ({ ...prev, [email]: 0 }));
      setBanner({
        tone: 'ok',
        title: 'Signed in as ' + match.name,
        text:
          'Session cookie issued' +
          (remember ? ' and remembered on this browser for 30 days.' : ' for this browser session.') +
          ' Opening your chats…'
      });
      navigate('chat');
      return;
    }

    const count = (attempts[email] || 0) + 1;
    setAttempts((prev) => ({ ...prev, [email]: count }));
    setErrors({});

    if (count >= 5) {
      const until = Date.now() + 15 * 60 * 1000;
      setLockedUntil((prev) => ({ ...prev, [email]: until }));
      setBanner({
        tone: 'warn',
        title: 'This email address is now locked for 15 minutes',
        text:
          'Five failed attempts were made in the last 15 minutes. Further attempts are refused until about ' +
          lockLabel(until) +
          ', even if the password is correct.'
      });
      return;
    }

    setBanner({
      tone: 'error',
      title: 'Sign-in failed',
      text:
        GENERIC_SIGNIN_ERROR +
        (count >= 3
          ? ' ' + (5 - count) + ' attempt' + (5 - count === 1 ? '' : 's') + ' left before this email is locked for 15 minutes.'
          : '')
    });
  }

  function handleRegister(event) {
    event.preventDefault();
    if (!selfRegEnabled) return;

    const email = regEmail.trim().toLowerCase();
    const name = regName.trim();
    const nextErrors = {};
    if (!name) nextErrors.regName = 'Enter your full name.';
    if (!email) nextErrors.regEmail = 'Enter your work email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.regEmail = 'Enter a valid email address, for example name@northwind.co.';
    if (regPassword.length < MIN_PW)
      nextErrors.regPassword = 'Use at least ' + MIN_PW + ' characters.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setBanner(null);
      return;
    }

    if (users.some((u) => u.email === email)) {
      setErrors({});
      setBanner({ tone: 'error', title: 'Account not created', text: GENERIC_REGISTER_ERROR });
      return;
    }

    const created = {
      id: 'u_' + String(users.length + 1).padStart(2, '0'),
      name,
      email,
      password: regPassword,
      is_admin: users.length === 0,
      is_enabled: true,
      created_at: new Date().toISOString().slice(0, 10)
    };
    setUsers((prev) => prev.concat(created));
    setErrors({});
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setBanner({
      tone: 'ok',
      title: 'Account created for ' + created.name,
      text:
        'Your password is stored only as a one-way hash. You have been signed in as a ' +
        (created.is_admin ? 'administrator' : 'regular user') +
        ' — opening the welcome screen…'
    });
    navigate('chat');
  }

  function onTabKeyDown(event) {
    if (!selfRegEnabled) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = mode === 'signin' ? 'register' : 'signin';
    setMode(next);
    resetFeedback();
    const ref = next === 'signin' ? signinTabRef : registerTabRef;
    if (ref.current) ref.current.focus();
  }

  const bannerTone =
    banner && banner.tone === 'ok'
      ? { color: t.ok, bg: t.okBg, Icon: Icons.CheckCircle }
      : banner && banner.tone === 'warn'
      ? { color: t.warn, bg: t.warnBg, Icon: Icons.Clock }
      : { color: t.danger, bg: t.dangerBg, Icon: Icons.AlertCircle };

  const tabButton = (value, label, ref) => {
    const active = mode === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={'tab-' + value}
        aria-selected={active}
        aria-controls={'panel-' + value}
        tabIndex={active ? 0 : -1}
        onKeyDown={onTabKeyDown}
        onClick={() => {
          setMode(value);
          resetFeedback();
        }}
        className="nd-focus flex-1 px-4 py-2 text-sm font-medium transition-colors"
        style={{
          borderRadius: radius,
          backgroundColor: active ? t.panelAlt : 'transparent',
          color: active ? t.text : t.muted,
          border: `1px solid ${active ? t.borderStrong : 'transparent'}`
        }}
      >
        {label}
      </button>
    );
  };

  const labelCls = 'block text-sm font-medium mb-1.5';
  const inputCls = 'nd-focus w-full px-3 py-2.5 text-sm';
  const errText = (id, msg) => (
    <p id={id} className="mt-1.5 text-xs flex items-start gap-1.5" style={{ color: t.danger }}>
      <span aria-hidden="true" className="mt-px">
        <Icons.AlertCircle className="h-3.5 w-3.5" />
      </span>
      <span>{msg}</span>
    </p>
  );

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: t.bg, color: t.text, fontFamily: brand.fontBody }}>
      <style>{`
        .nd-focus:focus-visible { outline: 2px solid ${brand.primaryColor}; outline-offset: 2px; }
        .nd-input::placeholder { color: ${t.muted}; opacity: 0.8; }
      `}</style>

      <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: t.muted }}>
            Northwind · internal instance
          </p>
          <div
            role="group"
            aria-label="Colour theme"
            className="flex items-center gap-1 p-1"
            style={{ backgroundColor: t.panel, border: `1px solid ${t.border}`, borderRadius: radius }}
          >
            {THEME_OPTIONS.map((opt) => {
              const active = themeChoice === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setThemeChoice(opt.value)}
                  className="nd-focus flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderRadius: 'calc(' + radius + ' - 2px)',
                    backgroundColor: active ? t.panelAlt : 'transparent',
                    color: active ? t.text : t.muted
                  }}
                >
                  {active ? (
                    <span aria-hidden="true">
                      <Icons.Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* ---------------- Left: product ---------------- */}
          <div className="max-w-xl">
            <h1
              className="text-4xl font-semibold tracking-tight md:text-5xl"
              style={{ fontFamily: brand.fontHeading }}
            >
              <span
                style={{
                  backgroundImage: 'linear-gradient(90deg, #5B9CF8 0%, #A78BFA 48%, #F08CC8 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                Knowledge Assistant
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed" style={{ color: t.muted }}>
              Answers written from Northwind&rsquo;s own documents, with the source always one click away.
              Sign in with your work email to pick up your conversations.
            </p>

            <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: t.muted }}>
              What&rsquo;s inside
            </h2>
            <ul className="mt-4 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: brand.accentColor }}>
                    <Icons.Check className="h-4 w-4" />
                  </span>
                  <span style={{ color: t.text }}>{item}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: t.muted }}>
              This instance
            </h2>
            <dl
              className="mt-4 grid grid-cols-2 gap-px overflow-hidden"
              style={{ backgroundColor: t.border, border: `1px solid ${t.border}`, borderRadius: radius }}
            >
              {[
                { k: 'Accounts', v: String(users.length) },
                { k: 'Documents indexed', v: '418' },
                { k: 'Administrator', v: 'Configured' },
                { k: 'Remembered session', v: '30 days' }
              ].map((row) => (
                <div key={row.k} className="px-4 py-3" style={{ backgroundColor: t.panel }}>
                  <dt className="text-xs" style={{ color: t.muted }}>
                    {row.k}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium" style={{ color: t.text }}>
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>

            <div
              className="mt-6 flex items-start justify-between gap-4 px-4 py-3"
              style={{ border: `1px dashed ${t.border}`, borderRadius: radius }}
            >
              <div className="pr-2">
                <p className="text-sm font-medium" id="selfreg-label">
                  Self-registration
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: t.muted }}>
                  Deployment setting read from backend/.env. Turn it off to preview the sign-in page employees
                  see when account creation is closed.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={selfRegEnabled}
                aria-labelledby="selfreg-label"
                onClick={() => setSelfRegEnabled((v) => !v)}
                className="nd-focus relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
                style={{
                  backgroundColor: selfRegEnabled ? brand.primaryColor : t.borderStrong
                }}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                  style={{ left: selfRegEnabled ? '1.375rem' : '0.125rem' }}
                />
              </button>
            </div>
          </div>

          {/* ---------------- Right: auth card ---------------- */}
          <div>
            <div
              className="p-6 md:p-8"
              style={{ backgroundColor: t.panel, border: `1px solid ${t.border}`, borderRadius: 'calc(' + radius + ' * 1.5)' }}
            >
              {selfRegEnabled ? (
                <div
                  role="tablist"
                  aria-label="Sign in or create an account"
                  className="flex gap-1 p-1"
                  style={{ backgroundColor: t.bg, borderRadius: radius, border: `1px solid ${t.border}` }}
                >
                  {tabButton('signin', 'Sign in', signinTabRef)}
                  {tabButton('register', 'Create account', registerTabRef)}
                </div>
              ) : null}

              {banner ? (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 px-4 py-3"
                  style={{
                    backgroundColor: bannerTone.bg,
                    border: `1px solid ${bannerTone.color}`,
                    borderRadius: radius
                  }}
                >
                  <span aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: bannerTone.color }}>
                    <bannerTone.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: bannerTone.color }}>
                      {banner.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: t.text }}>
                      {banner.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBanner(null)}
                    aria-label="Dismiss message"
                    className="nd-focus ml-auto shrink-0 rounded p-1"
                    style={{ color: t.muted }}
                  >
                    <span aria-hidden="true">
                      <Icons.X className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              ) : null}

              {mode === 'signin' ? (
                <div role="tabpanel" id="panel-signin" aria-labelledby={selfRegEnabled ? 'tab-signin' : undefined}>
                  <h2 className="mt-6 text-xl font-semibold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
                    Sign in
                  </h2>
                  <p className="mt-1.5 text-sm" style={{ color: t.muted }}>
                    Use your Northwind email address and password.
                  </p>

                  <form className="mt-6 space-y-5" onSubmit={handleSignIn} noValidate>
                    <div>
                      <label htmlFor="signin-email" className={labelCls} style={{ color: t.text }}>
                        Email address
                      </label>
                      <input
                        id="signin-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className={inputCls + ' nd-input'}
                        style={fieldStyle(Boolean(errors.signinEmail))}
                        placeholder="name@northwind.co"
                        value={signinEmail}
                        onChange={(e) => setSigninEmail(e.target.value)}
                        aria-invalid={errors.signinEmail ? 'true' : undefined}
                        aria-describedby={errors.signinEmail ? 'signin-email-error' : undefined}
                      />
                      {errors.signinEmail ? errText('signin-email-error', errors.signinEmail) : null}
                    </div>

                    <div>
                      <label htmlFor="signin-password" className={labelCls} style={{ color: t.text }}>
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="signin-password"
                          name="password"
                          type={showSigninPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          className={inputCls + ' nd-input pr-20'}
                          style={fieldStyle(Boolean(errors.signinPassword))}
                          value={signinPassword}
                          onChange={(e) => setSigninPassword(e.target.value)}
                          aria-invalid={errors.signinPassword ? 'true' : undefined}
                          aria-describedby={errors.signinPassword ? 'signin-password-error' : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSigninPw((v) => !v)}
                          aria-pressed={showSigninPw}
                          className="nd-focus absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium"
                          style={{ color: t.muted }}
                        >
                          {showSigninPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {errors.signinPassword ? errText('signin-password-error', errors.signinPassword) : null}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        id="signin-remember"
                        type="checkbox"
                        className="nd-focus h-4 w-4 rounded"
                        style={{ accentColor: brand.primaryColor }}
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      <label htmlFor="signin-remember" className="text-sm" style={{ color: t.text }}>
                        Keep me signed in on this browser
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="nd-focus flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
                      style={{ backgroundColor: brand.primaryColor, color: '#0B1220', borderRadius: radius }}
                    >
                      Sign in
                      <span aria-hidden="true">
                        <Icons.ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  </form>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => setHelpOpen((v) => !v)}
                      aria-expanded={helpOpen}
                      aria-controls="forgot-help"
                      className="nd-focus rounded text-sm font-medium underline underline-offset-4"
                      style={{ color: brand.primaryColor }}
                    >
                      Forgotten your password?
                    </button>
                    {helpOpen ? (
                      <p
                        id="forgot-help"
                        className="mt-3 px-4 py-3 text-sm leading-relaxed"
                        style={{ backgroundColor: t.panelAlt, borderRadius: radius, color: t.text }}
                      >
                        This instance sends no email, so there is no self-service reset. Ask an administrator to
                        set a new password for you, then change it from your account menu once you are in.
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="mt-6 px-4 py-4"
                    style={{ border: `1px solid ${t.border}`, borderRadius: radius }}
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: t.muted }}>
                      Demo accounts
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {users.slice(0, 3).map((u) => (
                        <li key={u.id} className="flex items-center justify-between gap-3">
                          <span className="min-w-0 text-sm" style={{ color: t.text }}>
                            <span className="block truncate">{u.email}</span>
                            <span className="text-xs" style={{ color: t.muted }}>
                              {u.name}
                              {u.is_admin ? ' · administrator' : ''}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSigninEmail(u.email);
                              setSigninPassword(u.password);
                              resetFeedback();
                            }}
                            className="nd-focus shrink-0 px-2.5 py-1 text-xs font-medium"
                            style={{
                              border: `1px solid ${t.borderStrong}`,
                              borderRadius: 'calc(' + radius + ' - 2px)',
                              color: t.text
                            }}
                          >
                            Use
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-relaxed" style={{ color: t.muted }}>
                      Shared password <code style={{ color: brand.accentColor }}>northwind2026</code>. Five wrong
                      attempts on one email locks it for 15 minutes.
                    </p>
                  </div>
                </div>
              ) : (
                <div role="tabpanel" id="panel-register" aria-labelledby="tab-register">
                  <h2 className="mt-6 text-xl font-semibold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
                    Create your account
                  </h2>
                  <p className="mt-1.5 text-sm" style={{ color: t.muted }}>
                    New employees can register themselves while self-registration is enabled on this instance.
                  </p>

                  <form className="mt-6 space-y-5" onSubmit={handleRegister} noValidate>
                    <div>
                      <label htmlFor="reg-name" className={labelCls} style={{ color: t.text }}>
                        Full name
                      </label>
                      <input
                        id="reg-name"
                        type="text"
                        autoComplete="name"
                        className={inputCls + ' nd-input'}
                        style={fieldStyle(Boolean(errors.regName))}
                        placeholder="Alex Moreau"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        aria-invalid={errors.regName ? 'true' : undefined}
                        aria-describedby={errors.regName ? 'reg-name-error' : undefined}
                      />
                      {errors.regName ? errText('reg-name-error', errors.regName) : null}
                    </div>

                    <div>
                      <label htmlFor="reg-email" className={labelCls} style={{ color: t.text }}>
                        Work email address
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        className={inputCls + ' nd-input'}
                        style={fieldStyle(Boolean(errors.regEmail))}
                        placeholder="alex.moreau@northwind.co"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        aria-invalid={errors.regEmail ? 'true' : undefined}
                        aria-describedby={errors.regEmail ? 'reg-email-error' : undefined}
                      />
                      {errors.regEmail ? errText('reg-email-error', errors.regEmail) : null}
                    </div>

                    <div>
                      <label htmlFor="reg-password" className={labelCls} style={{ color: t.text }}>
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showRegPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          className={inputCls + ' nd-input pr-20'}
                          style={fieldStyle(Boolean(errors.regPassword))}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          aria-invalid={errors.regPassword ? 'true' : undefined}
                          aria-describedby={
                            errors.regPassword ? 'reg-password-error reg-password-hint' : 'reg-password-hint'
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw((v) => !v)}
                          aria-pressed={showRegPw}
                          className="nd-focus absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium"
                          style={{ color: t.muted }}
                        >
                          {showRegPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p id="reg-password-hint" className="mt-1.5 text-xs" style={{ color: t.muted }}>
                        At least {MIN_PW} characters. Stored only as a one-way hash.
                      </p>
                      {errors.regPassword ? errText('reg-password-error', errors.regPassword) : null}
                    </div>

                    <button
                      type="submit"
                      className="nd-focus flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
                      style={{ backgroundColor: brand.primaryColor, color: '#0B1220', borderRadius: radius }}
                    >
                      Create account
                      <span aria-hidden="true">
                        <Icons.ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  </form>

                  <p className="mt-5 text-xs leading-relaxed" style={{ color: t.muted }}>
                    Everything you upload goes into one shared, company-wide library that every signed-in
                    colleague can read, add to and delete from. Your conversations stay private to you.
                  </p>
                </div>
              )}

              {!selfRegEnabled ? (
                <p
                  className="mt-6 flex items-start gap-2 px-4 py-3 text-sm leading-relaxed"
                  style={{ backgroundColor: t.panelAlt, borderRadius: radius, color: t.text }}
                >
                  <span aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: t.muted }}>
                    <Icons.Users className="h-4 w-4" />
                  </span>
                  Account creation is disabled on this instance. Ask an administrator to create an account for
                  you.
                </p>
              ) : null}
            </div>

            <div
              className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
              style={{ color: t.muted }}
            >
              <span>Public documentation:</span>
              <button
                type="button"
                onClick={() => navigate('getting-started')}
                className="nd-focus rounded font-medium underline underline-offset-4"
                style={{ color: brand.primaryColor }}
              >
                Getting started
              </button>
              <button
                type="button"
                onClick={() => navigate('api-reference')}
                className="nd-focus rounded font-medium underline underline-offset-4"
                style={{ color: brand.primaryColor }}
              >
                API reference
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
