/* global React, Phone, TabBar, TopBar, Avatar, Ring, Sparkline, SectionHeader,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft, IconChevronDown,
   IconHeart, IconActivity, IconFootprints, IconMoon, IconWater, IconFire, IconSparkle,
   IconSun, IconCoffee, IconStethoscope, IconMapPin, IconVideo, IconClock, IconFilter,
   IconPill, IconCheck, IconX, IconRefresh, IconAlert, IconDroplet,
   IconShield, IconSettings, IconBadge, IconTarget, IconLock, IconGlobe,
   IconHeartPulse, IconUser, IconMore, IconCamera, IconPaperclip, IconRobot, IconSend,
   IconCalendar, IconChat, FullBtn, Field, TextInput */

/* ╔═══════════════════════════════════════════════════════════
   ║  B · HOME DRILL-DOWN
   ╚═══════════════════════════════════════════════════════════ */

function BackBar({ title, right }) {
  return (
    <header className="topbar" style={{ padding: "6px 14px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="icon-btn ghost"><IconChevronLeft size={20}/></button>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>{right}</div>
    </header>
  );
}

// Today overview detail
function TodayOverviewScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Today · Apr 24" right={<button className="icon-btn"><IconMore size={18}/></button>}/>
      <div className="screen-body" style={{ padding: "4px 20px 20px" }}>
        <div className="card" style={{
          background: "linear-gradient(140deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 70%, var(--accent)) 100%)",
          color: "#fff", border: "none", padding: 18, marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Ring value={0.82} size={80} stroke={8} color="#fff" track="rgba(255,255,255,0.2)">
              <span style={{ color: "#fff", fontSize: 18 }}>82</span>
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Health score</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Looking good</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Up 3 pts from last week</div>
            </div>
          </div>
          <button style={{
            marginTop: 14, width: "100%", height: 40, borderRadius: 10,
            background: "rgba(255,255,255,0.18)", color: "#fff",
            border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit",
          }}>How is this calculated?</button>
        </div>

        <SectionHeader title="Goals today" action="4 of 6 hit"/>
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          {[
            { label: "10,000 steps", val: "7,241", pct: 0.72, Ic: IconFootprints, done: false },
            { label: "2.5L water", val: "1.6L", pct: 0.64, Ic: IconWater, done: false },
            { label: "8h sleep", val: "7h 12m", pct: 0.9, Ic: IconMoon, done: true },
            { label: "Take all meds", val: "2 of 4", pct: 0.5, Ic: IconPill, done: false },
          ].map((g, i) => (
            <div key={g.label} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0",
              borderBottom: i === 3 ? "none" : "1px solid var(--border)",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: g.done ? "color-mix(in srgb, var(--success, #059669) 18%, transparent)" : "var(--brand-soft)",
                color: g.done ? "var(--success, #059669)" : "var(--brand)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><g.Ic size={15}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                  <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: g.done ? "var(--success, #059669)" : "var(--ink-2)" }}>{g.val}</span>
                </div>
                <div style={{ height: 4, background: "var(--chip)", borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
                  <div style={{ width: `${g.pct * 100}%`, height: "100%", background: g.done ? "var(--success, #059669)" : "var(--brand)", borderRadius: 2 }}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        <SectionHeader title="What changed?"/>
        <div className="card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
          <ChangeRow dir="up" label="Resting heart rate" val="68 bpm" change="-4 bpm vs last wk" good/>
          <div style={{ height: 1, background: "var(--border)", marginLeft: 48 }}/>
          <ChangeRow dir="up" label="Sleep duration" val="7h 12m avg" change="+22 min vs last wk" good/>
          <div style={{ height: 1, background: "var(--border)", marginLeft: 48 }}/>
          <ChangeRow dir="down" label="Daily water intake" val="1.8L avg" change="-0.4L vs last wk"/>
        </div>

        <div className="card" style={{
          background: "var(--brand-soft)", border: "none",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ color: "var(--brand)" }}><IconTarget size={22}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>Recommended next</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>Drink 500ml of water now to catch up</div>
          </div>
          <IconChevronRight size={16} style={{ color: "var(--brand)" }}/>
        </div>
      </div>
      <TabBar active="home"/>
    </Phone>
  );
}

function ChangeRow({ dir, label, val, change, good }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: good ? "color-mix(in srgb, var(--success, #059669) 15%, transparent)" : "color-mix(in srgb, var(--warning, #D97706) 15%, transparent)",
        color: good ? "var(--success, #059669)" : "var(--warning, #D97706)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>{dir === "up" ? "▲" : "▼"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: good ? "var(--success, #059669)" : "var(--warning, #D97706)", marginTop: 1, fontWeight: 500 }}>{change}</div>
      </div>
      <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{val}</span>
    </div>
  );
}

// Health score explanation
function HealthScoreDetailScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Health score"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div style={{ textAlign: "center", padding: "8px 0 18px" }}>
          <Ring value={0.82} size={140} stroke={12} color="var(--brand)">
            <div>
              <div className="tabular" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>82</div>
              <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>/ 100</div>
            </div>
          </Ring>
          <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700 }}>Looking good</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, maxWidth: 280, margin: "4px auto 0", lineHeight: 1.5 }}>
            A composite of 6 factors based on your logged activity, vitals, and medication adherence.
          </div>
        </div>

        <SectionHeader title="How we calculate"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          {[
            { label: "Medication adherence", val: 94, weight: "25%" },
            { label: "Sleep quality", val: 88, weight: "20%" },
            { label: "Activity", val: 72, weight: "20%" },
            { label: "Vitals in range", val: 91, weight: "15%" },
            { label: "Nutrition", val: 65, weight: "10%" },
            { label: "Hydration", val: 64, weight: "10%" },
          ].map((f, i, arr) => (
            <div key={f.label} style={{
              padding: "12px 14px",
              borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>Weight {f.weight}</div>
                </div>
                <span className="tabular" style={{ fontSize: 15, fontWeight: 700, color: f.val >= 80 ? "var(--success, #059669)" : f.val >= 60 ? "var(--ink)" : "var(--warning, #D97706)" }}>{f.val}</span>
              </div>
              <div style={{ height: 4, background: "var(--chip)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${f.val}%`, height: "100%", background: f.val >= 80 ? "var(--success, #059669)" : f.val >= 60 ? "var(--brand)" : "var(--warning, #D97706)", borderRadius: 2 }}/>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 12, display: "flex", gap: 10, background: "var(--chip)", border: "none" }}>
          <IconShield size={16} style={{ color: "var(--ink-3)", flexShrink: 0, marginTop: 2 }}/>
          <div style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Not a clinical score. For guidance only — always consult your care team for medical decisions.
          </div>
        </div>
      </div>
    </Phone>
  );
}

// Vitals trend detail
function VitalsDetailScreen({ theme = "theme-calm" }) {
  const [range, setRange] = React.useState("7D");
  return (
    <Phone theme={theme}>
      <BackBar title="Heart rate" right={<>
        <button className="icon-btn"><IconPlus size={16}/></button>
        <button className="icon-btn"><IconMore size={18}/></button>
      </>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Resting · 7 day average</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span className="tabular" style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.2 }}>68</span>
            <span style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500 }}>bpm</span>
            <span className="chip success" style={{ marginLeft: "auto" }}>▼ 4 bpm</span>
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
          padding: 4, background: "var(--chip)", borderRadius: 10, marginTop: 16,
        }}>
          {["1D", "7D", "1M", "6M", "1Y"].map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "7px 0", borderRadius: 7, border: "none", cursor: "pointer",
              background: range === r ? "var(--card)" : "transparent",
              color: range === r ? "var(--ink)" : "var(--ink-3)",
              fontWeight: 700, fontSize: 11, fontFamily: "inherit",
              boxShadow: range === r ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>{r}</button>
          ))}
        </div>

        <div className="card" style={{ marginTop: 14, padding: "14px 10px" }}>
          <svg viewBox="0 0 320 140" width="100%" height={140}>
            {[0,1,2,3,4].map(i => (
              <line key={i} x1={0} x2={320} y1={20 + i * 25} y2={20 + i * 25}
                    stroke="var(--border)" strokeDasharray="2 3" strokeWidth="1"/>
            ))}
            {/* zone */}
            <rect x={0} y={50} width={320} height={50} fill="color-mix(in srgb, var(--success, #059669) 10%, transparent)"/>
            {/* area */}
            <path d="M0,70 L40,78 L80,60 L120,66 L160,82 L200,90 L240,84 L280,88 L320,92 L320,140 L0,140 Z"
                  fill="var(--brand)" opacity="0.14"/>
            <path d="M0,70 L40,78 L80,60 L120,66 L160,82 L200,90 L240,84 L280,88 L320,92"
                  stroke="var(--brand)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {[{x:40,y:78},{x:80,y:60},{x:120,y:66},{x:160,y:82},{x:200,y:90},{x:240,y:84},{x:280,y:88}].map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--card)" stroke="var(--brand)" strokeWidth="2"/>
            ))}
            <circle cx={200} cy={90} r="5" fill="var(--brand)"/>
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "var(--ink-4)", fontWeight: 600 }}>
            {["Apr 18","","20","","22","","24"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          <StatBlock label="Min" val="54" unit="bpm"/>
          <StatBlock label="Avg" val="68" unit="bpm" primary/>
          <StatBlock label="Max" val="124" unit="bpm"/>
        </div>

        <SectionHeader title="Insights" action="See all"/>
        <div className="card" style={{ padding: 14, display: "flex", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "var(--brand-soft)", color: "var(--brand)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><IconSparkle size={16}/></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Your resting HR is 4 bpm lower</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.45 }}>Likely tied to improved sleep consistency this week. Keep it up — we'll show this to Dr. Nguyen on Friday.</div>
          </div>
        </div>

        <SectionHeader title="Readings"/>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {[
            { t: "Apr 24 · 07:14", v: 64, tag: "Resting" },
            { t: "Apr 24 · 06:02", v: 122, tag: "Exercise" },
            { t: "Apr 23 · 22:30", v: 58, tag: "Sleep" },
          ].map((r, i, arr) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--border)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.tag}</div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{r.t}</div>
              </div>
              <span className="tabular" style={{ fontSize: 16, fontWeight: 700 }}>{r.v} <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>bpm</span></span>
            </div>
          ))}
        </div>
      </div>
    </Phone>
  );
}

