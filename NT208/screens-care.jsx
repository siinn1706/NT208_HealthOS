/* global React, Phone, TabBar, TopBar, Avatar, Ring, SectionHeader, BackBar,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft,
   IconStethoscope, IconMapPin, IconVideo, IconClock, IconFilter, IconCalendar,
   IconPill, IconCheck, IconX, IconAlert, IconPaperclip, IconMore, IconSparkle,
   IconUser, IconHeartPulse, IconActivity, IconCamera, IconShield,
   FullBtn, Field, TextInput */

/* ╔═══════════════════════════════════════════════════════════
   ║  C · CARE (Appointments + Visit Prep + Rx + History)
   ╚═══════════════════════════════════════════════════════════ */

// Refined appointments list (clearer status pills)
function AppointmentsRefinedScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar
        title="Care"
        subtitle="Appointments · Prep · History"
        right={<>
          <button className="icon-btn"><IconFilter size={18}/></button>
          <button className="icon-btn" style={{ background: "var(--brand)", color: "#fff", border: "none" }}><IconPlus size={18}/></button>
        </>}
      />
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4,
          padding: 4, background: "var(--chip)", borderRadius: 12, marginBottom: 14,
        }}>
          {[["Up", true], ["In prog"], ["Past"], ["All"]].map(([t, on], i) => (
            <button key={i} style={{
              padding: "8px 0", borderRadius: 9, border: "none",
              background: on ? "var(--card)" : "transparent",
              color: on ? "var(--ink)" : "var(--ink-3)",
              fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              boxShadow: on ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            }}>{t}</button>
          ))}
        </div>

        <ApptCard status="In progress" statusColor="var(--success, #059669)" name="Dr. Nguyen Lan" meta="Cardiology · Video" time="Today · 11:30" inProgress/>
        <ApptCard status="Upcoming" statusColor="var(--brand)" name="Dr. Tran Van Minh" meta="General practice · In-person" time="Fri · 09:00"/>
        <ApptCard status="Upcoming" statusColor="var(--brand)" name="Lab tests" meta="Sunrise Clinic · Fasting" time="Mon · 07:30"/>
        <ApptCard status="Completed" statusColor="var(--ink-3)" name="Dr. Nguyen Lan" meta="Cardiology · Follow-up" time="Apr 10 · 11:00" muted/>
        <ApptCard status="Cancelled" statusColor="var(--danger, #E54D4D)" name="Dermatology consult" meta="Rescheduled" time="Apr 5" muted/>
      </div>
      <TabBar active="care"/>
    </Phone>
  );
}

function ApptCard({ status, statusColor, name, meta, time, inProgress, muted }) {
  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, opacity: muted ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{
          padding: "3px 8px", borderRadius: 100,
          background: `color-mix(in srgb, ${statusColor} 14%, transparent)`,
          color: statusColor, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          {inProgress && <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, animation: "pulse 2s infinite" }}/>}
          {status}
        </span>
        <span className="tabular" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{time}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "var(--brand-soft)", color: "var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}><IconStethoscope size={18}/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{meta}</div>
        </div>
        {inProgress && <button className="btn" style={{ height: 34, padding: "0 14px", fontSize: 12 }}><IconVideo size={14}/> Join</button>}
      </div>
    </div>
  );
}

