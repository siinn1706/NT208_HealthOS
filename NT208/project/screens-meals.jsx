/* global React, Phone, TabBar, TopBar, BackBar, SectionHeader, Avatar, Ring, Sparkline,
   IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft, IconChevronDown,
   IconCalendar, IconClock, IconSparkle, IconFilter, IconMore, IconCamera, IconFlash,
   IconUtensils, IconApple, IconLeaf, IconScan, IconBarcode, IconTrendUp, IconCookie, IconBowl,
   IconCheck, IconX, IconAlert, IconWater, IconFire, IconDroplet, IconHeartPulse,
   IconPaperclip, IconRefresh, IconRobot,
   FullBtn, Field, TextInput */

/* ╔═══════════════════════════════════════════════════════════
   ║  F · MEALS / NUTRITION
   ╚═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   F1 · MEALS HUB
   Today's intake, macro rings, the meal feed (breakfast → snack),
   plus a "log meal" CTA. Lives under the Meds tab? No — surfaced
   from Home quick action and from a dedicated route.
   ───────────────────────────────────────────────────────────── */
function MealsHubScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <TopBar
        title="Meals"
        subtitle="Tue · Apr 24"
        right={<>
          <button className="icon-btn"><IconCalendar size={17}/></button>
          <button className="icon-btn" style={{ background: "var(--brand)", color: "#fff", border: "none" }}><IconPlus size={18}/></button>
        </>}
      />

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* Day strip */}
        <div style={{ display: "flex", gap: 6, padding: "2px 0 14px", overflowX: "auto" }}>
          {[
            { d: "Sat", n: 19, kcal: "2,210" },
            { d: "Sun", n: 20, kcal: "1,940" },
            { d: "Mon", n: 21, kcal: "2,080" },
            { d: "Tue", n: 22, kcal: "1,720" },
            { d: "Wed", n: 23, kcal: "1,890" },
            { d: "Thu", n: 24, kcal: "1,420", today: true },
          ].map((d) => (
            <div key={d.n} style={{
              flex: "0 0 56px", textAlign: "center", padding: "8px 0", borderRadius: 12,
              background: d.today ? "var(--brand)" : "var(--card)",
              color: d.today ? "#fff" : "var(--ink)",
              border: d.today ? "none" : "1px solid var(--border)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, opacity: d.today ? 0.85 : 0.6, letterSpacing: 0.4 }}>{d.d.toUpperCase()}</div>
              <div className="tabular" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{d.n}</div>
              <div className="tabular" style={{ fontSize: 9, marginTop: 2, opacity: d.today ? 0.85 : 0.55, fontWeight: 600 }}>{d.kcal}</div>
            </div>
          ))}
        </div>

        {/* Hero: today's calories */}
        <div className="card" style={{
          padding: 18, marginBottom: 14,
          background: "linear-gradient(140deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 65%, var(--accent)) 100%)",
          color: "#fff", border: "none", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: -30, bottom: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <Ring value={1420 / 2100} size={84} stroke={8} color="#fff" track="rgba(255,255,255,0.22)">
              <div style={{ textAlign: "center", lineHeight: 1 }}>
                <div className="tabular" style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>680</div>
                <div style={{ fontSize: 8, opacity: 0.85, fontWeight: 600, marginTop: 2, letterSpacing: 0.3 }}>LEFT</div>
              </div>
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Calories today</div>
              <div className="tabular" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.6, marginTop: 2 }}>1,420 <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.8 }}>/ 2,100 kcal</span></div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>3 meals · 1 snack logged</div>
            </div>
          </div>
        </div>

        {/* Macro rings */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Carbs",   val: 162, tgt: 240, unit: "g", color: "#E3B79A", v: 162/240 },
            { label: "Protein", val: 78,  tgt: 110, unit: "g", color: "var(--brand)", v: 78/110 },
            { label: "Fat",     val: 49,  tgt: 70,  unit: "g", color: "#5B90C4", v: 49/70 },
          ].map((m) => (
            <div key={m.label} className="card card-tight" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{m.label}</div>
              <div className="tabular" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, marginTop: 2 }}>{m.val}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)" }}>/{m.tgt}{m.unit}</span></div>
              <div style={{ height: 5, background: "var(--chip)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, m.v * 100)}%`, height: "100%", background: m.color, borderRadius: 3 }}/>
              </div>
            </div>
          ))}
        </div>

        {/* AI nudge */}
        <div className="card" style={{
          marginBottom: 14, padding: 14,
          background: "color-mix(in srgb, var(--brand-soft) 60%, var(--card))",
          borderColor: "var(--border-strong)",
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconSparkle size={16}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", letterSpacing: 0.4, textTransform: "uppercase" }}>Coach</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>You're 32g short on protein. Try Greek yogurt or grilled chicken at dinner.</div>
            </div>
          </div>
        </div>

        {/* Today's meals */}
        <SectionHeader title="Today's meals" action="See all"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <MealRow
            slot="Breakfast" time="07:30" kcal={420}
            title="Oats with banana & almonds"
            meta="1 bowl · home"
            colorBg="#E3B79A" Ic={IconBowl}
          />
          <MealRow
            slot="Lunch" time="12:15" kcal={620}
            title="Grilled chicken bún chả"
            meta="Quán Ngon · scanned"
            colorBg="var(--brand)" Ic={IconUtensils}
            scanned
          />
          <MealRow
            slot="Snack" time="15:30" kcal={180}
            title="Apple + peanut butter"
            meta="1 medium apple · 15g"
            colorBg="#059669" Ic={IconApple}
          />
          <button className="card" style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: 14, borderStyle: "dashed", background: "transparent",
            color: "var(--ink-2)", cursor: "pointer", textAlign: "left",
            fontFamily: "inherit",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><IconPlus size={18}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Add dinner</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>~680 kcal target remaining</div>
            </div>
            <IconChevronRight size={16}/>
          </button>
        </div>

        {/* Trends teaser */}
        <SectionHeader title="This week" action="Trends"/>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Avg daily intake</div>
              <div className="tabular" style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>1,953 <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>kcal</span></div>
            </div>
            <span className="chip success">▼ 7% vs last wk</span>
          </div>
          <Sparkline data={[2210, 1940, 2080, 1720, 1890, 2050, 1420]} color="var(--brand)"/>
        </div>
      </div>

      <TabBar active="meds" />
    </Phone>
  );
}

