/* global React, Phone, TabBar, TopBar, Avatar, Ring, SectionHeader, BackBar,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft,
   IconStethoscope, IconClock, IconFilter, IconCalendar,
   IconPill, IconCheck, IconX, IconRefresh, IconAlert, IconDroplet,
   IconMore, IconSparkle, IconCamera, IconPaperclip,
   FullBtn, Field, TextInput, DetailRow */

/* ╔═══════════════════════════════════════════════════════════
   ║  D · MEDICATIONS CORE FLOWS
   ╚═══════════════════════════════════════════════════════════ */

// Medication detail
function MedicationDetailScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="" right={<>
        <button className="icon-btn"><IconRefresh size={16}/></button>
        <button className="icon-btn"><IconMore size={18}/></button>
      </>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "4px 0 18px" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(135deg, #E88B6E, #D97757)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}><IconPill size={30}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.1 }}>Lisinopril</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 3 }}>10 mg · Tablet</div>
            <span className="chip success" style={{ marginTop: 8 }}>● Active</span>
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Adherence · 30d</div>
              <div className="tabular" style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>94%</div>
            </div>
            <Ring value={0.94} size={58} stroke={6}>
              <span style={{ fontSize: 11 }}>28/30</span>
            </Ring>
          </div>
          <div style={{ display: "flex", gap: 3, height: 30, alignItems: "flex-end" }}>
            {[1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1].map((t, i) => (
              <div key={i} style={{
                flex: 1, height: t ? "100%" : "35%",
                background: t ? "var(--success, #059669)" : "var(--border-strong)",
                borderRadius: 1,
              }}/>
            ))}
          </div>
        </div>

        <SectionHeader title="Today's doses"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <DoseRow time="07:30" state="taken" label="Taken · 07:28"/>
          <DoseRow time="19:30" state="upcoming" label="In 7h 45m" last/>
        </div>

        <SectionHeader title="Details"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <DetailRow Ic={IconPill} label="Dose" val="10 mg · 1 tablet"/>
          <DetailRow Ic={IconClock} label="Schedule" val="Twice daily · 07:30, 19:30"/>
          <DetailRow Ic={IconStethoscope} label="Prescriber" val="Dr. Nguyen Lan"/>
          <DetailRow Ic={IconCalendar} label="Started" val="Mar 3, 2026"/>
          <DetailRow Ic={IconRefresh} label="Refills left" val="2 of 3" last/>
        </div>

        <div className="card" style={{
          background: "color-mix(in srgb, var(--warning, #D97706) 12%, var(--card))",
          border: "1px solid color-mix(in srgb, var(--warning, #D97706) 30%, transparent)",
          display: "flex", gap: 10, padding: 12, alignItems: "center", marginBottom: 14,
        }}>
          <div style={{ color: "var(--warning, #D97706)" }}><IconAlert size={18}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Running low · 6 days left</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>Request a refill to avoid gaps</div>
          </div>
          <button className="btn" style={{ height: 32, padding: "0 12px", fontSize: 12 }}>Refill</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FullBtn variant="ghost">Pause</FullBtn>
          <FullBtn>Mark taken</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

function DoseRow({ time, state, label, last }) {
  const taken = state === "taken";
  const missed = state === "missed";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14,
      borderBottom: last ? "none" : "1px solid var(--border)",
      opacity: taken ? 0.72 : 1,
    }}>
      <div className="tabular" style={{
        fontSize: 15, fontWeight: 700, width: 54,
        color: taken ? "var(--ink-3)" : "var(--ink)",
        textDecoration: taken ? "line-through" : "none",
      }}>{time}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{taken ? "Lisinopril 10 mg" : missed ? "Missed" : "Lisinopril 10 mg"}</div>
        <div style={{ fontSize: 11, color: taken ? "var(--success, #059669)" : missed ? "var(--danger, #E54D4D)" : "var(--ink-3)", marginTop: 2, fontWeight: 500 }}>{label}</div>
      </div>
      {taken && <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--success, #059669)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><IconCheck size={16} strokeWidth={3}/></div>}
      {missed && <button className="btn ghost" style={{ height: 32, fontSize: 11, padding: "0 10px", color: "var(--danger, #E54D4D)" }}>Log late</button>}
      {!taken && !missed && <button className="btn" style={{ height: 32, padding: "0 14px", fontSize: 12 }}>Take</button>}
    </div>
  );
}