// Appointment detail
function AppointmentDetailScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Appointment" right={<button className="icon-btn"><IconMore size={18}/></button>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{
          background: "linear-gradient(140deg, var(--primary-deep, var(--ink)) 0%, var(--brand) 100%)",
          border: "none", color: "#fff", padding: 18, marginBottom: 14,
        }}>
          <span className="chip" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", marginBottom: 10 }}>
            <IconClock size={11}/> In 2h 14m
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Dr. Nguyen Thi Lan</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Cardiology · Follow-up</div>
          <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconCalendar size={13}/> Tue Apr 24</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconClock size={13}/> 11:30 · 30 min</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <FullBtn style={{ background: "#fff", color: "var(--brand)" }}><IconVideo size={16}/> Join video call</FullBtn>
          </div>
        </div>

        <SectionHeader title="Details"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <DetailRow Ic={IconVideo} label="Type" val="Video consultation"/>
          <DetailRow Ic={IconMapPin} label="Location" val="Remote · Link opens in app"/>
          <DetailRow Ic={IconUser} label="Patient" val="Minh Nguyen" last/>
        </div>

        <SectionHeader title="Reason for visit"/>
        <div className="card" style={{ marginBottom: 14, padding: 14, lineHeight: 1.5, fontSize: 13, color: "var(--ink-2)" }}>
          Follow-up on medication adjustment. Recent BP readings have been stable; discussing whether to continue current dose of Lisinopril.
        </div>

        <SectionHeader title="Attachments" action="Add"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <AttachRow name="Lab_results_Apr10.pdf" size="482 KB" Ic={IconPaperclip}/>
          <AttachRow name="BP_log_2weeks.csv" size="12 KB" Ic={IconActivity} last/>
        </div>

        <div className="card" style={{
          background: "var(--brand-soft)", border: "none",
          display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        }}>
          <div style={{ color: "var(--brand)" }}><IconSparkle size={20}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Prep for this visit</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>3 AI-suggested questions</div>
          </div>
          <IconChevronRight size={16} style={{ color: "var(--brand)" }}/>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <FullBtn variant="ghost">Reschedule</FullBtn>
          <FullBtn variant="ghost" style={{ color: "var(--danger, #E54D4D)", borderColor: "color-mix(in srgb, var(--danger, #E54D4D) 30%, transparent)" }}>Cancel</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

function DetailRow({ Ic, label, val, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ width: 28, color: "var(--ink-3)" }}><Ic size={16}/></div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, width: 80 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{val}</div>
    </div>
  );
}

function AttachRow({ name, size, Ic, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: 12,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "var(--chip)", color: "var(--ink-2)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}><Ic size={15}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{size}</div>
      </div>
      <IconChevronRight size={14} style={{ color: "var(--ink-4)" }}/>
    </div>
  );
}

// Create appointment (bottom sheet as a full-screen)
function CreateAppointmentScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="New appointment" right={<span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>Save</span>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <Field label="Doctor / Provider"><TextInput value="Dr. Nguyen Lan" leading={<IconStethoscope size={16}/>}/></Field>
        <Field label="Specialty"><TextInput value="Cardiology" trailing={<IconChevronRight size={14}/>}/></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Date"><TextInput value="Apr 24" leading={<IconCalendar size={16}/>}/></Field>
          <Field label="Time"><TextInput value="11:30" leading={<IconClock size={16}/>}/></Field>
        </div>
        <Field label="Type">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{l: "Video", Ic: IconVideo, on: true}, {l: "In-person", Ic: IconMapPin}].map((t) => (
              <button key={t.l} style={{
                height: 48, borderRadius: 12,
                background: t.on ? "var(--brand-soft)" : "var(--card)",
                border: `1.5px solid ${t.on ? "var(--brand)" : "var(--border-strong)"}`,
                color: t.on ? "var(--brand)" : "var(--ink-2)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}><t.Ic size={14}/> {t.l}</button>
            ))}
          </div>
        </Field>
        <Field label="Reason for visit (optional)">
          <textarea placeholder="e.g. Follow-up on BP medication…" style={{
            width: "100%", minHeight: 80, padding: 14,
            border: "1px solid var(--border-strong)", borderRadius: 12,
            background: "var(--card)", color: "var(--ink)",
            fontFamily: "inherit", fontSize: 14, outline: "none", resize: "none",
          }}/>
        </Field>
        <Field label="Reminder"><TextInput value="1 hour before" trailing={<IconChevronRight size={14}/>}/></Field>

        <div style={{ marginTop: 8 }}>
          <FullBtn>Create appointment</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

// Join video visit (live state)
function JoinVideoVisitScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme="theme-night">
      <div className="screen-body" style={{ position: "relative", padding: 0, background: "#0A0D13" }}>
        {/* Doctor video */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 35% 30%, #2a3a52, #0A0D13)",
        }}>
          <div style={{
            position: "absolute", top: "38%", left: "50%", transform: "translate(-50%, -50%)",
            width: 120, height: 120, borderRadius: "50%",
            background: "linear-gradient(135deg, #5BA8C8, #1965B3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 44, fontWeight: 700,
            boxShadow: "0 0 60px rgba(91,168,200,0.5)",
          }}>L</div>
          <div style={{ position: "absolute", top: "calc(38% + 80px)", left: 0, right: 0, textAlign: "center", color: "#EAEEF2" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Dr. Nguyen Lan</div>
            <div style={{ fontSize: 12, color: "#8296AC", marginTop: 4 }}>Cardiology · Connected</div>
          </div>
        </div>

        {/* Self preview */}
        <div style={{
          position: "absolute", top: 60, right: 16,
          width: 96, height: 128, borderRadius: 16,
          background: "linear-gradient(135deg, #1a2130, #0B0F14)",
          border: "1.5px solid rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.6)", fontSize: 28, fontWeight: 700,
        }}>M</div>

        {/* Top chip */}
        <div style={{ position: "absolute", top: 56, left: 16, display: "flex", gap: 8 }}>
          <span className="chip" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", backdropFilter: "blur(10px)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }}/> LIVE · 04:12
          </span>
        </div>

        {/* Bottom controls */}
        <div style={{
          position: "absolute", bottom: 40, left: 0, right: 0,
          padding: "16px 20px",
          display: "flex", justifyContent: "center", gap: 14,
        }}>
          {[
            { Ic: IconCamera },
            { Ic: IconActivity, label: "mic" },
            { Ic: IconX, end: true },
            { Ic: IconVideo, label: "chat" },
            { Ic: IconMore },
          ].map((b, i) => (
            <button key={i} style={{
              width: 56, height: 56, borderRadius: "50%",
              background: b.end ? "#E54D4D" : "rgba(255,255,255,0.14)",
              border: "none", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}><b.Ic size={22}/></button>
          ))}
        </div>
      </div>
    </Phone>
  );
}

