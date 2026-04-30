/* global React, Phone, TabBar, TopBar, Avatar, Ring, Sparkline, SectionHeader,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft, IconChevronDown,
   IconHeart, IconActivity, IconFootprints, IconMoon, IconWater, IconFire, IconSparkle,
   IconSun, IconCoffee, IconStethoscope, IconMapPin, IconVideo, IconClock, IconFilter,
   IconPill, IconCheck, IconX, IconRefresh, IconAlert, IconDroplet,
   IconShield, IconSettings, IconBadge, IconTarget, IconLock, IconGlobe,
   IconHeartPulse, IconUser, IconMore, IconCamera, IconPaperclip, IconRobot, IconSend,
   IconCalendar, IconChat */

/* ╔═══════════════════════════════════════════════════════════
   ║  A · AUTH & ONBOARDING
   ╚═══════════════════════════════════════════════════════════ */

// Small logomark
function Logomark({ size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 10px 30px -10px color-mix(in srgb, var(--brand) 50%, transparent)",
    }}>
      <IconHeartPulse size={size * 0.52} style={{ color: "#fff" }} strokeWidth={2.2}/>
    </div>
  );
}

function FullBtn({ children, variant = "primary", ...rest }) {
  const styles = {
    primary: { background: "var(--brand)", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "var(--ink)", border: "1px solid var(--border-strong)" },
    danger:  { background: "var(--danger, #E54D4D)", color: "#fff", border: "none" },
  }[variant];
  return (
    <button {...rest} style={{
      width: "100%", height: 52, borderRadius: 14,
      fontSize: 15, fontWeight: 700, letterSpacing: -0.1,
      cursor: "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      ...styles, ...(rest.style || {}),
    }}>{children}</button>
  );
}

function Field({ label, children, error, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6, letterSpacing: 0.1 }}>{label}</div>
      {children}
      {error && <div style={{ fontSize: 11, color: "var(--danger, #E54D4D)", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}><IconAlert size={11}/> {error}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 5 }}>{hint}</div>}
    </label>
  );
}

function TextInput({ value, placeholder, type = "text", error, leading, trailing }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      height: 50, padding: "0 14px",
      background: "var(--card)",
      border: `1px solid ${error ? "var(--danger, #E54D4D)" : "var(--border-strong)"}`,
      borderRadius: 12,
    }}>
      {leading && <span style={{ color: "var(--ink-3)", display: "flex" }}>{leading}</span>}
      <input type={type} defaultValue={value} placeholder={placeholder} style={{
        flex: 1, border: "none", background: "transparent", outline: "none",
        fontSize: 15, color: "var(--ink)", fontFamily: "inherit",
      }}/>
      {trailing && <span style={{ color: "var(--ink-3)", display: "flex" }}>{trailing}</span>}
    </div>
  );
}

// 1. Welcome
function WelcomeScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div className="screen-body" style={{ display: "flex", flexDirection: "column", padding: "24px 28px 28px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: -40, borderRadius: "50%",
              background: "radial-gradient(circle, var(--brand-soft), transparent 70%)",
            }}/>
            <Logomark size={96}/>
          </div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1 }}>
              Your health,<br/>in one calm place
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 12, lineHeight: 1.5, maxWidth: 280 }}>
              Track vitals, manage medications, chat with care — all private, all yours.
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: i === 0 ? 22 : 6, height: 6, borderRadius: 3,
                background: i === 0 ? "var(--brand)" : "var(--border-strong)",
                transition: "width .2s",
              }}/>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <FullBtn>Get started</FullBtn>
          <button style={{
            height: 44, border: "none", background: "transparent",
            color: "var(--ink-2)", fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}>I already have an account</button>
          <div style={{ textAlign: "center", fontSize: 10, color: "var(--ink-4)", marginTop: 6, lineHeight: 1.5 }}>
            By continuing, you agree to our Terms & Privacy Policy
          </div>
        </div>
      </div>
    </Phone>
  );
}