// Take medication confirmation
function TakeMedConfirmScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div className="screen-body" style={{ position: "relative" }}>
        <div style={{ padding: "44px 20px 20px", opacity: 0.3 }}>
          <div style={{ height: 80, borderRadius: 20, background: "var(--card)" }}/>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, #000 30%, transparent)" }}/>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "var(--bg-elev)",
          borderRadius: "24px 24px 0 0",
          padding: "10px 20px 28px",
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-strong)", margin: "0 auto 18px" }}/>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "color-mix(in srgb, var(--success, #059669) 14%, transparent)",
              color: "var(--success, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto", boxShadow: "0 0 0 8px color-mix(in srgb, var(--success, #059669) 8%, transparent)",
            }}>
              <IconCheck size={44} strokeWidth={3}/>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 16, letterSpacing: -0.3 }}>Dose logged</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
              Lisinopril 10 mg · taken at 07:28
            </div>
          </div>

          <div className="card" style={{ marginTop: 20, padding: 12, textAlign: "center", background: "var(--chip)", border: "none" }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Streak</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>🔥 12 days on track</div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <FullBtn variant="ghost">Undo</FullBtn>
            <FullBtn>Done</FullBtn>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// Missed dose state
function MissedDoseScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Missed dose"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{
          background: "color-mix(in srgb, var(--danger, #E54D4D) 10%, var(--card))",
          border: "1px solid color-mix(in srgb, var(--danger, #E54D4D) 30%, transparent)",
          padding: 18, marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "var(--danger, #E54D4D)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><IconAlert size={22}/></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Missed · Lisinopril</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Scheduled for 19:30 yesterday</div>
            </div>
          </div>
        </div>

        <SectionHeader title="What do you want to do?"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <ActionCard Ic={IconCheck} color="var(--success, #059669)" title="I took it late" sub="Log actual time you took the dose"/>
          <ActionCard Ic={IconX} color="var(--danger, #E54D4D)" title="I skipped this dose" sub="Mark as skipped · counts toward adherence"/>
          <ActionCard Ic={IconClock} color="var(--brand)" title="Take it now" sub="Log it and shift today's schedule"/>
        </div>

        <div className="card" style={{ padding: 14, background: "var(--chip)", border: "none" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Guidance</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5, color: "var(--ink-2)" }}>
            Don't double up. If it's been more than 12 hours, skip and take the next scheduled dose. Contact your doctor if unsure.
          </div>
        </div>
      </div>
    </Phone>
  );
}

