/* global React, StatusIcons, IconHome, IconCalendar, IconChat, IconPill, IconUser */

/**
 * Phone chrome — status bar at top, bottom tab bar, and main content area.
 * Used by every screen.
 */
function Phone({ theme = "theme-calm", time = "9:41", children, className = "" }) {
  return (
    <div className={`screen ${theme} ${className}`}>
      <div className="statusbar">
        <span>{time}</span>
        <span className="icons"><StatusIcons /></span>
      </div>
      {children}
    </div>
  );
}

function TabBar({ active = "home", unread = 3 }) {
  const tabs = [
    { k: "home", label: "Home", Icon: IconHome },
    { k: "care", label: "Care", Icon: IconCalendar },
    { k: "chat", label: "Chat", Icon: IconChat, badge: unread },
    { k: "meds", label: "Meds", Icon: IconPill },
    { k: "me", label: "Me", Icon: IconUser },
  ];
  return (
    <nav className="tabbar">
      {tabs.map(({ k, label, Icon, badge }) => (
        <div key={k} className={`tab ${active === k ? "active" : ""}`}>
          <Icon size={22} strokeWidth={active === k ? 2.2 : 1.8} />
          <span>{label}</span>
          {badge ? <span className="badge">{badge}</span> : null}
        </div>
      ))}
    </nav>
  );
}

function TopBar({ title, subtitle, left, right }) {
  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {left}
        <div style={{ minWidth: 0 }}>
          <div className="topbar-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>{right}</div>
    </header>
  );
}

// Progress ring — for KPIs
function Ring({ value, size = 64, stroke = 6, color = "var(--brand)", track = "var(--border)", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset .6s var(--ease)" }}/>
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size < 60 ? 12 : 14, fontWeight: 700,
      }}>
        {children}
      </div>
    </div>
  );
}

// Mini sparkline
function Sparkline({ data, color = "var(--brand)", height = 40, fill = true }) {
  const max = Math.max(...data), min = Math.min(...data);
  const w = 200, h = height;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} preserveAspectRatio="none">
      {fill && <path d={area} fill={color} opacity="0.14"/>}
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Avatar
function Avatar({ name = "JD", size = 40, color, src }) {
  const bg = color || "var(--brand-soft)";
  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: src ? `url(${src})` : bg,
      backgroundSize: "cover",
      color: "var(--brand)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.36,
      flexShrink: 0,
      border: "1px solid var(--border)",
    }}>
      {!src && name}
    </div>
  );
}

Object.assign(window, { Phone, TabBar, TopBar, Ring, Sparkline, Avatar });