// 2. Login
function LoginScreen({ theme = "theme-calm", error = false }) {
  return (
    <Phone theme={theme}>
      <TopBar left={<button className="icon-btn ghost"><IconChevronLeft size={20}/></button>} title=""/>
      <div className="screen-body" style={{ padding: "0 24px 24px" }}>
        <Logomark size={44}/>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 18 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Sign in to continue to HealthOS</div>

        <div style={{ marginTop: 24 }}>
          <Field label="Email">
            <TextInput type="email" value="minh.nguyen@example.com" leading={<IconUser size={16}/>}/>
          </Field>
          <Field label="Password" error={error ? "Password doesn't match our records" : undefined}>
            <TextInput
              type="password"
              value={error ? "incorrect" : "••••••••••"}
              leading={<IconLock size={16}/>}
              error={error}
              trailing={<span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700 }}>Show</span>}
            />
          </Field>
          <div style={{ textAlign: "right", fontSize: 13, color: "var(--brand)", fontWeight: 600, marginTop: -4, marginBottom: 18 }}>Forgot password?</div>

          <FullBtn>Sign in</FullBtn>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
            <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>OR CONTINUE WITH</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="btn ghost" style={{ height: 46, fontSize: 13 }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2h-10v4.1h5.7c-.2 1.3-1 2.5-2.1 3.2v2.7h3.4c2-1.9 3.2-4.6 3.2-7.8z"/><path fill="#34A853" d="M12.3 23c2.9 0 5.3-1 7-2.6L15.9 17.7c-1 .6-2.1 1-3.6 1-2.7 0-5.1-1.9-5.9-4.3H2.8v2.7C4.6 20.9 8.2 23 12.3 23z"/><path fill="#FBBC04" d="M6.4 14.4c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.7H2.8C2 9.1 1.6 10.5 1.6 12s.4 2.9 1.2 4.3l3.6-1.9z"/><path fill="#EA4335" d="M12.3 5.4c1.5 0 2.9.5 4 1.5L19.4 4c-1.9-1.8-4.3-2.8-7.1-2.8C8.2 1.2 4.6 3.5 2.8 7L6.4 9.7c.8-2.4 3.2-4.3 5.9-4.3z"/></svg>
              Google
            </button>
            <button className="btn ghost" style={{ height: 46, fontSize: 13 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.5c0-2.4 2-3.6 2-3.7-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.2-2.8.8-3.6.8-.8 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.9 2.4-1.6 2.9-.4 7 1.2 9.4.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.2 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6 0-.1-2.2-.9-2.2-3.3zM14.6 5.5c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 2.9 1.1.1 2.2-.6 2.9-1.4z"/></svg>
              Apple
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)", marginTop: 24 }}>
            New here? <span style={{ color: "var(--brand)", fontWeight: 700 }}>Create account</span>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// 3. Register
function RegisterScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar left={<button className="icon-btn ghost"><IconChevronLeft size={20}/></button>} title=""/>
      <div className="screen-body" style={{ padding: "0 24px 24px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Create account</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Takes under 2 minutes · Step 1 of 2</div>

        <div style={{ margin: "16px 0 22px", height: 4, background: "var(--chip)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: "50%", height: "100%", background: "var(--brand)" }}/>
        </div>

        <Field label="Full name"><TextInput placeholder="Minh Nguyen"/></Field>
        <Field label="Email"><TextInput type="email" placeholder="you@example.com"/></Field>
        <Field label="Password" hint="At least 8 characters with a number">
          <TextInput type="password" value="••••••••" trailing={<IconCheck size={16} style={{ color: "var(--success, #059669)" }}/>}/>
        </Field>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 6, marginBottom: 18 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1,
          }}><IconCheck size={12} style={{ color: "#fff" }}/></div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
            I agree to the <span style={{ color: "var(--brand)", fontWeight: 600 }}>Terms</span> and acknowledge the <span style={{ color: "var(--brand)", fontWeight: 600 }}>Privacy & Health Data Policy</span>
          </div>
        </div>

        <FullBtn>Continue</FullBtn>
      </div>
    </Phone>
  );
}

// 4. OTP
function OtpScreen({ theme = "theme-calm" }) {
  const code = ["4", "9", "2", "", "", ""];
  return (
    <Phone theme={theme}>
      <TopBar left={<button className="icon-btn ghost"><IconChevronLeft size={20}/></button>} title=""/>
      <div className="screen-body" style={{ padding: "0 24px 24px" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "var(--brand-soft)", color: "var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconShield size={24}/>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 18 }}>Verify it's you</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
          We sent a 6-digit code to <b style={{ color: "var(--ink-2)" }}>+84 ••• ••• 847</b>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginTop: 28 }}>
          {code.map((c, i) => (
            <div key={i} style={{
              aspectRatio: "1 / 1.15",
              borderRadius: 12,
              border: `1.5px solid ${c ? "var(--brand)" : i === 3 ? "var(--brand)" : "var(--border-strong)"}`,
              background: "var(--card)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 700,
              color: "var(--ink)",
              boxShadow: i === 3 ? "0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent)" : "none",
            }} className="tabular">
              {c || (i === 3 ? <span style={{
                width: 2, height: 22, background: "var(--brand)",
                animation: "blink 1s steps(2) infinite",
              }}/> : "")}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-3)", marginTop: 20 }}>
          Didn't get it? <span style={{ color: "var(--brand)", fontWeight: 700 }}>Resend in 0:28</span>
        </div>

        <div style={{ marginTop: 28 }}>
          <FullBtn>Verify</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

// 5. Forgot password
function ForgotScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar left={<button className="icon-btn ghost"><IconChevronLeft size={20}/></button>} title=""/>
      <div className="screen-body" style={{ padding: "0 24px 24px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Reset password</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
          Enter the email linked to your HealthOS account and we'll send a reset link.
        </div>
        <div style={{ marginTop: 24 }}>
          <Field label="Email"><TextInput type="email" placeholder="you@example.com" leading={<IconUser size={16}/>}/></Field>
        </div>
        <FullBtn>Send reset link</FullBtn>

        <div className="card" style={{ marginTop: 20, padding: 14, display: "flex", gap: 10 }}>
          <div style={{ color: "var(--brand)", flexShrink: 0 }}><IconShield size={18}/></div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
            For your security, reset links expire after 15 minutes. Contact <b>support@healthos.app</b> if you can't access your email.
          </div>
        </div>
      </div>
    </Phone>
  );
}

// 6. First-time health profile setup — step
function HealthProfileSetupScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar
        left={<button className="icon-btn ghost"><IconChevronLeft size={20}/></button>}
        title=""
        right={<span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>Skip</span>}
      />
      <div className="screen-body" style={{ padding: "0 24px 24px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[1,1,0,0,0].map((f, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: f ? "var(--brand)" : "var(--chip)" }}/>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Step 2 · Body basics</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginTop: 6, lineHeight: 1.2 }}>Tell us a bit about your body</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>Only used to personalize insights. You can change this later.</div>

        <div style={{ marginTop: 24 }}>
          <Field label="Birth date"><TextInput value="Jul 14, 1993" trailing={<IconCalendar size={16}/>}/></Field>
          <Field label="Sex at birth">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[{ v: "Male", on: true }, { v: "Female" }, { v: "Other" }].map(({v, on}) => (
                <button key={v} style={{
                  height: 48, borderRadius: 12,
                  background: on ? "var(--brand-soft)" : "var(--card)",
                  border: `1.5px solid ${on ? "var(--brand)" : "var(--border-strong)"}`,
                  color: on ? "var(--brand)" : "var(--ink-2)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}>{v}</button>
              ))}
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Height"><TextInput value="172 cm"/></Field>
            <Field label="Weight"><TextInput value="68 kg"/></Field>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <FullBtn>Continue</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

// 7. Permission onboarding
function PermissionsScreen({ theme = "theme-calm", kind = "notifications" }) {
  const variants = {
    notifications: {
      Ic: IconBell,
      title: "Turn on reminders",
      body: "We'll nudge you when it's time for medication or a scheduled appointment. Nothing else — ever.",
      bullets: [
        { label: "Medication reminders", Ic: IconPill },
        { label: "Appointment alerts", Ic: IconCalendar },
        { label: "Weekly health digest", Ic: IconSparkle },
      ],
      cta: "Allow notifications",
    },
    camera: {
      Ic: IconCamera,
      title: "Snap meals & scans",
      body: "Use your camera to log food, scan prescriptions, or capture lab reports. Images stay on your device unless you save them.",
      bullets: [
        { label: "Log meals from photo", Ic: IconCoffee },
        { label: "Scan prescriptions", Ic: IconPill },
        { label: "Capture lab reports", Ic: IconActivity },
      ],
      cta: "Allow camera",
    },
    health: {
      Ic: IconActivity,
      title: "Connect your health data",
      body: "Link Apple Health, Google Health Connect, or a wearable to auto-sync vitals and activity. Read-only by default.",
      bullets: [
        { label: "Heart rate & vitals", Ic: IconHeartPulse },
        { label: "Steps & activity", Ic: IconFootprints },
        { label: "Sleep tracking", Ic: IconMoon },
      ],
      cta: "Connect Health Connect",
    },
  };
  const v = variants[kind];
  return (
    <Phone theme={theme}>
      <TopBar
        left={<button className="icon-btn ghost"><IconChevronLeft size={20}/></button>}
        title=""
        right={<span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>Skip</span>}
      />
      <div className="screen-body" style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 10,
        }}>
          <v.Ic size={36} strokeWidth={1.8}/>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 22, lineHeight: 1.15 }}>{v.title}</div>
        <div style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>{v.body}</div>

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          {v.bullets.map((b) => (
            <div key={b.label} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--brand-soft)", color: "var(--brand)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><b.Ic size={16}/></div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{b.label}</div>
              <IconCheck size={16} style={{ marginLeft: "auto", color: "var(--success, #059669)" }}/>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", margin: "18px 0 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <IconLock size={11}/> Private by default · revoke anytime
        </div>
        <FullBtn>{v.cta}</FullBtn>
        <button style={{
          height: 44, marginTop: 6, border: "none", background: "transparent",
          color: "var(--ink-3)", fontSize: 14, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit",
        }}>Not now</button>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  WelcomeScreen, LoginScreen, RegisterScreen, OtpScreen, ForgotScreen,
  HealthProfileSetupScreen, PermissionsScreen,
  FullBtn, Field, TextInput, Logomark,
});
