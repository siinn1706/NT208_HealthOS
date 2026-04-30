/* global React, Phone, TabBar, TopBar, BackBar, SectionHeader,
   IconChevronRight, IconChevronLeft, IconChevronDown, IconCalendar, IconClock,
   IconCheck, IconX, IconPaperclip, IconAlert, IconSearch, IconCamera,
   FullBtn, Field, TextInput, Toggle */

/* ╔═══════════════════════════════════════════════════════════
   ║  E · REUSABLE FORM PATTERNS
   ╚═══════════════════════════════════════════════════════════ */

// One card that wraps an example with a label
function Example({ title, children, style }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

// Text input & Select & Upload
function FormInputsScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Inputs"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <Example title="Default"><Field label="Email"><TextInput value="minh@example.com"/></Field></Example>
        <Example title="With leading + trailing">
          <Field label="Search"><TextInput placeholder="Find a medication…" leading={<IconSearch size={15}/>} trailing={<span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 700 }}>⌘K</span>}/></Field>
        </Example>
        <Example title="Focused">
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Full name</div>
            <div style={{
              display: "flex", alignItems: "center", height: 50, padding: "0 14px",
              background: "var(--card)", borderRadius: 12,
              border: "1.5px solid var(--brand)",
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent)",
            }}>
              <input defaultValue="Minh Nguyen" style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 15, color: "var(--ink)", fontFamily: "inherit" }}/>
              <span style={{ width: 2, height: 18, background: "var(--brand)", animation: "blink 1s steps(2) infinite" }}/>
            </div>
          </label>
        </Example>
        <Example title="Error state">
          <Field label="Password" error="Must be at least 8 characters">
            <TextInput type="password" value="1234" error/>
          </Field>
        </Example>
        <Example title="Disabled">
          <Field label="Member since">
            <div style={{
              display: "flex", alignItems: "center", height: 50, padding: "0 14px",
              background: "var(--chip)", border: "1px solid var(--border)",
              borderRadius: 12, color: "var(--ink-3)", fontSize: 15,
            }}>Mar 3, 2026</div>
          </Field>
        </Example>

        <Example title="Select / dropdown">
          <Field label="Specialty">
            <div style={{
              display: "flex", alignItems: "center", height: 50, padding: "0 14px",
              background: "var(--card)", border: "1px solid var(--border-strong)",
              borderRadius: 12, justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 15 }}>Cardiology</span>
              <IconChevronDown size={15} style={{ color: "var(--ink-3)" }}/>
            </div>
          </Field>
        </Example>

        <Example title="Upload attachment">
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <UploadRow name="Lab_results.pdf" size="482 KB" done/>
            <UploadRow name="ECG_scan.png" size="2.3 MB" progress={0.64}/>
            <UploadRow name="Prescription.jpg" size="1.1 MB" error last/>
          </div>
        </Example>
      </div>
    </Phone>
  );
}

function UploadRow({ name, size, done, progress, error, last }) {
  return (
    <div style={{
      padding: 14, borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: error ? "color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)" : done ? "color-mix(in srgb, var(--success, #059669) 14%, transparent)" : "var(--brand-soft)",
          color: error ? "var(--danger, #E54D4D)" : done ? "var(--success, #059669)" : "var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{error ? <IconAlert size={15}/> : done ? <IconCheck size={15} strokeWidth={3}/> : <IconPaperclip size={15}/>}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, marginTop: 1, color: error ? "var(--danger, #E54D4D)" : done ? "var(--success, #059669)" : "var(--brand)" }}>
            {error ? "Upload failed · tap to retry" : done ? `${size} · Uploaded` : `${size} · Uploading…`}
          </div>
        </div>
        <IconX size={16} style={{ color: "var(--ink-3)" }}/>
      </div>
      {progress != null && (
        <div style={{ height: 4, background: "var(--chip)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--brand)" }}/>
        </div>
      )}
    </div>
  );
}

// Date, Time, Toggle, Radio
function FormPickersScreen({ theme = "theme-calm" }) {
  const [day, setDay] = React.useState(24);
  return (
    <Phone theme={theme}>
      <BackBar title="Pickers & controls"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <Example title="Date picker">
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <button className="icon-btn ghost"><IconChevronLeft size={16}/></button>
              <div style={{ fontSize: 14, fontWeight: 700 }}>April 2026</div>
              <button className="icon-btn ghost"><IconChevronRight size={16}/></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textAlign: "center", marginBottom: 6 }}>
              {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const d = i + 1;
                const on = d === day;
                const today = d === 24;
                return (
                  <button key={i} onClick={() => setDay(d)} style={{
                    aspectRatio: "1", borderRadius: 8,
                    background: on ? "var(--brand)" : today ? "var(--brand-soft)" : "transparent",
                    color: on ? "#fff" : today ? "var(--brand)" : "var(--ink)",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12, fontWeight: on ? 700 : 500,
                  }}>{d}</button>
                );
              })}
            </div>
          </div>
        </Example>

        <Example title="Time picker (wheel)">
          <div className="card" style={{ padding: "14px 0", position: "relative" }}>
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0,
              height: 40, transform: "translateY(-50%)",
              background: "var(--brand-soft)", borderRadius: 8, margin: "0 14px", pointerEvents: "none",
            }}/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 20px 1fr", alignItems: "center", position: "relative", zIndex: 1 }}>
              <WheelCol values={["05","06","07","08","09"]} selected={2}/>
              <div className="tabular" style={{ textAlign: "center", fontSize: 22, fontWeight: 700 }}>:</div>
              <WheelCol values={["15","20","25","30","35"]} selected={3}/>
            </div>
          </div>
        </Example>

        <Example title="Toggle">
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <ToggleRow label="Medication reminders" sub="Alerts at scheduled times" on/>
            <ToggleRow label="Weekly health digest" sub="Mondays at 8 am" on/>
            <ToggleRow label="Marketing emails" sub="News and tips" last/>
          </div>
        </Example>

        <Example title="Radio options">
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <RadioRow label="Once daily" sub="e.g. morning or evening" on/>
            <RadioRow label="Twice daily" sub="Morning and evening"/>
            <RadioRow label="Three times daily" sub="Morning, noon, evening"/>
            <RadioRow label="As needed (PRN)" sub="Only when symptoms occur" last/>
          </div>
        </Example>
      </div>
    </Phone>
  );
}