// Visit prep checklist
function VisitPrepScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Visit prep"/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{
          background: "linear-gradient(135deg, var(--brand-soft) 0%, color-mix(in srgb, var(--accent) 20%, var(--card)) 100%)",
          border: "none", padding: 16, marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>For Friday's visit</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, letterSpacing: -0.3 }}>Dr. Tran Van Minh</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>General practice · 4 of 7 complete</div>
          <div style={{ height: 5, background: "var(--card)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: "57%", height: "100%", background: "var(--brand)", borderRadius: 3 }}/>
          </div>
        </div>

        <SectionHeader title="Questions to ask" action="AI suggest"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <ChecklistRow text="Is my current BP medication still right for me?" done/>
          <ChecklistRow text="Should I be concerned about my slightly elevated cholesterol?" done/>
          <ChecklistRow text="How should I handle the occasional dizziness?"/>
          <ChecklistRow text="Can I stop taking Atorvastatin in 3 months?" last/>
        </div>

        <SectionHeader title="Bring with you"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <ChecklistRow text="BP log (last 2 weeks)" done/>
          <ChecklistRow text="Symptom diary"/>
          <ChecklistRow text="Insurance card" last/>
        </div>

        <FullBtn>Export prep summary</FullBtn>
      </div>
    </Phone>
  );
}

function ChecklistRow({ text, done, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
        background: done ? "var(--brand)" : "transparent",
        border: done ? "none" : "1.5px solid var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{done && <IconCheck size={12} style={{ color: "#fff" }} strokeWidth={3}/>}</div>
      <div style={{
        flex: 1, fontSize: 13, lineHeight: 1.4,
        color: done ? "var(--ink-3)" : "var(--ink)",
        textDecoration: done ? "line-through" : "none",
      }}>{text}</div>
    </div>
  );
}

// Prescription detail
function PrescriptionDetailScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Prescription" right={<button className="icon-btn"><IconMore size={18}/></button>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{ padding: 18, marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Prescription · RX-24091</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, letterSpacing: -0.3 }}>Lisinopril 10 mg</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>Issued Apr 10, 2026 · by Dr. Nguyen Lan</div>
          <div style={{
            margin: "18px auto 0", width: 120, height: 120, borderRadius: 12,
            background: "repeating-linear-gradient(0deg, #000 0 3px, #fff 3px 6px), repeating-linear-gradient(90deg, #000 0 2px, #fff 2px 5px)",
            backgroundBlendMode: "multiply",
            border: "1px solid var(--border)",
          }}/>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 10 }}>Scan at pharmacy</div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <DetailRow Ic={IconPill} label="Dose" val="10 mg · 1 tablet"/>
          <DetailRow Ic={IconClock} label="Frequency" val="Once daily · morning"/>
          <DetailRow Ic={IconCalendar} label="Duration" val="90 days"/>
          <DetailRow Ic={IconAlert} label="Refills" val="2 remaining" last/>
        </div>

        <div className="card" style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Instructions</div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55, color: "var(--ink-2)" }}>
            Take one tablet by mouth in the morning. Take with or without food. Avoid potassium-rich salt substitutes.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <FullBtn variant="ghost">Share</FullBtn>
          <FullBtn>Request refill</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

