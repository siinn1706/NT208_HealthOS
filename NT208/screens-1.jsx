/* global React, Phone, TabBar, TopBar, Ring, Sparkline, Avatar,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft,
   IconHeart, IconActivity, IconFootprints, IconMoon, IconWater, IconFire, IconSparkle,
   IconSun, IconCoffee, IconStethoscope, IconMapPin, IconVideo, IconClock, IconFilter,
   IconRobot, IconSend, IconMic, IconCamera, IconPaperclip,
   IconDroplet, IconCheck, IconX, IconRefresh, IconAlert,
   IconShield, IconSettings, IconLogOut, IconBadge, IconTarget, IconLock, IconGlobe,
   IconHeartPulse, IconMore, IconCalendar, IconChat, IconPill, IconUser */

/* ═══════════════════════════════════════════════════════════
   1) HOME / DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function HomeScreen({ theme = "theme-calm", name = "Minh" }) {
  const greetHour = 9;
  const greeting = greetHour < 12 ? "Good morning" : greetHour < 18 ? "Good afternoon" : "Good evening";
  return (
    <Phone theme={theme}>
      <TopBar
        left={<Avatar name="M" size={40} />}
        title={greeting}
        subtitle={`${name} · Tue, Apr 24`}
        right={<>
          <button className="icon-btn"><IconSearch size={18}/></button>
          <button className="icon-btn"><IconBell size={18}/><span className="dot"/></button>
        </>}
      />

      <div className="screen-body" style={{ padding: "4px 20px 20px" }}>

        {/* Hero "Today" ring */}
        <div className="card" style={{
          padding: 18,
          background: "linear-gradient(140deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 72%, var(--accent)) 100%)",
          color: "#fff", border: "none", marginBottom: 16,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", right: -40, top: -40, width: 160, height: 160,
            borderRadius: "50%", background: "rgba(255,255,255,0.08)",
          }}/>
          <div style={{
            position: "absolute", right: 20, top: 50, width: 80, height: 80,
            borderRadius: "50%", background: "rgba(255,255,255,0.06)",
          }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>Today's health</div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, marginTop: 4 }} className="tabular">82<span style={{ fontSize: 18, opacity: 0.7 }}>/100</span></div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Looking good. 2 goals to close.</div>
            </div>
            <Ring value={0.82} size={74} stroke={7} color="#fff" track="rgba(255,255,255,0.2)">
              <span style={{ color: "#fff", fontSize: 16 }}>82</span>
            </Ring>
          </div>
        </div>

        {/* KPI rings row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Steps", val: "7.2k", tgt: "10k", v: 0.72, Ic: IconFootprints, col: "var(--brand)" },
            { label: "Water", val: "1.6L", tgt: "2.5L", v: 0.64, Ic: IconWater, col: "#41BCE6" },
            { label: "Kcal", val: "1420", tgt: "2100", v: 0.67, Ic: IconFire, col: "#E3B79A" },
            { label: "Sleep", val: "7h 12m", tgt: "8h", v: 0.9, Ic: IconMoon, col: "#5B90C4" },
          ].map((k) => (
            <div key={k.label} className="card-tight card" style={{ textAlign: "center", padding: "10px 6px" }}>
              <Ring value={k.v} size={44} stroke={4} color={k.col}>
                <k.Ic size={14}/>
              </Ring>
              <div className="tabular" style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{k.val}</div>
              <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Next up — today's reminders */}
        <SectionHeader title="Next up" action="See all"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <NextUpRow time="9:00" title="Metformin 500 mg" meta="With breakfast · 1 tab" Ic={IconPill} badge="Due now" badgeVariant="warning"/>
          <div style={{ height: 1, background: "var(--border)", marginLeft: 56 }}/>
          <NextUpRow time="11:30" title="Dr. Nguyen — cardiology" meta="Video · 30 min" Ic={IconVideo} badge="Upcoming"/>
          <div style={{ height: 1, background: "var(--border)", marginLeft: 56 }}/>
          <NextUpRow time="15:00" title="Evening walk" meta="30 min · outdoor" Ic={IconFootprints} badge=""/>
        </div>

        {/* AI insight */}
        <div className="card" style={{
          marginBottom: 16,
          background: "color-mix(in srgb, var(--brand-soft) 60%, var(--card))",
          borderColor: "var(--border-strong)",
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "var(--brand)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconSparkle size={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", letterSpacing: 0.4, textTransform: "uppercase" }}>AI insight</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, lineHeight: 1.35 }}>Your resting heart rate is 4 bpm lower this week.</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.4 }}>That's a positive trend — likely linked to your consistent sleep. Keep it up.</div>
            </div>
          </div>
        </div>

        {/* Vitals mini */}
        <SectionHeader title="Vitals" action="Report"/>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Heart rate · 7 days</div>
              <div className="tabular" style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>
                68 <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>bpm avg</span>
              </div>
            </div>
            <span className="chip success">▼ 4 bpm</span>
          </div>
          <Sparkline data={[72, 70, 74, 71, 68, 67, 68]} color="var(--brand)"/>
        </div>

        {/* Quick actions */}
        <SectionHeader title="Quick actions"/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { Ic: IconCamera, label: "Log meal" },
            { Ic: IconHeartPulse, label: "Log vitals" },
            { Ic: IconRobot, label: "Ask AI" },
            { Ic: IconShield, label: "SOS card" },
          ].map((a) => (
            <button key={a.label} className="card-tight card" style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 6, padding: "14px 4px", cursor: "pointer",
              background: "var(--card)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--brand-soft)", color: "var(--brand)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <a.Ic size={18}/>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "2px 2px 10px" }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{title}</h3>
      {action && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)" }}>{action}</span>}
    </div>
  );
}

