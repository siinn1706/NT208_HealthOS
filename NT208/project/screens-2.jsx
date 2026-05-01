/* global React, Phone, TabBar, TopBar, Avatar, SectionHeader,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft,
   IconRobot, IconSend, IconMic, IconCamera, IconPaperclip,
   IconSparkle, IconMore */

/* ═══════════════════════════════════════════════════════════
   3) CHAT — list + AI conversation
   ═══════════════════════════════════════════════════════════ */
function ChatScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar
        title="Chat"
        subtitle="Care team & AI assistant"
        right={<>
          <button className="icon-btn"><IconSearch size={18}/></button>
          <button className="icon-btn"><IconPlus size={18}/></button>
        </>}
      />

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* AI assistant hero */}
        <div className="card" style={{
          padding: 14, marginBottom: 14,
          background: "linear-gradient(135deg, var(--brand-soft) 0%, color-mix(in srgb, var(--accent) 24%, var(--card)) 100%)",
          borderColor: "var(--border-strong)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "var(--brand)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconRobot size={22}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>HealthOS AI</div>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success, #059669)" }}/>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>Ready to help · Always private</div>
            </div>
            <IconChevronRight size={18}/>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {["Log symptom", "Check med", "Explain report"].map((s) => (
              <span key={s} style={{
                padding: "6px 10px", borderRadius: 100,
                background: "var(--card)", border: "1px solid var(--border)",
                fontSize: 11, fontWeight: 600, color: "var(--ink-2)",
              }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Conversations */}
        <SectionHeader title="Conversations"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <ConvRow avatar="L" name="Dr. Nguyen Lan" preview="Your lab results are in — everything lo…" time="9:42" unread={2} role="Cardiologist"/>
          <ConvRow avatar="T" name="Care coordinator" preview="I rescheduled your Friday appointment t…" time="Yes" role="Sunrise Clinic" color="var(--warm-peach)"/>
          <ConvRow avatar="M" name="Mom" preview="Don't forget to take your evening pill 💊" time="Mon" role="Family"  color="#E8BDB7"/>
          <ConvRow avatar="P" name="Pharmacy — District 1" preview="Your refill is ready for pickup" time="Sun" role="Service" color="#E7DEA7"/>
          <ConvRow avatar="K" name="Khoa Tran" preview="Walking buddy for tomorrow?" time="Sat" role="Friend" color="#B8F0FA"/>
        </div>
      </div>

      <TabBar active="chat" unread={3} />
    </Phone>
  );
}

function ConvRow({ avatar, name, preview, time, unread, role, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 4px", borderBottom: "1px solid var(--border)",
    }}>
      <Avatar name={avatar} size={46} color={color}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <span className="tabular" style={{ fontSize: 11, color: unread ? "var(--brand)" : "var(--ink-4)", fontWeight: unread ? 700 : 500, flexShrink: 0 }}>{time}</span>
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, letterSpacing: 0.2, textTransform: "uppercase", marginTop: 1 }}>{role}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <div style={{
            fontSize: 12, color: unread ? "var(--ink-2)" : "var(--ink-3)",
            fontWeight: unread ? 600 : 500, flex: 1, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{preview}</div>
          {unread ? <span style={{
            minWidth: 18, height: 18, padding: "0 6px",
            background: "var(--brand)", color: "#fff",
            borderRadius: 9, fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{unread}</span> : null}
        </div>
      </div>
    </div>
  );
}

/* AI conversation view — visible version of chat */
function ChatConversationScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <header className="topbar" style={{ padding: "8px 16px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <button className="icon-btn ghost"><IconChevronLeft size={20}/></button>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "var(--brand)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <IconRobot size={18}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
              HealthOS AI
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success, #059669)" }}/>
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-3)" }}>Always private · Never medical advice</div>
          </div>
        </div>
        <button className="icon-btn"><IconMore size={18}/></button>
      </header>

      <div className="screen-body" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <DateChip text="Today"/>

        <Bubble side="ai">
          Hi Minh 👋 I noticed your heart rate is trending lower this week. Want to see the details?
        </Bubble>

        <Bubble side="me">Yes, show me the trend</Bubble>

        <Bubble side="ai">
          Here's your resting HR for the past 7 days. Average: <b>68 bpm</b>, down from 72 last week.
          <div style={{
            marginTop: 10, padding: 10, borderRadius: 10,
            background: "var(--brand-soft)",
            border: "1px solid var(--border-strong)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: 0.4 }}>Resting HR</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>68 bpm ▼ 4</div>
            <svg viewBox="0 0 200 40" width="100%" height="40" preserveAspectRatio="none" style={{ marginTop: 4 }}>
              <path d="M0,10 L33,14 L66,8 L100,12 L133,20 L166,24 L200,22"
                    stroke="var(--brand)" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </Bubble>

        <Bubble side="ai" small>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)", fontSize: 11 }}>
            <IconSparkle size={12}/> Based on data from your Fitbit
          </span>
        </Bubble>

        <Bubble side="me">Great. Anything I should tell Dr. Nguyen?</Bubble>

        <Bubble side="ai" typing/>
      </div>

      {/* Composer */}
      <div style={{
        flexShrink: 0, padding: "10px 12px 20px",
        background: "var(--bg-elev)",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--bg)", border: "1px solid var(--border)",
          borderRadius: 24, padding: "6px 6px 6px 14px",
        }}>
          <button className="icon-btn ghost" style={{ width: 32, height: 32 }}><IconPaperclip size={18}/></button>
          <input placeholder="Message HealthOS…" style={{
            flex: 1, border: "none", background: "transparent",
            fontSize: 14, color: "var(--ink)", outline: "none",
            fontFamily: "inherit", padding: "6px 0",
          }}/>
          <button className="icon-btn" style={{ background: "var(--brand)", color: "#fff", border: "none", width: 36, height: 36 }}>
            <IconSend size={16}/>
          </button>
        </div>
      </div>
    </Phone>
  );
}

function DateChip({ text }) {
  return (
    <div style={{ textAlign: "center", margin: "4px 0" }}>
      <span style={{
        padding: "4px 10px", borderRadius: 100,
        background: "var(--chip)", color: "var(--ink-3)",
        fontSize: 11, fontWeight: 600,
      }}>{text}</span>
    </div>
  );
}

function Bubble({ side, children, typing, small }) {
  const me = side === "me";
  return (
    <div style={{
      display: "flex", justifyContent: me ? "flex-end" : "flex-start",
      width: "100%",
    }}>
      <div style={{
        maxWidth: "82%",
        padding: small ? "4px 10px" : "10px 14px",
        borderRadius: 18,
        borderTopRightRadius: me ? 4 : 18,
        borderTopLeftRadius: me ? 18 : 4,
        background: me ? "var(--brand)" : "var(--card)",
        color: me ? "#fff" : "var(--ink)",
        border: me ? "none" : "1px solid var(--border)",
        fontSize: 14, lineHeight: 1.4,
      }}>
        {typing ? (
          <span style={{ display: "inline-flex", gap: 3, padding: "4px 4px" }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--ink-4)",
                animation: `typ 1.2s ${i * 0.2}s infinite`,
              }}/>
            ))}
          </span>
        ) : children}
      </div>
    </div>
  );
}

Object.assign(window, { ChatScreen, ChatConversationScreen });
