// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Input, Label, Select, Checkbox, Table, THead, TBody, TR, TH, TD } = UI;
const { Check, X, Filter, ArrowLeft, AlertCircle, CheckCircle } = Icons;

const USER = {
  id: "usr_01HQ8",
  name: "Satya Ganaraju",
  email: "satya.ganaraju@quorq.ai",
  is_admin: true,
  is_enabled: true,
  created_at: "12 March 2026",
  initials: "SG",
};

const INITIAL_ACTIVITY = [
  { id: "la_9f2", when: "Today, 09:12", device: "Chrome 131 · macOS · 10.4.2.19", status: "success" },
  { id: "la_9f1", when: "Today, 09:11", device: "Chrome 131 · macOS · 10.4.2.19", status: "failed" },
  { id: "la_8c7", when: "Yesterday, 17:46", device: "Safari · iPadOS · 10.4.2.88", status: "success" },
  { id: "la_8c4", when: "Mon 5 Oct, 22:14", device: "Firefox 133 · Windows · 86.21.4.7", status: "locked" },
  { id: "la_8c3", when: "Mon 5 Oct, 22:13", device: "Firefox 133 · Windows · 86.21.4.7", status: "failed" },
  { id: "la_8c2", when: "Mon 5 Oct, 22:11", device: "Firefox 133 · Windows · 86.21.4.7", status: "failed" },
  { id: "la_7b9", when: "Fri 2 Oct, 08:34", device: "Chrome 131 · macOS · 10.4.2.19", status: "success" },
  { id: "la_7a1", when: "Thu 1 Oct, 09:02", device: "Chrome 131 · macOS · 10.4.2.19", status: "success" },
];

const STATUS_META = {
  success: { label: "Signed in", tint: "#5B9CF8" },
  failed: { label: "Failed attempt", tint: "#F4A259" },
  locked: { label: "Locked 15 min", tint: "#E5736B" },
  changed: { label: "Password changed", tint: "#5B9CF8" },
};

const THEME_OPTIONS = [
  { value: "light", label: "Light", hint: "White with soft blue-grey" },
  { value: "dark", label: "Dark", hint: "Near-black, low glare" },
  { value: "system", label: "System", hint: "Follows your OS appearance" },
];

const DARK = {
  bg: "#101418",
  surface: "#161B21",
  surfaceAlt: "#1B2128",
  border: "#2A323B",
  text: "#E8ECF1",
  muted: "#8A95A1",
  field: "#0D1217",
};

const LIGHT = {
  bg: "#F5F8FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF3F8",
  border: "#D8E0E8",
  text: "#131920",
  muted: "#55616E",
  field: "#FFFFFF",
};

const MIN_LENGTH = 12;

