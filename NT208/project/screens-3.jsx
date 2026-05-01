/* global React, Phone, TabBar, TopBar, Avatar, Ring, SectionHeader,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft, IconChevronDown,
   IconPill, IconCheck, IconX, IconRefresh, IconAlert, IconClock, IconDroplet,
   IconSun, IconMoon, IconCoffee, IconSparkle, IconMore,
   IconShield, IconSettings, IconLogOut, IconBadge, IconTarget, IconLock, IconGlobe,
   IconHeartPulse, IconUser, IconActivity, IconFire, IconFootprints */

/* ═══════════════════════════════════════════════════════════
   4) MEDICATIONS / REMINDERS
   ═══════════════════════════════════════════════════════════ */
function MedicationsScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar
        title="Medications"
        subtitle="3 active · 94% adherence"
        right={<>
          <button className="icon-btn"><IconRefresh size={18}/></button>
          <button className="icon-btn" style={{ background: "var(--brand)", color: "#fff", border: "none" }}>
            <IconPlus size={18}/>
          </button>
        </>}
      />

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* Adherence hero */}
        <div className="card" style={{
          padding: 16, marginBottom: 14,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <Ring value={0.94} size={72} stroke={7} color="var(--success, #059669)">
            <span style={{ fontSize: 14 }}>94%</span>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>30-day adherence</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              28<span style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500 }}>/30 days</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>On track — 2 doses missed this month</div>
          </div>
        </div>

        {/* Refill alert */}
        <div className="card" style={{
          marginBottom: 14, display: "flex", alignItems: "center", gap: 12,
          borderColor: "color-mix(in srgb, var(--warning, #D97706) 40%, var(--border))",
          background: "color-mix(in srgb, var(--warning, #D97706) 8%, var(--card))",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "color-mix(in srgb, var(--warning, #D97706) 18%, transparent)",
            color: "var(--warning, #D97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconAlert size={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Metformin runs out in 4 days</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>Pharmacy - District 1 · Tap to request refill</div>
          </div>
          <IconChevronRight size={16}/>
        </div>

        {/* Today's doses timeline */}
        <SectionHeader title="Today's doses" action="View all"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <DoseRow Ic={IconSun} time="8:00" name="Metformin" dose="500 mg · 1 tab" meal="With breakfast" state="taken" />
          <Sep/>
          <DoseRow Ic={IconCoffee} time="13:00" name="Lisinopril" dose="10 mg · 1 tab" meal="With lunch" state="taken" />
          <Sep/>
          <DoseRow Ic={IconSun} time="14:00" name="Vitamin D3" dose="1000 IU · 1 cap" meal="Any time" state="due" />
          <Sep/>
          <DoseRow Ic={IconMoon} time="20:00" name="Atorvastatin" dose="20 mg · 1 tab" meal="With dinner" state="pending" />
        </div>

        {/* Active meds list */}
        <SectionHeader title="Active medications"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <MedCard color="#1965B3" name="Metformin" dose="500 mg · 2×/day" since="Since Jan 12" adherence={0.96} refill="4 days"/>
          <MedCard color="#41BCE6" name="Lisinopril" dose="10 mg · 1×/day" since="Since Mar 3" adherence={0.93} refill="21 days"/>
          <MedCard color="#E3B79A" name="Atorvastatin" dose="20 mg · 1×/day evening" since="Since Feb 18" adherence={0.89} refill="12 days"/>
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: 14, padding: 10, borderRadius: 10,
          background: "var(--chip)",
          fontSize: 10, color: "var(--ink-3)", lineHeight: 1.4, textAlign: "center",
        }}>
          Educational reminders only — not medical advice. Follow your doctor's guidance.
        </div>
      </div>

      <TabBar active="meds" />
    </Phone>
  );
}

function Sep() {
  return <div style={{ height: 1, background: "var(--border)", marginLeft: 56 }}/>;
}

function DoseRow({ Ic, time, name, dose, meal, state }) {
  const isTaken = state === "taken";
  const isDue = state === "due";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px" }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: isTaken ? "color-mix(in srgb, var(--success, #059669) 16%, transparent)" :
                    isDue ? "color-mix(in srgb, var(--warning, #D97706) 18%, transparent)" :
                    "var(--brand-soft)",
        color: isTaken ? "var(--success, #059669)" :
               isDue ? "var(--warning, #D97706)" :
               "var(--brand)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Ic size={18}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{time}</span>
          {isDue && <span className="chip warning" style={{ fontSize: 10, padding: "2px 7px" }}>Due</span>}
          {isTaken && <span className="chip success" style={{ fontSize: 10, padding: "2px 7px" }}>Taken 8:02</span>}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
          {name} <span style={{ color: "var(--ink-3)", fontWeight: 500, fontSize: 12 }}>· {dose}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{meal}</div>
      </div>
      {isTaken ? (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "var(--success, #059669)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}>
          <IconCheck size={16}/>
        </div>
      ) : (
        <button style={{
          height: 34, padding: "0 12px", borderRadius: 17,
          background: isDue ? "var(--brand)" : "var(--chip)",
          color: isDue ? "#fff" : "var(--ink-2)",
          border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer",
          fontFamily: "inherit",
        }}>Take</button>
      )}
    </div>
  );
}

function MedCard({ color, name, dose, since, adherence, refill }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 20%, transparent)`,
        color, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <IconPill size={20}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{dose}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
          <div style={{ flex: 1, height: 4, background: "var(--chip)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${adherence * 100}%`, height: "100%", background: color, borderRadius: 2 }}/>
          </div>
          <span className="tabular" style={{ fontSize: 11, fontWeight: 700, color }}>{Math.round(adherence * 100)}%</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Refill</div>
        <div className="tabular" style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{refill}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   5) PROFILE / SETTINGS
   ═══════════════════════════════════════════════════════════ */
function ProfileScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar
        title="Me"
        right={<button className="icon-btn"><IconSettings size={18}/></button>}
      />

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* Identity card */}
        <div className="card" style={{ padding: 18, marginBottom: 14, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", position: "relative", marginBottom: 10 }}>
            <Avatar name="MN" size={84} />
            <div style={{
              position: "absolute", bottom: 0, right: "calc(50% - 48px)",
              width: 26, height: 26, borderRadius: "50%",
              background: "var(--success, #059669)", color: "#fff",
              border: "3px solid var(--card)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
            }}>
              <IconCheck size={12}/>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>Minh Nguyen</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>32 · Male · Ho Chi Minh City</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
            <span className="chip brand"><IconShield size={11}/> Verified</span>
            <span className="chip"><IconBadge size={11}/> Level 4</span>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <StatCell val="28" label="Day streak" Ic={IconFire} color="#E3B79A"/>
          <StatCell val="12" label="Badges" Ic={IconBadge} color="#E7DEA7"/>
          <StatCell val="4" label="Goals active" Ic={IconTarget} color="var(--brand)"/>
        </div>

        {/* Emergency card — feature feature feature */}
        <div className="card" style={{
          marginBottom: 14, padding: 0, overflow: "hidden",
          background: "linear-gradient(135deg, #E54D4D 0%, #B83838 100%)",
          border: "none", color: "#fff",
        }}>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconHeartPulse size={20}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Emergency card</div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>Share vitals & allergies instantly</div>
            </div>
            <IconChevronRight size={16}/>
          </div>
        </div>

        {/* Menu groups */}
        <MenuGroup title="Health">
          <MenuRow Ic={IconUser} label="Personal details" val="Complete"/>
          <MenuRow Ic={IconHeartPulse} label="Medical history" val="3 conditions"/>
          <MenuRow Ic={IconActivity} label="Connected devices" val="Fitbit · Withings"/>
          <MenuRow Ic={IconTarget} label="Health goals" val="4 active" last/>
        </MenuGroup>

        <MenuGroup title="Privacy & security">
          <MenuRow Ic={IconShield} label="Data sharing" val="Doctor only"/>
          <MenuRow Ic={IconLock} label="App lock" toggle={true}/>
          <MenuRow Ic={IconBell} label="Notifications" val="All reminders" last/>
        </MenuGroup>

        <MenuGroup title="Preferences">
          <MenuRow Ic={IconGlobe} label="Language" val="English"/>
          <MenuRow Ic={IconSparkle} label="Appearance" val="System"/>
          <MenuRow Ic={IconLogOut} label="Sign out" danger last/>
        </MenuGroup>

        <div style={{ textAlign: "center", fontSize: 10, color: "var(--ink-4)", marginTop: 16 }}>
          NT208 HealthOS · v2.4.0
        </div>
      </div>

      <TabBar active="me" />
    </Phone>
  );
}

function StatCell({ val, label, Ic, color }) {
  return (
    <div className="card card-tight" style={{ textAlign: "center", padding: "12px 6px" }}>
      <div style={{
        width: 28, height: 28, margin: "0 auto", borderRadius: 8,
        background: `color-mix(in srgb, ${color} 20%, transparent)`,
        color, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Ic size={14}/>
      </div>
      <div className="tabular" style={{ fontSize: 18, fontWeight: 700, marginTop: 5 }}>{val}</div>
      <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function MenuGroup({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--ink-3)",
        textTransform: "uppercase", letterSpacing: 0.5,
        margin: "0 2px 8px",
      }}>{title}</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function MenuRow({ Ic, label, val, toggle, last, danger }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: danger ? "color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)" : "var(--chip)",
          color: danger ? "var(--danger, #E54D4D)" : "var(--ink-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Ic size={15}/>
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: danger ? "var(--danger, #E54D4D)" : "var(--ink)" }}>{label}</div>
        {toggle !== undefined ? (
          <div style={{
            width: 38, height: 22, borderRadius: 11,
            background: toggle ? "var(--brand)" : "var(--border-strong)",
            position: "relative", transition: "background .2s",
          }}>
            <div style={{
              position: "absolute", top: 2, left: toggle ? 18 : 2,
              width: 18, height: 18, borderRadius: "50%",
              background: "#fff", transition: "left .2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}/>
          </div>
        ) : val ? (
          <>
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>{val}</span>
            <IconChevronRight size={14} style={{ color: "var(--ink-4)" }}/>
          </>
        ) : !danger ? <IconChevronRight size={14} style={{ color: "var(--ink-4)" }}/> : null}
      </div>
      {!last && <div style={{ height: 1, background: "var(--border)", marginLeft: 56 }}/>}
    </>
  );
}

Object.assign(window, { MedicationsScreen, ProfileScreen });