function StatBlock({ label, val, unit, primary }) {
  return (
    <div className="card card-tight" style={{
      textAlign: "center", padding: "10px 6px",
      background: primary ? "var(--brand-soft)" : "var(--card)",
      borderColor: primary ? "transparent" : "var(--border)",
    }}>
      <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div className="tabular" style={{ fontSize: 20, fontWeight: 800, marginTop: 3, color: primary ? "var(--brand)" : "var(--ink)" }}>{val}</div>
      <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{unit}</div>
    </div>
  );
}

// AI insight detail
function AiInsightDetailScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Insight"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{
          padding: 18,
          background: "linear-gradient(140deg, var(--brand-soft) 0%, color-mix(in srgb, var(--accent) 22%, var(--card)) 100%)",
          borderColor: "var(--border-strong)",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "var(--brand)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><IconSparkle size={18}/></div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: 0.4 }}>AI insight</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Generated Apr 24 · 09:12</div>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, marginTop: 14, lineHeight: 1.25 }}>
            Your resting heart rate is trending 4 bpm lower than last week.
          </div>
        </div>

        <SectionHeader title="Why this matters"/>
        <div className="card" style={{ marginBottom: 14, lineHeight: 1.55, fontSize: 13, color: "var(--ink-2)" }}>
          A lower resting heart rate often reflects better cardiovascular fitness and recovery. For you, this likely correlates with:
          <ul style={{ margin: "10px 0 0 0", paddingLeft: 18, color: "var(--ink-2)" }}>
            <li>Consistent sleep (avg 7h 12m, up from 6h 50m)</li>
            <li>Completing your daily walk 5 of 7 days</li>
            <li>Stable medication timing</li>
          </ul>
        </div>

        <SectionHeader title="Supporting data"/>
        <div className="card" style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>Resting HR · 30 days</div>
            <span className="chip success">▼ trending</span>
          </div>
          <Sparkline data={[72,73,71,72,70,71,70,69,70,68,69,68,67,68]} color="var(--brand)"/>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <FullBtn variant="ghost">Dismiss</FullBtn>
          <FullBtn>Share with Dr. Nguyen</FullBtn>
        </div>

        <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: "var(--chip)", fontSize: 10, color: "var(--ink-3)", lineHeight: 1.5, textAlign: "center" }}>
          AI insights are educational and not medical advice.
        </div>
      </div>
    </Phone>
  );
}