// Medical history timeline
function MedicalHistoryScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Medical history" right={<button className="icon-btn"><IconFilter size={16}/></button>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <MiniStat n="3" l="Conditions"/>
          <MiniStat n="12" l="Visits"/>
          <MiniStat n="7" l="Reports"/>
        </div>

        <SectionHeader title="Timeline"/>
        <div style={{ position: "relative", paddingLeft: 22 }}>
          <div style={{ position: "absolute", left: 7, top: 12, bottom: 12, width: 2, background: "var(--border)" }}/>
          <TimelineItem y="2026" d="Apr 10" title="Follow-up — Cardiology" sub="Dr. Nguyen Lan" tag="Visit" color="var(--brand)"/>
          <TimelineItem d="Mar 18" title="Blood panel" sub="Sunrise Clinic · Fasting" tag="Lab" color="var(--accent)"/>
          <TimelineItem d="Mar 3" title="Lisinopril prescribed" sub="10 mg · 1×/day" tag="Rx" color="#E3B79A"/>
          <TimelineItem y="2025" d="Dec 12" title="Hypertension diagnosed" sub="Stage 1 · monitoring" tag="Dx" color="var(--warning, #D97706)"/>
          <TimelineItem d="Oct 2" title="Annual physical" sub="Dr. Tran Van Minh" tag="Visit" color="var(--brand)"/>
        </div>
      </div>
    </Phone>
  );
}

function MiniStat({ n, l }) {
  return (
    <div className="card card-tight" style={{ textAlign: "center", padding: "10px 6px" }}>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 800 }}>{n}</div>
      <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{l}</div>
    </div>
  );
}

function TimelineItem({ y, d, title, sub, tag, color }) {
  return (
    <>
      {y && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: 0.4, margin: "6px 0 10px -22px", paddingLeft: 22 }}>{y}</div>}
      <div style={{ position: "relative", paddingBottom: 14 }}>
        <div style={{
          position: "absolute", left: -22, top: 4,
          width: 16, height: 16, borderRadius: "50%",
          background: color, border: "3px solid var(--bg)",
        }}/>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)" }}>{d}</span>
            <span style={{
              padding: "2px 7px", borderRadius: 100,
              background: `color-mix(in srgb, ${color} 16%, transparent)`,
              color, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
            }}>{tag}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
        </div>
      </div>
    </>
  );
}

// Attachment viewer / upload state
function AttachmentUploadScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Attachments" right={<button className="icon-btn" style={{ background: "var(--brand)", color: "#fff", border: "none" }}><IconPlus size={16}/></button>}/>
      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          {/* uploading */}
          <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "var(--brand-soft)", color: "var(--brand)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><IconCamera size={15}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>ECG_scan_Apr24.png</div>
                <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 1 }}>Uploading · 2.3 MB</div>
              </div>
              <IconX size={16} style={{ color: "var(--ink-3)" }}/>
            </div>
            <div style={{ height: 4, background: "var(--chip)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: "64%", height: "100%", background: "var(--brand)", borderRadius: 2 }}/>
            </div>
          </div>
          <AttachRow name="Lab_results_Apr10.pdf" size="482 KB · Uploaded" Ic={IconPaperclip}/>
          <AttachRow name="BP_log_2weeks.csv" size="12 KB · Uploaded" Ic={IconActivity} last/>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="card" style={{
            padding: 18, textAlign: "center", cursor: "pointer", fontFamily: "inherit",
            borderStyle: "dashed",
          }}>
            <IconCamera size={22} style={{ color: "var(--brand)" }}/>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>Scan document</div>
          </button>
          <button className="card" style={{
            padding: 18, textAlign: "center", cursor: "pointer", fontFamily: "inherit",
            borderStyle: "dashed",
          }}>
            <IconPaperclip size={22} style={{ color: "var(--brand)" }}/>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>Choose file</div>
          </button>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  AppointmentsRefinedScreen, AppointmentDetailScreen, CreateAppointmentScreen,
  JoinVideoVisitScreen, VisitPrepScreen, PrescriptionDetailScreen,
  MedicalHistoryScreen, AttachmentUploadScreen, DetailRow, AttachRow, ChecklistRow,
});