function NextUpRow({ time, title, meta, Ic, badge, badgeVariant = "brand" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: "var(--brand-soft)", color: "var(--brand)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Ic size={18}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{time}</span>
          {badge && <span className={`chip ${badgeVariant}`} style={{ fontSize: 10, padding: "2px 7px" }}>{badge}</span>}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{meta}</div>
      </div>
      <IconChevronRight size={16}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   2) APPOINTMENTS
   ═══════════════════════════════════════════════════════════ */
function AppointmentsScreen({ theme = "theme-calm" }) {
  const [tab, setTab] = React.useState("upcoming");
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const dates = [20, 21, 22, 23, 24, 25, 26];
  const todayIdx = 4;

  return (
    <Phone theme={theme}>
      <TopBar
        title="Appointments"
        subtitle="2 upcoming · 3 past"
        right={<>
          <button className="icon-btn"><IconFilter size={18}/></button>
          <button className="icon-btn" style={{ background: "var(--brand)", color: "#fff", border: "none" }}><IconPlus size={18}/></button>
        </>}
      />

      <div className="screen-body" style={{ padding: "0 0 20px" }}>
        {/* Week strip */}
        <div style={{ padding: "4px 20px 12px" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6,
          }}>
            {days.map((d, i) => {
              const hasEvent = [1, 4, 6].includes(i);
              const isToday = i === todayIdx;
              return (
                <div key={i} style={{
                  textAlign: "center", padding: "10px 0", borderRadius: 12,
                  background: isToday ? "var(--brand)" : "transparent",
                  color: isToday ? "#fff" : "var(--ink)",
                  border: isToday ? "none" : "1px solid var(--border)",
                  position: "relative", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, opacity: isToday ? 0.9 : 0.7, letterSpacing: 0.3 }}>{d}</div>
                  <div className="tabular" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{dates[i]}</div>
                  {hasEvent && (
                    <span style={{
                      position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)",
                      width: 4, height: 4, borderRadius: "50%",
                      background: isToday ? "#fff" : "var(--brand)",
                    }}/>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Segmented */}
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4,
            padding: 4, background: "var(--chip)", borderRadius: 12,
          }}>
            {["upcoming", "past", "all"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px", borderRadius: 9,
                background: tab === t ? "var(--card)" : "transparent",
                color: tab === t ? "var(--ink)" : "var(--ink-3)",
                fontWeight: 600, fontSize: 12, letterSpacing: 0.1,
                border: "none", cursor: "pointer", textTransform: "capitalize",
                boxShadow: tab === t ? "0 1px 3px rgba(15,39,67,0.08)" : "none",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Today's appointment card — hero */}
        <div style={{ padding: "4px 20px 0" }}>
          <div className="card" style={{
            background: "linear-gradient(140deg, var(--primary-deep) 0%, var(--brand) 100%)",
            border: "none", color: "#fff", padding: 18, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", right: -20, bottom: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }}/>
            <div className="chip" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", marginBottom: 10 }}>
              <IconClock size={11}/> In 2h 14m
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>Dr. Nguyen Thi Lan</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Cardiology · Follow-up</div>
            <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 12, opacity: 0.95 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconClock size={13}/> 11:30 AM</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconVideo size={13}/> Video call</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn" style={{ flex: 1, background: "#fff", color: "var(--primary-deep)", height: 40 }}>
                <IconVideo size={16}/> Join
              </button>
              <button className="btn ghost" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", height: 40, width: 40, padding: 0 }}>
                <IconMore size={16}/>
              </button>
            </div>
          </div>
        </div>

        {/* Other upcoming */}
        <div style={{ padding: "16px 20px 0" }}>
          <SectionHeader title="This week"/>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AptRow dow="FRI" dd="26" title="Dr. Tran Van Minh" sub="General practice · Checkup" time="09:00" type="In-person" Ic={IconMapPin}/>
            <AptRow dow="MON" dd="29" title="Lab tests" sub="Fasting blood panel" time="07:30" type="Sunrise Clinic" Ic={IconStethoscope}/>
          </div>
        </div>

        {/* Prep visit */}
        <div style={{ padding: "16px 20px 0" }}>
          <div className="card" style={{
            display: "flex", alignItems: "center", gap: 12,
            borderStyle: "dashed", background: "transparent",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--brand-soft)", color: "var(--brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconSparkle size={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Prep for your visit</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>AI-generated questions for Dr. Nguyen</div>
            </div>
            <IconChevronRight size={16}/>
          </div>
        </div>
      </div>

      <TabBar active="care" />
    </Phone>
  );
}

function AptRow({ dow, dd, title, sub, time, type, Ic }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
      <div style={{
        width: 48, height: 56, borderRadius: 12,
        background: "var(--brand-soft)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--brand)", letterSpacing: 0.6 }}>{dow}</div>
        <div className="tabular" style={{ fontSize: 20, fontWeight: 700, color: "var(--brand)", lineHeight: 1 }}>{dd}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: "var(--ink-2)" }}>
          <span className="tabular" style={{ fontWeight: 600 }}>{time}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Ic size={11}/> {type}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, AppointmentsScreen, SectionHeader });