// Quick action bottom sheet
function QuickActionSheetScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div className="screen-body" style={{ position: "relative" }}>
        {/* Dim home preview */}
        <div style={{
          position: "absolute", inset: 0,
          background: "color-mix(in srgb, #000 45%, transparent)",
        }}/>
        <div style={{ padding: "44px 20px 20px", opacity: 0.3 }}>
          <div style={{ height: 80, borderRadius: 20, background: "var(--card)" }}/>
          <div style={{ height: 100, borderRadius: 16, background: "var(--card)", marginTop: 12 }}/>
        </div>
        {/* Sheet */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "var(--bg-elev)",
          borderRadius: "24px 24px 0 0",
          padding: "10px 20px 28px",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
        }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: "var(--border-strong)", margin: "0 auto 14px",
          }}/>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Log something</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>What would you like to add?</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            {[
              { Ic: IconCamera, label: "Meal photo", sub: "Snap & identify" },
              { Ic: IconHeartPulse, label: "Vitals", sub: "BP, HR, glucose" },
              { Ic: IconPill, label: "Take medication", sub: "Log a dose" },
              { Ic: IconWater, label: "Water", sub: "+250 ml" },
              { Ic: IconMoon, label: "Sleep", sub: "Start / end" },
              { Ic: IconActivity, label: "Workout", sub: "Manual log" },
            ].map((a) => (
              <button key={a.label} className="card" style={{
                padding: 14, textAlign: "left", background: "var(--card)",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--brand-soft)", color: "var(--brand)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><a.Ic size={18}/></div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{a.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  TodayOverviewScreen, HealthScoreDetailScreen, VitalsDetailScreen,
  AiInsightDetailScreen, QuickActionSheetScreen, BackBar, StatBlock, ChangeRow,
});