function MealRow({ slot, time, kcal, title, meta, colorBg, Ic, scanned }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `color-mix(in srgb, ${colorBg} 18%, var(--card))`,
        color: colorBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Ic size={20}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", letterSpacing: 0.5, textTransform: "uppercase" }}>{slot}</span>
          <span className="tabular" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>· {time}</span>
          {scanned && <span className="chip brand" style={{ fontSize: 9, padding: "1px 6px" }}>AI</span>}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: -0.1 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="tabular" style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.2 }}>{kcal}</div>
        <div style={{ fontSize: 9, color: "var(--ink-3)", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>kcal</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   F2 · ADD MEAL — entry point with 4 input modes
   AI scan (camera), barcode, search, manual entry. Recents below.
   ───────────────────────────────────────────────────────────── */
function AddMealScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Add meal" right={<button className="icon-btn"><IconX size={18}/></button>}/>

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* meal slot picker */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "2px 0 14px" }}>
          {[
            { k: "B", l: "Breakfast" },
            { k: "L", l: "Lunch", on: true },
            { k: "D", l: "Dinner" },
            { k: "S", l: "Snack" },
          ].map((s) => (
            <button key={s.l} style={{
              padding: "10px 4px", borderRadius: 10,
              background: s.on ? "var(--brand)" : "var(--card)",
              color: s.on ? "#fff" : "var(--ink-2)",
              border: s.on ? "none" : "1px solid var(--border)",
              fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{s.l}</button>
          ))}
        </div>

        {/* search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "0 14px",
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
          height: 48, marginBottom: 14,
        }}>
          <IconSearch size={16} style={{ color: "var(--ink-3)" }}/>
          <input placeholder="Search foods, brands, or meals…" style={{
            flex: 1, border: "none", background: "transparent", outline: "none",
            fontSize: 14, fontFamily: "inherit", color: "var(--ink)",
          }}/>
        </div>

        {/* primary methods */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <MethodCard hero Ic={IconCamera} title="Scan with AI" sub="Snap your plate" colorA="var(--brand)" colorB="var(--accent)"/>
          <MethodCard Ic={IconBarcode} title="Barcode" sub="Packaged foods"/>
          <MethodCard Ic={IconUtensils} title="Manual entry" sub="Custom dish"/>
          <MethodCard Ic={IconRefresh} title="From history" sub="Recent meals"/>
        </div>

        {/* Recents */}
        <SectionHeader title="Frequent for lunch"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <FoodRow title="Bún chả" sub="1 bowl · ~620 kcal" tag="3× this week" Ic={IconUtensils} colorBg="var(--brand)" addable/>
          <FoodRow title="Phở bò" sub="1 bowl · ~480 kcal" tag="2× this week" Ic={IconBowl} colorBg="#E3B79A" addable/>
          <FoodRow title="Cơm tấm sườn" sub="1 plate · ~720 kcal" Ic={IconUtensils} colorBg="#5B90C4" addable last/>
        </div>

        {/* Recently logged */}
        <SectionHeader title="Recently logged"/>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <FoodRow title="Greek yogurt + berries" sub="1 cup · 180 kcal" time="Yesterday" Ic={IconBowl} colorBg="#059669" addable/>
          <FoodRow title="Vietnamese coffee" sub="1 cup · 90 kcal" time="Yesterday" Ic={IconCookie} colorBg="#8B5E3C" addable/>
          <FoodRow title="Banana" sub="1 medium · 105 kcal" time="2d ago" Ic={IconApple} colorBg="#D9A441" addable last/>
        </div>
      </div>
    </Phone>
  );
}

function MethodCard({ hero, Ic, title, sub, colorA, colorB }) {
  if (hero) {
    return (
      <button style={{
        gridColumn: "1 / -1", padding: 16, borderRadius: 16,
        background: `linear-gradient(135deg, ${colorA}, ${colorB})`,
        color: "#fff", border: "none", cursor: "pointer", textAlign: "left",
        fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -10, top: -20, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }}/>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}><Ic size={22}/></div>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 10, padding: "6px 10px", fontSize: 11, fontWeight: 700, position: "relative" }}>NEW</div>
      </button>
    );
  }
  return (
    <button className="card" style={{
      padding: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
      background: "var(--card)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><Ic size={17}/></div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  );
}

function FoodRow({ title, sub, tag, time, Ic, colorBg, addable, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 12,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `color-mix(in srgb, ${colorBg} 18%, var(--card))`,
        color: colorBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}><Ic size={18}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
          {tag && <span className="chip brand" style={{ fontSize: 9, padding: "1px 6px" }}>{tag}</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {sub}{time ? ` · ${time}` : ""}
        </div>
      </div>
      {addable && (
        <button className="icon-btn" style={{ background: "var(--brand-soft)", color: "var(--brand)", borderColor: "transparent" }}>
          <IconPlus size={16}/>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   F3a · AI MEAL SCAN — CAMERA VIEWFINDER
   ───────────────────────────────────────────────────────────── */
function MealScanCameraScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div style={{
        position: "absolute", inset: 0,
        background: "#0B0F14",
        color: "#fff",
        display: "flex", flexDirection: "column",
      }}>
        {/* Status bar overlay */}
        <div className="statusbar" style={{ color: "#fff" }}>
          <span>9:41</span>
          <span className="icons">
            <svg width="66" height="13" viewBox="0 0 66 13" fill="none">
              <rect x="0" y="9" width="3" height="4" rx="0.6" fill="#fff"/>
              <rect x="5" y="6" width="3" height="7" rx="0.6" fill="#fff"/>
              <rect x="10" y="3" width="3" height="10" rx="0.6" fill="#fff"/>
              <rect x="15" y="0" width="3" height="13" rx="0.6" fill="#fff"/>
              <circle cx="30" cy="10" r="0.9" fill="#fff"/>
              <rect x="42" y="2" width="20" height="10" rx="2.5" stroke="#fff" strokeWidth="1" fill="none"/>
              <rect x="44" y="4" width="14" height="6" rx="1" fill="#fff"/>
            </svg>
          </span>
        </div>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px" }}>
          <button className="icon-btn ghost" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "none" }}><IconX size={18}/></button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn ghost" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "none" }}><IconFlash size={16}/></button>
            <button className="icon-btn ghost" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "none" }}><IconBarcode size={16}/></button>
          </div>
        </div>

        {/* Viewfinder */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 32px" }}>
          {/* Faux camera background */}
          <div style={{
            position: "absolute", inset: "20px 32px",
            borderRadius: 28,
            background: "radial-gradient(circle at 30% 40%, #5e483a 0%, #2a1f18 60%, #1a1310 100%)",
            overflow: "hidden",
          }}>
            {/* Faux plate */}
            <div style={{
              position: "absolute", top: "30%", left: "12%", width: "76%", aspectRatio: "1",
              borderRadius: "50%", background: "radial-gradient(circle, #f4ead8 0%, #e8d8b8 70%, #c9a877 100%)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
            }}/>
            {/* Faux food blobs */}
            <div style={{ position: "absolute", top: "44%", left: "26%", width: "30%", height: "18%", borderRadius: "60%", background: "linear-gradient(135deg, #c4762e, #8b4f1a)" }}/>
            <div style={{ position: "absolute", top: "52%", left: "52%", width: "24%", height: "16%", borderRadius: "50%", background: "linear-gradient(135deg, #6a8c3a, #3d5a1f)" }}/>
            <div style={{ position: "absolute", top: "62%", left: "32%", width: "22%", height: "14%", borderRadius: "50%", background: "linear-gradient(135deg, #d9c89a, #a89866)" }}/>
          </div>

          {/* Corner brackets */}
          <div style={{ position: "absolute", inset: "20px 32px", pointerEvents: "none" }}>
            {[
              { top: 0, left: 0, br: "8px 0 0 0" },
              { top: 0, right: 0, br: "0 8px 0 0" },
              { bottom: 0, left: 0, br: "0 0 0 8px" },
              { bottom: 0, right: 0, br: "0 0 8px 0" },
            ].map((c, i) => (
              <div key={i} style={{
                position: "absolute", ...c,
                width: 36, height: 36,
                borderTop: c.top != null ? "3px solid #fff" : "none",
                borderBottom: c.bottom != null ? "3px solid #fff" : "none",
                borderLeft: c.left != null ? "3px solid #fff" : "none",
                borderRight: c.right != null ? "3px solid #fff" : "none",
                borderRadius: c.br,
              }}/>
            ))}
          </div>

          {/* Hint */}
          <div style={{ position: "absolute", top: 30, left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(0,0,0,0.55)", padding: "8px 14px", borderRadius: 100,
              fontSize: 12, fontWeight: 600, color: "#fff", backdropFilter: "blur(8px)",
            }}><IconSparkle size={13}/> Center the plate in the frame</span>
          </div>
        </div>

        {/* Bottom controls */}
        <div style={{ padding: "16px 20px 28px" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
            {["Photo", "Multi-photo", "Manual"].map((t, i) => (
              <span key={t} style={{
                padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                background: i === 0 ? "rgba(255,255,255,0.18)" : "transparent",
                color: i === 0 ? "#fff" : "rgba(255,255,255,0.55)",
              }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "linear-gradient(135deg, #c4762e, #8b4f1a)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}/>
            {/* Shutter */}
            <button style={{
              width: 76, height: 76, borderRadius: "50%",
              border: "4px solid #fff", background: "transparent",
              padding: 4, cursor: "pointer",
            }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fff" }}/>
            </button>
            <button style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(255,255,255,0.14)",
              border: "none", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <IconRefresh size={20}/>
            </button>
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ─────────────────────────────────────────────────────────────
   F3b · AI MEAL SCAN — ANALYZING
   ───────────────────────────────────────────────────────────── */
function MealScanAnalyzingScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <div style={{ position: "absolute", inset: 0, background: "#0B0F14", color: "#fff", display: "flex", flexDirection: "column" }}>
        <div className="statusbar" style={{ color: "#fff" }}>
          <span>9:41</span>
          <span className="icons">
            <svg width="66" height="13" viewBox="0 0 66 13" fill="none">
              <rect x="15" y="0" width="3" height="13" rx="0.6" fill="#fff"/>
              <rect x="42" y="2" width="20" height="10" rx="2.5" stroke="#fff" strokeWidth="1" fill="none"/>
              <rect x="44" y="4" width="14" height="6" rx="1" fill="#fff"/>
            </svg>
          </span>
        </div>

        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
          {/* Captured photo */}
          <div style={{
            position: "absolute", inset: "0 20px", top: 0, bottom: 220,
            margin: "12px 0",
            borderRadius: 24,
            background: "radial-gradient(circle at 30% 40%, #5e483a 0%, #2a1f18 60%, #1a1310 100%)",
            overflow: "hidden",
          }}>
            {/* dimmed plate */}
            <div style={{
              position: "absolute", top: "26%", left: "10%", width: "80%", aspectRatio: "1",
              borderRadius: "50%", background: "radial-gradient(circle, #f4ead8 0%, #e8d8b8 70%, #c9a877 100%)",
              filter: "brightness(0.7)",
            }}/>
            <div style={{ position: "absolute", top: "42%", left: "22%", width: "32%", height: "20%", borderRadius: "60%", background: "linear-gradient(135deg, #c4762e, #8b4f1a)", filter: "brightness(0.7)" }}/>
            <div style={{ position: "absolute", top: "50%", left: "50%", width: "26%", height: "18%", borderRadius: "50%", background: "linear-gradient(135deg, #6a8c3a, #3d5a1f)", filter: "brightness(0.7)" }}/>
            <div style={{ position: "absolute", top: "62%", left: "30%", width: "24%", height: "16%", borderRadius: "50%", background: "linear-gradient(135deg, #d9c89a, #a89866)", filter: "brightness(0.7)" }}/>

            {/* Detection bounding boxes */}
            <DetBox top="38%" left="20%" w="36%" h="24%" label="Grilled pork · 92%"/>
            <DetBox top="50%" left="48%" w="28%" h="20%" label="Greens · 84%" delay="0.4s"/>
            <DetBox top="62%" left="28%" w="26%" h="18%" label="Rice noodles · 88%" delay="0.8s"/>

            {/* scanning line */}
            <div style={{
              position: "absolute", left: 0, right: 0, top: 0, height: 4,
              background: "linear-gradient(90deg, transparent, #41BCE6 50%, transparent)",
              boxShadow: "0 0 24px #41BCE6",
              animation: "scanline 2.4s ease-in-out infinite",
            }}/>
          </div>

          {/* Bottom analyzing card */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "var(--bg-elev)",
            color: "var(--ink)",
            borderRadius: "24px 24px 0 0",
            padding: "20px 22px 32px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--brand)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IconSparkle size={20}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.2 }}>Analyzing your plate…</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                  <span className="dot-typ">Detecting ingredients</span>
                  <span style={{ display: "inline-block", marginLeft: 4 }}>
                    <Dot/><Dot d={0.2}/><Dot d={0.4}/>
                  </span>
                </div>
              </div>
            </div>

            <Stage label="Detect food" done/>
            <Stage label="Estimate portions" done/>
            <Stage label="Look up nutrition" active/>
            <Stage label="Match to your goals"/>

            <button className="btn ghost" style={{ width: "100%", marginTop: 14, height: 44 }}>Cancel</button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scanline { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(380px); } }
      `}</style>
    </Phone>
  );
}

function DetBox({ top, left, w, h, label, delay = "0s" }) {
  return (
    <div style={{
      position: "absolute", top, left, width: w, height: h,
      border: "2px solid #41BCE6",
      borderRadius: 8,
      boxShadow: "0 0 0 4px rgba(65,188,230,0.18)",
      animation: `detect 1.2s ${delay} backwards ease-out`,
    }}>
      <div style={{
        position: "absolute", top: -22, left: -2,
        background: "#41BCE6", color: "#0B0F14",
        padding: "2px 6px", borderRadius: 4,
        fontSize: 9, fontWeight: 800, letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}>{label}</div>
      <style>{`@keyframes detect { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

function Dot({ d = 0 }) {
  return <span style={{
    display: "inline-block", width: 4, height: 4, borderRadius: "50%",
    background: "var(--ink-3)", margin: "0 1px",
    animation: `typ 1.2s ${d}s infinite`, verticalAlign: "middle",
  }}/>;
}

function Stage({ label, done, active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: done ? "var(--success, #059669)" : active ? "var(--brand)" : "var(--chip)",
        color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {done ? <IconCheck size={12} strokeWidth={3.5}/> : active ? (
          <div style={{ width: 8, height: 8, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
        ) : null}
      </div>
      <span style={{
        fontSize: 13,
        fontWeight: active ? 700 : done ? 600 : 500,
        color: active ? "var(--ink)" : done ? "var(--ink-2)" : "var(--ink-3)",
      }}>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   F3c · AI MEAL SCAN — RESULTS / CONFIRM
   ───────────────────────────────────────────────────────────── */
function MealScanResultsScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="Confirm meal" right={<button className="icon-btn"><IconRefresh size={16}/></button>}/>

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* Scanned photo */}
        <div style={{
          height: 160, borderRadius: 16, marginBottom: 14, overflow: "hidden", position: "relative",
          background: "radial-gradient(circle at 30% 40%, #5e483a 0%, #2a1f18 100%)",
        }}>
          <div style={{ position: "absolute", top: "20%", left: "20%", width: "60%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, #f4ead8, #c9a877)" }}/>
          <div style={{ position: "absolute", top: "45%", left: "26%", width: "28%", height: "22%", borderRadius: "60%", background: "linear-gradient(135deg, #c4762e, #8b4f1a)" }}/>
          <div style={{ position: "absolute", top: "55%", left: "48%", width: "24%", height: "18%", borderRadius: "50%", background: "linear-gradient(135deg, #6a8c3a, #3d5a1f)" }}/>
          <div style={{ position: "absolute", top: "60%", left: "30%", width: "22%", height: "16%", borderRadius: "50%", background: "linear-gradient(135deg, #d9c89a, #a89866)" }}/>
          <span style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(0,0,0,0.55)", color: "#fff", padding: "5px 10px",
            borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <IconSparkle size={11}/> Detected
          </span>
        </div>

        {/* Detected dish */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Best match · 94%</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, marginTop: 2 }}>Bún chả Hà Nội</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Grilled pork, rice noodles, herbs</div>
          </div>
          <button className="btn ghost" style={{ height: 36, fontSize: 12, padding: "0 12px" }}>Change</button>
        </div>

        {/* Calorie summary */}
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "var(--brand-soft)", color: "var(--brand)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <div className="tabular" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1 }}>620</div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.4, marginTop: 2 }}>KCAL</div>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { l: "Carbs", v: "62g", c: "#E3B79A" },
                { l: "Protein", v: "38g", c: "var(--brand)" },
                { l: "Fat", v: "22g", c: "#5B90C4" },
              ].map((m) => (
                <div key={m.l}>
                  <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>{m.l}</div>
                  <div className="tabular" style={{ fontSize: 15, fontWeight: 800, marginTop: 2, color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Identified items — editable */}
        <SectionHeader title="Items detected" action="Add item"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <DetectedItem name="Grilled pork (chả)" amount="80 g" kcal="240" conf={92}/>
          <DetectedItem name="Rice noodles (bún)" amount="120 g" kcal="180" conf={88}/>
          <DetectedItem name="Mixed herbs & lettuce" amount="40 g" kcal="12" conf={84}/>
          <DetectedItem name="Nước chấm dipping sauce" amount="60 ml" kcal="38" conf={71} warn last/>
        </div>

        {/* Slot picker */}
        <div className="card" style={{ padding: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--brand-soft)", color: "var(--brand)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><IconClock size={16}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>Add to</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 1 }}>Lunch · today, 12:15</div>
          </div>
          <IconChevronRight size={16}/>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <FullBtn variant="ghost">Retake</FullBtn>
          <FullBtn>Save meal</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

function DetectedItem({ name, amount, kcal, conf, warn, last }) {
  return (
    <div style={{
      padding: 12,
      borderBottom: last ? "none" : "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
          {warn && <span className="chip warning" style={{ fontSize: 9, padding: "1px 6px" }}>Low confidence</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{amount}</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-3)" }}/>
          <span className="tabular">{kcal} kcal</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-3)" }}/>
          <span className="tabular">{conf}% match</span>
        </div>
      </div>
      <button className="icon-btn ghost"><IconChevronRight size={14}/></button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   F4 · MEAL DETAIL — full breakdown of a saved meal
   ───────────────────────────────────────────────────────────── */
function MealDetailScreen({ theme = "theme-calm" }) {
  return (
    <Phone theme={theme}>
      <BackBar title="" right={<>
        <button className="icon-btn"><IconRefresh size={16}/></button>
        <button className="icon-btn"><IconMore size={18}/></button>
      </>}/>

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* Hero photo */}
        <div style={{
          height: 200, borderRadius: 20, marginBottom: 14, overflow: "hidden", position: "relative",
          background: "radial-gradient(circle at 30% 40%, #5e483a 0%, #2a1f18 100%)",
        }}>
          <div style={{ position: "absolute", top: "18%", left: "18%", width: "64%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, #f4ead8, #c9a877)" }}/>
          <div style={{ position: "absolute", top: "44%", left: "26%", width: "30%", height: "24%", borderRadius: "60%", background: "linear-gradient(135deg, #c4762e, #8b4f1a)" }}/>
          <div style={{ position: "absolute", top: "54%", left: "50%", width: "26%", height: "20%", borderRadius: "50%", background: "linear-gradient(135deg, #6a8c3a, #3d5a1f)" }}/>
          <div style={{ position: "absolute", top: "60%", left: "30%", width: "22%", height: "16%", borderRadius: "50%", background: "linear-gradient(135deg, #d9c89a, #a89866)" }}/>
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
            <span className="chip brand" style={{ background: "rgba(255,255,255,0.92)", color: "var(--brand)" }}><IconSparkle size={11}/> AI scan</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Lunch · today · 12:15
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginTop: 4 }}>Bún chả Hà Nội</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>Quán Ngon · Pasteur St.</div>
        </div>

        {/* Macros card */}
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Ring value={0.295} size={70} stroke={7}>
              <div style={{ textAlign: "center", lineHeight: 1 }}>
                <div className="tabular" style={{ fontSize: 16, fontWeight: 800 }}>620</div>
                <div style={{ fontSize: 8, color: "var(--ink-3)", fontWeight: 700, letterSpacing: 0.3, marginTop: 1 }}>KCAL</div>
              </div>
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Of daily target</div>
              <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 2, letterSpacing: -0.3 }}>29.5%</div>
              <div style={{ fontSize: 11, color: "var(--success, #059669)", fontWeight: 600, marginTop: 2 }}>On track for the day</div>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }}/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { l: "Carbs", v: 62, tgt: 240, c: "#E3B79A" },
              { l: "Protein", v: 38, tgt: 110, c: "var(--brand)" },
              { l: "Fat", v: 22, tgt: 70, c: "#5B90C4" },
            ].map((m) => (
              <div key={m.l}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{m.l}</div>
                <div className="tabular" style={{ fontSize: 16, fontWeight: 800, marginTop: 2, letterSpacing: -0.2 }}>{m.v}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--ink-3)" }}>g</span></div>
                <div style={{ height: 4, background: "var(--chip)", borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
                  <div style={{ width: `${(m.v / m.tgt) * 100}%`, height: "100%", background: m.c }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients list */}
        <SectionHeader title="What's in it"/>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <IngredientRow name="Grilled pork (chả)" g={80} kcal={240} c={32} p={28} f={12}/>
          <IngredientRow name="Rice noodles (bún)" g={120} kcal={180} c={42} p={4} f={1}/>
          <IngredientRow name="Mixed herbs & lettuce" g={40} kcal={12} c={2} p={1} f={0}/>
          <IngredientRow name="Nước chấm" g={60} kcal={38} c={6} p={1} f={0} last/>
        </div>

        {/* Micronutrients */}
        <SectionHeader title="Micronutrients" action="Full report"/>
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          {[
            { l: "Sodium", v: "1,420 mg", pct: 0.62, warn: true, hint: "62% of daily limit" },
            { l: "Fiber",  v: "5 g",      pct: 0.20, hint: "20% of target" },
            { l: "Sugar",  v: "8 g",      pct: 0.16, hint: "Within range" },
            { l: "Iron",   v: "3.2 mg",   pct: 0.40, hint: "40% of RDA" },
          ].map((n, i, a) => (
            <div key={n.l} style={{
              padding: "10px 0",
              borderBottom: i === a.length - 1 ? "none" : "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{n.l}</span>
                <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: n.warn ? "var(--warning, #D97706)" : "var(--ink)" }}>{n.v}</span>
              </div>
              <div style={{ height: 4, background: "var(--chip)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: `${n.pct * 100}%`, height: "100%", background: n.warn ? "var(--warning, #D97706)" : "var(--brand)" }}/>
              </div>
              <div style={{ fontSize: 10, color: n.warn ? "var(--warning, #D97706)" : "var(--ink-3)", marginTop: 4, fontWeight: 500 }}>{n.hint}</div>
            </div>
          ))}
        </div>

        {/* Health context */}
        <div className="card" style={{
          padding: 14, marginBottom: 14,
          background: "color-mix(in srgb, var(--warning, #D97706) 10%, var(--card))",
          borderColor: "color-mix(in srgb, var(--warning, #D97706) 30%, transparent)",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--warning, #D97706)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconHeartPulse size={16}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warning, #D97706)", letterSpacing: 0.4, textTransform: "uppercase" }}>Heads up · BP</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, lineHeight: 1.4, color: "var(--ink-2)" }}>This meal is high in sodium. Aim to keep dinner under 800 mg sodium today.</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FullBtn variant="ghost">Duplicate</FullBtn>
          <FullBtn>Edit meal</FullBtn>
        </div>
      </div>
    </Phone>
  );
}

function IngredientRow({ name, g, kcal, c, p, f, last }) {
  return (
    <div style={{
      padding: 14,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div className="tabular" style={{ fontSize: 13, fontWeight: 800 }}>{kcal} <span style={{ fontSize: 10, fontWeight: 500, color: "var(--ink-3)" }}>kcal</span></div>
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
        <span className="tabular">{g} g</span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-3)", alignSelf: "center" }}/>
        <span className="tabular">C {c}g</span>
        <span className="tabular">P {p}g</span>
        <span className="tabular">F {f}g</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   F5 · NUTRITION TRENDS
   ───────────────────────────────────────────────────────────── */
function NutritionTrendsScreen({ theme = "theme-calm" }) {
  const [range, setRange] = React.useState("week");
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const cals = [2050, 2210, 1940, 2080, 1720, 1890, 1420];
  const targets = 2100;
  const max = Math.max(...cals, targets) * 1.05;

  return (
    <Phone theme={theme}>
      <BackBar title="Nutrition trends" right={<button className="icon-btn"><IconCalendar size={16}/></button>}/>

      <div className="screen-body" style={{ padding: "0 20px 20px" }}>
        {/* Range segmented */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4,
          padding: 4, background: "var(--chip)", borderRadius: 12, marginBottom: 16,
        }}>
          {[
            { k: "day", l: "Day" },
            { k: "week", l: "Week" },
            { k: "month", l: "Month" },
            { k: "ytd", l: "Year" },
          ].map((t) => (
            <button key={t.k} onClick={() => setRange(t.k)} style={{
              padding: 8, borderRadius: 9,
              background: range === t.k ? "var(--card)" : "transparent",
              color: range === t.k ? "var(--ink)" : "var(--ink-3)",
              fontFamily: "inherit", fontWeight: 600, fontSize: 12,
              border: "none", cursor: "pointer",
              boxShadow: range === t.k ? "0 1px 3px rgba(15,39,67,0.08)" : "none",
            }}>{t.l}</button>
          ))}
        </div>

        {/* Average card */}
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Avg daily intake</div>
              <div className="tabular" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginTop: 4 }}>1,901 <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-3)" }}>kcal</span></div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Target · 2,100 kcal</div>
            </div>
            <span className="chip success" style={{ alignSelf: "flex-start" }}>
              <IconTrendUp size={11}/> ▼ 9% vs prev
            </span>
          </div>

          {/* Bar chart */}
          <div style={{ position: "relative", height: 132, marginTop: 14 }}>
            {/* target line */}
            <div style={{
              position: "absolute", left: 0, right: 0,
              top: `${(1 - targets / max) * 100}%`,
              height: 1, borderTop: "1.5px dashed var(--border-strong)",
              pointerEvents: "none",
            }}>
              <span style={{
                position: "absolute", right: 0, top: -16,
                fontSize: 9, color: "var(--ink-3)", fontWeight: 700, letterSpacing: 0.3,
                background: "var(--card)", padding: "0 4px",
              }}>TARGET 2,100</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: "100%" }}>
              {cals.map((v, i) => {
                const isToday = i === cals.length - 1;
                const h = (v / max) * 100;
                const over = v > targets;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: "100%", height: `${h}%`,
                      background: isToday ? "var(--brand)" : over ? "color-mix(in srgb, var(--warning, #D97706) 70%, transparent)" : "var(--brand-soft)",
                      borderRadius: "6px 6px 2px 2px",
                      position: "relative",
                    }}>
                      {isToday && (
                        <span className="tabular" style={{
                          position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
                          fontSize: 9, fontWeight: 800, color: "var(--brand)",
                        }}>{v.toLocaleString()}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--brand)" : "var(--ink-3)" }}>{days[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Macro split donut + legend */}
        <SectionHeader title="Macro split · this week"/>
        <div className="card" style={{ padding: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 18 }}>
          <MacroDonut/>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <LegendRow color="#E3B79A" label="Carbs" pct="48%" amt="228g" target="55%"/>
            <LegendRow color="var(--brand)" label="Protein" pct="22%" amt="105g" target="20%"/>
            <LegendRow color="#5B90C4" label="Fat" pct="30%" amt="63g" target="25%"/>
          </div>
        </div>

        {/* Insights */}
        <SectionHeader title="Insights"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <InsightCard
            tone="success"
            Ic={IconCheck}
            title="Protein on point"
            sub="You've hit your protein target 6 days this week — keep it up."
          />
          <InsightCard
            tone="warn"
            Ic={IconAlert}
            title="Sodium running high"
            sub="Avg 2,820 mg/day · 23% over the recommended limit. Cooked-at-home meals are lower."
          />
          <InsightCard
            tone="brand"
            Ic={IconLeaf}
            title="More fiber needed"
            sub="Adding 1 piece of fruit/day would close the gap. Berries and pears are easy wins."
          />
        </div>

        {/* Top foods */}
        <SectionHeader title="Top foods this week"/>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <TopFoodRow rank={1} name="Bún chả" sub="3 servings · 1,860 kcal total" Ic={IconUtensils} colorBg="var(--brand)"/>
          <TopFoodRow rank={2} name="Vietnamese coffee" sub="5 cups · 450 kcal total" Ic={IconCookie} colorBg="#8B5E3C"/>
          <TopFoodRow rank={3} name="Banana" sub="6 medium · 630 kcal total" Ic={IconApple} colorBg="#D9A441" last/>
        </div>
      </div>
    </Phone>
  );
}

function MacroDonut() {
  // Carbs 48%, Protein 22%, Fat 30%
  const r = 38, c = 2 * Math.PI * r;
  const segs = [
    { v: 0.48, color: "#E3B79A" },
    { v: 0.22, color: "var(--brand)" },
    { v: 0.30, color: "#5B90C4" },
  ];
  let acc = 0;
  return (
    <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} stroke="var(--chip)" strokeWidth="14" fill="none"/>
        {segs.map((s, i) => {
          const dash = c * s.v;
          const offset = -c * acc;
          acc += s.v;
          return (
            <circle key={i} cx="50" cy="50" r={r}
              stroke={s.color} strokeWidth="14" fill="none"
              strokeDasharray={`${dash} ${c}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", lineHeight: 1.1,
      }}>
        <div className="tabular" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>1,901</div>
        <div style={{ fontSize: 9, color: "var(--ink-3)", fontWeight: 700, letterSpacing: 0.3 }}>KCAL AVG</div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, pct, amt, target }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }}/>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
          <span className="tabular" style={{ fontSize: 12, fontWeight: 700 }}>{pct}</span>
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>
          <span className="tabular">{amt}</span> · target {target}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ tone, Ic, title, sub }) {
  const toneStyles = {
    success: { bg: "color-mix(in srgb, var(--success, #059669) 10%, var(--card))", bd: "color-mix(in srgb, var(--success, #059669) 28%, transparent)", fg: "var(--success, #059669)" },
    warn:    { bg: "color-mix(in srgb, var(--warning, #D97706) 10%, var(--card))", bd: "color-mix(in srgb, var(--warning, #D97706) 30%, transparent)", fg: "var(--warning, #D97706)" },
    brand:   { bg: "color-mix(in srgb, var(--brand-soft) 60%, var(--card))", bd: "var(--border-strong)", fg: "var(--brand)" },
  }[tone];
  return (
    <div className="card" style={{ padding: 14, background: toneStyles.bg, borderColor: toneStyles.bd }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: toneStyles.fg, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}><Ic size={16}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.1 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function TopFoodRow({ rank, name, sub, Ic, colorBg, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 12,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div className="tabular" style={{
        width: 22, fontSize: 14, fontWeight: 800, color: "var(--ink-3)", textAlign: "center",
      }}>{rank}</div>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `color-mix(in srgb, ${colorBg} 18%, var(--card))`,
        color: colorBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}><Ic size={18}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
      <IconChevronRight size={14} style={{ color: "var(--ink-3)" }}/>
    </div>
  );
}

Object.assign(window, {
  MealsHubScreen,
  AddMealScreen,
  MealScanCameraScreen,
  MealScanAnalyzingScreen,
  MealScanResultsScreen,
  MealDetailScreen,
  NutritionTrendsScreen,
});