function WheelCol({ values, selected }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {values.map((v, i) => {
        const dist = Math.abs(i - selected);
        return (
          <div key={i} className="tabular" style={{
            fontSize: dist === 0 ? 22 : 18,
            fontWeight: dist === 0 ? 700 : 500,
            color: dist === 0 ? "var(--ink)" : `color-mix(in srgb, var(--ink-3) ${100 - dist * 25}%, transparent)`,
            lineHeight: 1.7,
          }}>{v}</div>
        );
      })}
    </div>
  );
}

function ToggleRow({ label, sub, on, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: 14,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>}
      </div>
      <Toggle on={on}/>
    </div>
  );
}

function RadioRow({ label, sub, on, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14,
      borderBottom: last ? "none" : "1px solid var(--border)",
      background: on ? "var(--brand-soft)" : "transparent",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        border: `2px solid ${on ? "var(--brand)" : "var(--border-strong)"}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{on && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand)" }}/>}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Confirmation bottom sheet (positive)
function ConfirmSheetScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div className="screen-body" style={{ position: "relative" }}>
        <div style={{ padding: "44px 20px 20px", opacity: 0.3 }}>
          <div style={{ height: 200, borderRadius: 16, background: "var(--card)" }}/>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, #000 40%, transparent)" }}/>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "var(--bg-elev)",
          borderRadius: "24px 24px 0 0",
          padding: "10px 20px 28px",
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-strong)", margin: "0 auto 14px" }}/>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "var(--brand-soft)",
            color: "var(--brand)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><IconCheck size={24} strokeWidth={2.5}/></div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14, letterSpacing: -0.3 }}>Book this appointment?</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
            Dr. Nguyen Lan · Friday Apr 26, 11:30 · Video visit. You'll get a reminder 1 hour before.
          </div>

          <div className="card" style={{ marginTop: 14, padding: 12, display: "flex", gap: 10, alignItems: "center", background: "var(--chip)", border: "none" }}>
            <IconCalendar size={16} style={{ color: "var(--ink-2)" }}/>
            <div style={{ flex: 1, fontSize: 12 }}>Also add to your device calendar</div>
            <Toggle on/>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <FullBtn variant="ghost">Not yet</FullBtn>
            <FullBtn>Confirm booking</FullBtn>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// Destructive confirmation
function DestructiveDialogScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div className="screen-body" style={{ position: "relative" }}>
        <div style={{ padding: "44px 20px 20px", opacity: 0.3 }}>
          <div style={{ height: 220, borderRadius: 16, background: "var(--card)" }}/>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, #000 50%, transparent)" }}/>
        <div style={{
          position: "absolute", top: "32%", left: 20, right: 20,
          background: "var(--bg-elev)", borderRadius: 20, padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)",
            color: "var(--danger, #E54D4D)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto",
          }}><IconAlert size={24}/></div>
          <div style={{ fontSize: 18, fontWeight: 800, textAlign: "center", marginTop: 14, letterSpacing: -0.3 }}>Delete this record?</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
            Your BP log entry from Apr 18 will be permanently removed. This cannot be undone.
          </div>

          <div className="card" style={{ margin: "16px 0", padding: 10, textAlign: "center", background: "var(--chip)", border: "none", fontSize: 12 }}>
            <b style={{ color: "var(--ink)" }}>Apr 18 · 09:12</b> · 132/86 mmHg
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FullBtn style={{ background: "var(--danger, #E54D4D)" }}>Delete forever</FullBtn>
            <FullBtn variant="ghost">Keep it</FullBtn>
          </div>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  FormInputsScreen, FormPickersScreen, ConfirmSheetScreen, DestructiveDialogScreen,
  UploadRow, WheelCol, ToggleRow, RadioRow, Example,
});