export default function Screen() {
  const navigate = useNavigate();
  const [theme, setTheme] = React.useState("dark");
  const [themeNotice, setThemeNotice] = React.useState("");
  const systemAppearance = "dark";
  const resolved = theme === "system" ? systemAppearance : theme;
  const p = resolved === "light" ? LIGHT : DARK;

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [confirmation, setConfirmation] = React.useState("");
  const [lastChanged, setLastChanged] = React.useState("14 August 2026");

  const [activity, setActivity] = React.useState(INITIAL_ACTIVITY);
  const [activityFilter, setActivityFilter] = React.useState("all");

  const longEnough = next.length >= MIN_LENGTH;
  const hasVariety = /[0-9\W_]/.test(next);
  const matches = next.length > 0 && next === confirm;

  function handleTheme(value) {
    setTheme(value);
    const chosen = THEME_OPTIONS.find((o) => o.value === value);
    setThemeNotice(
      value === "system"
        ? "Theme set to System — currently showing Dark. Remembered on this browser."
        : "Theme set to " + chosen.label + ". Remembered on this browser."
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!current) {
      nextErrors.current = "Enter your current password.";
    } else if (current.length < 8) {
      nextErrors.current = "That does not match your current password.";
    }

    if (!next) {
      nextErrors.next = "Enter a new password.";
    } else if (!longEnough) {
      nextErrors.next = "Use at least " + MIN_LENGTH + " characters.";
    } else if (next === current) {
      nextErrors.next = "Choose a password different from your current one.";
    }

    if (!confirm) {
      nextErrors.confirm = "Repeat your new password.";
    } else if (next !== confirm) {
      nextErrors.confirm = "The two new passwords do not match.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setConfirmation("");
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setReveal(false);
    setLastChanged("Today, just now");
    setConfirmation(
      "Password changed. Your other sessions stay signed in — use this password next time you sign in."
    );
    setActivity((rows) => [
      {
        id: "la_" + Math.random().toString(36).slice(2, 6),
        when: "Today, just now",
        device: "Chrome 131 · macOS · 10.4.2.19",
        status: "changed",
      },
      ...rows,
    ]);
  }

  const visibleActivity = activity.filter((row) =>
    activityFilter === "all" ? true : row.status === activityFilter
  );

  const fieldStyle = {
    backgroundColor: p.field,
    color: p.text,
    borderColor: p.border,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: brand.radius,
    width: "100%",
    padding: "0.625rem 0.75rem",
  };

  const sectionStyle = {
    backgroundColor: p.surface,
    border: "1px solid " + p.border,
    borderRadius: brand.radius,
  };

  function FieldError({ id, message }) {
    if (!message) return null;
    return (
      <p id={id} className="mt-2 flex items-start gap-2 text-sm" style={{ color: "#E5736B" }}>
        <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
    );
  }

  function Rule({ ok, children }) {
    const Mark = ok ? Icons.Check : Icons.X;
    return (
      <li className="flex items-center gap-2 text-sm" style={{ color: ok ? p.text : p.muted }}>
        <Mark className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">{ok ? "Met: " : "Not yet met: "}</span>
        <span>{children}</span>
      </li>
    );
  }

  return (
    <div
      className="min-h-full w-full"
      style={{ backgroundColor: p.bg, color: p.text, fontFamily: brand.fontBody }}
    >
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-10">
          <button
            type="button"
            onClick={() => navigate("chat")}
            className="mb-6 inline-flex items-center gap-2 rounded px-2 py-1 -ml-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B9CF8]"
            style={{ color: p.muted }}
          >
            <Icons.ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to chat
          </button>

          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ fontFamily: brand.fontHeading, color: p.text }}
          >
            Account
          </h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed" style={{ color: p.muted }}>
            Change your password and choose how Knowledge Assistant looks on this browser.
          </p>
        </header>

        {/* Profile */}
        <section aria-labelledby="profile-heading" className="mb-8 p-6 sm:p-7" style={sectionStyle}>
          <h2 id="profile-heading" className="sr-only">
            Profile
          </h2>
          <div className="flex flex-wrap items-center gap-5">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
              style={{ backgroundColor: "rgba(91,156,248,0.18)", color: "#5B9CF8" }}
            >
              {USER.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold" style={{ color: p.text }}>
                {USER.name}
              </p>
              <p className="truncate text-sm" style={{ color: p.muted }}>
                {USER.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: "rgba(91,156,248,0.14)",
                  color: "#5B9CF8",
                  border: "1px solid rgba(91,156,248,0.35)",
                }}
              >
                <Icons.Check className="h-3.5 w-3.5" aria-hidden="true" />
                Administrator
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: p.surfaceAlt, color: p.muted, border: "1px solid " + p.border }}
              >
                Enabled
              </span>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-3" style={{ borderColor: p.border }}>
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: p.muted }}>
                Member since
              </dt>
              <dd className="mt-1 text-sm" style={{ color: p.text }}>
                {USER.created_at}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: p.muted }}>
                Password last changed
              </dt>
              <dd className="mt-1 text-sm" style={{ color: p.text }}>
                {lastChanged}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: p.muted }}>
                Session
              </dt>
              <dd className="mt-1 text-sm" style={{ color: p.text }}>
                Expires 21 Oct 2026
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate("sign-in")}
              className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B9CF8]"
              style={{
                backgroundColor: "transparent",
                color: p.text,
                border: "1px solid " + p.border,
                borderRadius: brand.radius,
              }}
            >
              <Icons.X className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>

        {/* Change password */}
        <section aria-labelledby="password-heading" className="mb-8 p-6 sm:p-7" style={sectionStyle}>
          <h2
            id="password-heading"
            className="text-xl font-semibold"
            style={{ fontFamily: brand.fontHeading, color: p.text }}
          >
            Change password
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: p.muted }}>
            Passwords are stored only as a one-way hash. This instance sends no email, so if you forget
            your password an operator must reset it for you.
          </p>

          <div aria-live="polite" role="status">
            {confirmation ? (
              <p
                className="mt-5 flex items-start gap-2 rounded px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(91,156,248,0.12)",
                  border: "1px solid rgba(91,156,248,0.4)",
                  color: p.text,
                  borderRadius: brand.radius,
                }}
              >
                <Icons.CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#5B9CF8" }} aria-hidden="true" />
                <span>{confirmation}</span>
              </p>
            ) : null}
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <Label htmlFor="current-password" className="mb-2 block text-sm font-medium" style={{ color: p.text }}>
                Current password
              </Label>
              <Input
                id="current-password"
                name="current_password"
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                aria-invalid={errors.current ? "true" : undefined}
                aria-describedby={errors.current ? "current-password-error" : undefined}
                style={fieldStyle}
              />
              <FieldError id="current-password-error" message={errors.current} />
            </div>

            <div>
              <Label htmlFor="new-password" className="mb-2 block text-sm font-medium" style={{ color: p.text }}>
                New password
              </Label>
              <Input
                id="new-password"
                name="new_password"
                type={reveal ? "text" : "password"}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                aria-invalid={errors.next ? "true" : undefined}
                aria-describedby={errors.next ? "new-password-error password-rules" : "password-rules"}
                style={fieldStyle}
              />
              <FieldError id="new-password-error" message={errors.next} />
              <ul id="password-rules" className="mt-3 space-y-1.5">
                <Rule ok={longEnough}>At least {MIN_LENGTH} characters</Rule>
                <Rule ok={hasVariety}>Includes a number or symbol</Rule>
                <Rule ok={matches}>Both new password fields match</Rule>
              </ul>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="mb-2 block text-sm font-medium" style={{ color: p.text }}>
                Confirm new password
              </Label>
              <Input
                id="confirm-password"
                name="confirm_password"
                type={reveal ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={errors.confirm ? "true" : undefined}
                aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
                style={fieldStyle}
              />
              <FieldError id="confirm-password-error" message={errors.confirm} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="reveal-passwords"
                checked={reveal}
                onChange={(e) => setReveal(e.target.checked ?? !reveal)}
                style={{ accentColor: brand.primaryColor }}
              />
              <Label htmlFor="reveal-passwords" className="text-sm" style={{ color: p.muted }}>
                Show passwords
              </Label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#5B9CF8]"
                style={{
                  backgroundColor: brand.primaryColor,
                  color: "#0B1016",
                  borderRadius: brand.radius,
                }}
              >
                <Icons.Check className="h-4 w-4" aria-hidden="true" />
                Update password
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrent("");
                  setNext("");
                  setConfirm("");
                  setErrors({});
                  setConfirmation("");
                }}
                className="px-4 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B9CF8]"
                style={{ color: p.muted, borderRadius: brand.radius }}
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        {/* Appearance */}
        <section aria-labelledby="appearance-heading" className="mb-8 p-6 sm:p-7" style={sectionStyle}>
          <h2
            id="appearance-heading"
            className="text-xl font-semibold"
            style={{ fontFamily: brand.fontHeading, color: p.text }}
          >
            Appearance
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: p.muted }}>
            Applies straight away and is remembered on this browser, including before you sign in.
          </p>

          <fieldset className="mt-6 border-0 p-0">
            <legend className="mb-3 text-sm font-medium" style={{ color: p.text }}>
              Theme
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const selected = theme === option.value;
                return (
                  <label
                    key={option.value}
                    htmlFor={"theme-" + option.value}
                    className="flex cursor-pointer items-start gap-3 p-4 focus-within:ring-2 focus-within:ring-[#5B9CF8]"
                    style={{
                      backgroundColor: selected ? p.surfaceAlt : "transparent",
                      border: "1px solid " + (selected ? brand.primaryColor : p.border),
                      borderRadius: brand.radius,
                    }}
                  >
                    <input
                      type="radio"
                      id={"theme-" + option.value}
                      name="theme"
                      value={option.value}
                      checked={selected}
                      onChange={() => handleTheme(option.value)}
                      className="mt-0.5 h-4 w-4 focus:outline-none"
                      style={{ accentColor: brand.primaryColor }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium" style={{ color: p.text }}>
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug" style={{ color: p.muted }}>
                        {option.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="mt-4 text-sm" role="status" aria-live="polite" style={{ color: p.muted }}>
            {themeNotice ||
              "Currently showing " +
                (resolved === "light" ? "Light" : "Dark") +
                (theme === "system" ? " — matching your system appearance." : ".")}
          </p>

          <div
            className="mt-6 p-5"
            style={{ backgroundColor: p.bg, border: "1px solid " + p.border, borderRadius: brand.radius }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: p.muted }}>
              Preview
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: p.text }}>
              The travel policy allows economy fares booked at least 14 days ahead; anything later needs
              your manager's approval in writing.
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs" style={{ color: p.muted }}>
                Sources:
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: "rgba(244,162,89,0.16)",
                  color: resolved === "light" ? "#8A5213" : "#F4A259",
                  border: "1px solid rgba(244,162,89,0.45)",
                }}
              >
                1 · Travel-Policy-2026.pdf
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: "rgba(244,162,89,0.16)",
                  color: resolved === "light" ? "#8A5213" : "#F4A259",
                  border: "1px solid rgba(244,162,89,0.45)",
                }}
              >
                2 · Expenses-FAQ.md
              </span>
            </p>
          </div>
        </section>

        {/* Recent activity */}
        <section aria-labelledby="activity-heading" className="p-6 sm:p-7" style={sectionStyle}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="activity-heading"
                className="text-xl font-semibold"
                style={{ fontFamily: brand.fontHeading, color: p.text }}
              >
                Recent sign-in activity
              </h2>
              <p className="mt-2 text-sm" style={{ color: p.muted }}>
                Five failed attempts within 15 minutes lock this email for 15 minutes.
              </p>
            </div>
            <div className="min-w-[12rem]">
              <Label htmlFor="activity-filter" className="mb-2 block text-sm font-medium" style={{ color: p.text }}>
                Filter by result
              </Label>
              <Select
                id="activity-filter"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                style={fieldStyle}
              >
                <option value="all">All events</option>
                <option value="success">Signed in</option>
                <option value="failed">Failed attempts</option>
                <option value="locked">Lockouts</option>
                <option value="changed">Password changes</option>
              </Select>
            </div>
          </div>

          <p className="mt-4 text-sm" aria-live="polite" style={{ color: p.muted }}>
            Showing {visibleActivity.length} of {activity.length} events
          </p>

          {visibleActivity.length === 0 ? (
            <div
              className="mt-4 px-5 py-10 text-center"
              style={{ border: "1px dashed " + p.border, borderRadius: brand.radius }}
            >
              <p className="text-sm font-medium" style={{ color: p.text }}>
                No events of this kind
              </p>
              <p className="mt-1 text-sm" style={{ color: p.muted }}>
                Nothing in the last 30 days matches this filter.
              </p>
              <button
                type="button"
                onClick={() => setActivityFilter("all")}
                className="mt-4 px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B9CF8]"
                style={{ border: "1px solid " + p.border, color: p.text, borderRadius: brand.radius }}
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table className="w-full text-left text-sm">
                <THead>
                  <TR style={{ borderBottom: "1px solid " + p.border }}>
                    <TH scope="col" className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide" style={{ color: p.muted }}>
                      When
                    </TH>
                    <TH scope="col" className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide" style={{ color: p.muted }}>
                      Result
                    </TH>
                    <TH scope="col" className="py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: p.muted }}>
                      Device and address
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {visibleActivity.map((row) => {
                    const meta = STATUS_META[row.status];
                    return (
                      <TR key={row.id} style={{ borderBottom: "1px solid " + p.border }}>
                        <TD className="py-3 pr-4 whitespace-nowrap" style={{ color: p.text }}>
                          {row.when}
                        </TD>
                        <TD className="py-3 pr-4">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: p.surfaceAlt,
                              color: resolved === "light" && row.status === "failed" ? "#8A5213" : meta.tint,
                              border: "1px solid " + p.border,
                            }}
                          >
                            {row.status === "success" || row.status === "changed" ? (
                              <Icons.CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : row.status === "failed" ? (
                              <Icons.AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Icons.X className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {meta.label}
                          </span>
                        </TD>
                        <TD className="py-3" style={{ color: p.muted }}>
                          {row.device}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