function ActionCard({ Ic, color, title, sub }) {
  return (
    <button className="card" style={{
      padding: 14, display: "flex", alignItems: "center", gap: 12,
      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 15%, transparent)`, color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><Ic size={18}/></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
      <IconChevronRight size={16} style={{ color: "var(--ink-3)" }}/>
    </button>
  );
}

// Add medication
function AddMedicationScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Add medication" right={<span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>Save</span>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <button className="card" style={{
            padding: "14px 10px", textAlign: "center", cursor: "pointer", fontFamily: "inherit",
            background: "var(--brand-soft)", borderColor: "var(--brand)",
          }}>
            <IconCamera size={20} style={{ color: "var(--brand)" }}/>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Scan barcode</div>
          </button>
          <button className="card" style={{
            padding: "14px 10px", textAlign: "center", cursor: "pointer", fontFamily: "inherit",
          }}>
            <IconSearch size={20} style={{ color: "var(--brand)" }}/>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Search database</div>
          </button>
        </div>

        <Field label="Medication name"><TextInput value="Metformin"/></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Strength"><TextInput value="500 mg"/></Field>
          <Field label="Form"><TextInput value="Tablet" trailing={<IconChevronRight size={14}/>}/></Field>
        </div>

        <Field label="How often">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[{l:"1×", on:true},{l:"2×"},{l:"3×"},{l:"PRN"}].map((t) => (
              <button key={t.l} style={{
                height: 44, borderRadius: 10,
                background: t.on ? "var(--brand-soft)" : "var(--card)",
                border: `1.5px solid ${t.on ? "var(--brand)" : "var(--border-strong)"}`,
                color: t.on ? "var(--brand)" : "var(--ink-2)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>{t.l}</button>
            ))}
          </div>
        </Field>

        <Field label="Time"><TextInput value="08:00" leading={<IconClock size={16}/>}/></Field>

        <Field label="Take with">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{l:"Food", on:true},{l:"Water"},{l:"Before meal"},{l:"After meal"}].map((t) => (
              <span key={t.l} style={{
                padding: "8px 12px", borderRadius: 100,
                background: t.on ? "var(--brand-soft)" : "var(--card)",
                border: `1px solid ${t.on ? "var(--brand)" : "var(--border-strong)"}`,
                color: t.on ? "var(--brand)" : "var(--ink-2)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>{t.l}</span>
            ))}
          </div>
        </Field>

        <Field label="Prescribed by (optional)"><TextInput placeholder="Doctor name"/></Field>

        <div className="card" style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: 14, marginBottom: 16, background: "var(--chip)", border: "none",
        }}>
          <IconBell size={18} style={{ color: "var(--brand)" }}/>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Remind me to take</div>
          <Toggle on/>
        </div>
      </div>
    </Phone>
  );
}

// Edit medication — same layout, pre-filled, with delete at bottom
function EditMedicationScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Edit medication" right={<span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>Save</span>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <Field label="Medication name"><TextInput value="Lisinopril"/></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Strength"><TextInput value="10 mg"/></Field>
          <Field label="Form"><TextInput value="Tablet" trailing={<IconChevronRight size={14}/>}/></Field>
        </div>
        <Field label="Schedule"><TextInput value="Twice daily · 07:30, 19:30" trailing={<IconChevronRight size={14}/>}/></Field>
        <Field label="Duration"><TextInput value="Ongoing" trailing={<IconChevronRight size={14}/>}/></Field>
        <Field label="Notes">
          <textarea defaultValue="Take with breakfast and dinner." style={{
            width: "100%", minHeight: 70, padding: 14,
            border: "1px solid var(--border-strong)", borderRadius: 12,
            background: "var(--card)", color: "var(--ink)",
            fontFamily: "inherit", fontSize: 13, outline: "none", resize: "none",
          }}/>
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          <button style={{
            height: 50, borderRadius: 14,
            background: "transparent", color: "var(--warning, #D97706)",
            border: "1px solid color-mix(in srgb, var(--warning, #D97706) 40%, transparent)",
            fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}>Pause medication</button>
          <button style={{
            height: 50, borderRadius: 14,
            background: "transparent", color: "var(--danger, #E54D4D)",
            border: "1px solid color-mix(in srgb, var(--danger, #E54D4D) 40%, transparent)",
            fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}>Archive medication</button>
        </div>
      </div>
    </Phone>
  );
}

// Import medication
function ImportMedicationScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Import medications"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5 }}>
          Pull medications from your prescriber or pharmacy. Review before confirming.
        </div>
        <SectionHeader title="Sources"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <SourceRow name="Dr. Nguyen Lan · e-prescription" sub="Connected · last sync 2h ago" on/>
          <SourceRow name="Sunrise Pharmacy" sub="Tap to connect"/>
          <SourceRow name="Apple Health / Health Connect" sub="Import history" last/>
        </div>

        <SectionHeader title="Pending review · 3"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ImportRow name="Metformin 500 mg" sub="Dr. Nguyen Lan · 2×/day" selected/>
          <ImportRow name="Atorvastatin 20 mg" sub="Dr. Nguyen Lan · 1×/day evening" selected/>
          <ImportRow name="Vitamin D3 1000 IU" sub="OTC · 1×/day"/>
        </div>

        <div style={{ marginTop: 20 }}>
          <FullBtn>Import 2 medications</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

function SourceRow({ name, sub, on, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--chip)", color: "var(--ink-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><IconStethoscope size={16}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 11, color: on ? "var(--success, #059669)" : "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
      {on ? <span className="chip success">Connected</span> : <IconChevronRight size={16} style={{ color: "var(--ink-3)" }}/>}
    </div>
  );
}

function ImportRow({ name, sub, selected }) {
  return (
    <div className="card" style={{
      padding: 12, display: "flex", alignItems: "center", gap: 12,
      borderColor: selected ? "var(--brand)" : "var(--border)",
      background: selected ? "var(--brand-soft)" : "var(--card)",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: selected ? "var(--brand)" : "transparent",
        border: selected ? "none" : "1.5px solid var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{selected && <IconCheck size={12} style={{ color: "#fff" }} strokeWidth={3}/>}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

// Refill log
function RefillLogScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Refills · Lisinopril"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{
          padding: 18, textAlign: "center",
          background: "color-mix(in srgb, var(--warning, #D97706) 10%, var(--card))",
          border: "1px solid color-mix(in srgb, var(--warning, #D97706) 30%, transparent)",
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, color: "var(--warning, #D97706)", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Running low</div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 6, marginTop: 6 }}>
            <span className="tabular" style={{ fontSize: 40, fontWeight: 800 }}>6</span>
            <span style={{ fontSize: 14, color: "var(--ink-3)" }}>tablets · 6 days</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <FullBtn><IconRefresh size={16}/> Request refill</FullBtn>
          </div>
        </div>

        <SectionHeader title="History"/>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <RefillRow date="Mar 20" qty="30 tablets" src="Sunrise Pharmacy" status="Filled"/>
          <RefillRow date="Feb 21" qty="30 tablets" src="Sunrise Pharmacy" status="Filled"/>
          <RefillRow date="Jan 18" qty="30 tablets" src="Sunrise Pharmacy" status="Filled"/>
          <RefillRow date="Dec 15" qty="30 tablets" src="Sunrise Pharmacy" status="Filled" last/>
        </div>

        <div style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 14 }}>
          Prescription expires Jun 10, 2026 · 2 refills left
        </div>
      </div>
    </Phone>
  );
}

function RefillRow({ date, qty, src, status, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--chip)", color: "var(--ink-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><IconRefresh size={15}/></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{date}</span>
          <span className="chip success" style={{ fontSize: 9 }}>{status}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{qty} · {src}</div>
      </div>
    </div>
  );
}

// Pause medication confirmation dialog
function PauseMedScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div className="screen-body" style={{ position: "relative" }}>
        <div style={{ padding: "44px 20px 20px", opacity: 0.3 }}>
          <div style={{ height: 80, borderRadius: 20, background: "var(--card)" }}/>
          <div style={{ height: 200, borderRadius: 16, background: "var(--card)", marginTop: 12 }}/>
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
            background: "color-mix(in srgb, var(--warning, #D97706) 14%, transparent)",
            color: "var(--warning, #D97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconClock size={24}/>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14, letterSpacing: -0.3 }}>Pause Lisinopril?</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
            Reminders stop and adherence tracking pauses. You'll still see it in your history.
          </div>

          <Field label="Pause for">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 4 }}>
              {[{l:"1 day"},{l:"3 days"},{l:"1 wk", on:true},{l:"Custom"}].map((t) => (
                <button key={t.l} style={{
                  height: 42, borderRadius: 10,
                  background: t.on ? "var(--brand-soft)" : "var(--card)",
                  border: `1.5px solid ${t.on ? "var(--brand)" : "var(--border-strong)"}`,
                  color: t.on ? "var(--brand)" : "var(--ink-2)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>{t.l}</button>
              ))}
            </div>
          </Field>
          <Field label="Reason (optional)">
            <TextInput placeholder="e.g. side effects, doctor's advice"/>
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <FullBtn variant="ghost">Cancel</FullBtn>
            <FullBtn style={{ background: "var(--warning, #D97706)" }}>Pause</FullBtn>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// Archive confirmation (destructive)
function ArchiveMedScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div className="screen-body" style={{ position: "relative" }}>
        <div style={{ padding: "44px 20px 20px", opacity: 0.3 }}>
          <div style={{ height: 200, borderRadius: 16, background: "var(--card)" }}/>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, #000 45%, transparent)" }}/>
        <div style={{
          position: "absolute", top: "35%", left: 20, right: 20,
          background: "var(--bg-elev)",
          borderRadius: 20,
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)",
            color: "var(--danger, #E54D4D)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto",
          }}><IconAlert size={22}/></div>
          <div style={{ fontSize: 18, fontWeight: 800, textAlign: "center", marginTop: 14, letterSpacing: -0.3 }}>Archive Lisinopril?</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
            This medication will be hidden from your active list and reminders will stop. Your history is preserved and you can restore anytime.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
            <FullBtn style={{ background: "var(--danger, #E54D4D)" }}>Archive medication</FullBtn>
            <FullBtn variant="ghost">Cancel</FullBtn>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// Medication history
function MedicationHistoryScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="History · Lisinopril" right={<button className="icon-btn"><IconFilter size={16}/></button>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Since start · 52 days</div>
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            <HistStat n="94%" l="Adherence" c="var(--success, #059669)"/>
            <HistStat n="98" l="Doses taken"/>
            <HistStat n="6" l="Missed" c="var(--danger, #E54D4D)"/>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: 0.4, margin: "6px 0 10px" }}>THIS WEEK</div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <HistRow date="Apr 24" dose="07:28" state="taken"/>
          <HistRow date="Apr 23" dose="19:31 · 07:30" state="taken"/>
          <HistRow date="Apr 22" dose="Missed evening" state="missed"/>
          <HistRow date="Apr 21" dose="19:28 · 07:14" state="taken" last/>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: 0.4, margin: "6px 0 10px" }}>LAST WEEK</div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <HistRow date="Apr 20" dose="19:45 · 07:40" state="taken"/>
          <HistRow date="Apr 19" dose="19:30 · 07:28" state="taken"/>
          <HistRow date="Apr 18" dose="20:12 · 08:15" state="late" last/>
        </div>
      </div>
    </Phone>
  );
}

function HistStat({ n, l, c }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 800, color: c || "var(--ink)" }}>{n}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{l}</div>
    </div>
  );
}

function HistRow({ date, dose, state, last }) {
  const stateStyle = {
    taken: { color: "var(--success, #059669)", bg: "color-mix(in srgb, var(--success, #059669) 15%, transparent)", label: "On time" },
    missed: { color: "var(--danger, #E54D4D)", bg: "color-mix(in srgb, var(--danger, #E54D4D) 15%, transparent)", label: "Missed" },
    late: { color: "var(--warning, #D97706)", bg: "color-mix(in srgb, var(--warning, #D97706) 15%, transparent)", label: "Late" },
  }[state];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 12,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ width: 50, fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{date}</div>
      <div style={{ flex: 1, fontSize: 12, color: "var(--ink-3)" }}>{dose}</div>
      <span style={{
        padding: "3px 8px", borderRadius: 100,
        background: stateStyle.bg, color: stateStyle.color,
        fontSize: 10, fontWeight: 700, letterSpacing: 0.2,
      }}>{stateStyle.label}</span>
    </div>
  );
}

// Simple toggle primitive used above
function Toggle({ on }) {
  return (
    <div style={{
      width: 42, height: 26, borderRadius: 13,
      background: on ? "var(--brand)" : "var(--border-strong)",
      position: "relative", transition: "background .2s",
      flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 22, height: 22, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left .2s",
      }}/>
    </div>
  );
}

Object.assign(window, {
  MedicationDetailScreen, TakeMedConfirmScreen, MissedDoseScreen,
  AddMedicationScreen, EditMedicationScreen, ImportMedicationScreen,
  RefillLogScreen, PauseMedScreen, ArchiveMedScreen, MedicationHistoryScreen,
  DoseRow, Toggle, ActionCard,
});
