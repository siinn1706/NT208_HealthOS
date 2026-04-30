/* global React */
// Lucide-style SVG icons, stroke-based, matching NT208's visual language

const Icon = ({ d, size = 22, strokeWidth = 2, fill = "none", children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children || <path d={d} />}
  </svg>
);

// Navigation
const IconHome = (p) => <Icon {...p}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></Icon>;
const IconCalendar = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Icon>;
const IconChat = (p) => <Icon {...p}><path d="M21 12a8 8 0 0 1-11.6 7.2L3 21l1.8-5.4A8 8 0 1 1 21 12z"/></Icon>;
const IconPill = (p) => <Icon {...p}><path d="M10.5 20.5a7 7 0 0 1-9.9-9.9l10-10a7 7 0 0 1 9.9 9.9z"/><path d="M8.5 8.5l7 7"/></Icon>;
const IconUser = (p) => <Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>;

// Dashboard
const IconBell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconChevronRight = (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>;
const IconChevronLeft = (p) => <Icon {...p}><path d="M15 18l-6-6 6-6"/></Icon>;
const IconChevronDown = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
const IconHeart = (p) => <Icon {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></Icon>;
const IconActivity = (p) => <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Icon>;
const IconFootprints = (p) => <Icon {...p}><path d="M4 16v-2.4c0-1.3 1.1-2.6 2.4-2.6 1.3 0 2.4 1.1 2.4 2.4v.8c0 1.5-1 2.8-2.4 2.8"/><path d="M6.4 16v4.6M20 16v-2.4c0-1.3-1.1-2.6-2.4-2.6-1.3 0-2.4 1.1-2.4 2.4v.8c0 1.5 1 2.8 2.4 2.8"/><path d="M17.6 16v4.6M8 5.5c0 1.4-1.1 2.5-2.5 2.5S3 6.9 3 5.5 4.1 3 5.5 3 8 4.1 8 5.5zM21 8c0 1.4-1.1 2.5-2.5 2.5S16 9.4 16 8s1.1-2.5 2.5-2.5S21 6.6 21 8z"/></Icon>;
const IconMoon = (p) => <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></Icon>;
const IconWater = (p) => <Icon {...p}><path d="M12 2s-7 7-7 13a7 7 0 0 0 14 0c0-6-7-13-7-13z"/></Icon>;
const IconFire = (p) => <Icon {...p}><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4-1 3 1 4 2 4 0-3 0-5 0-8z"/></Icon>;
const IconSparkle = (p) => <Icon {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M21 5h-4M5 17v4M7 19H3"/></Icon>;
const IconSun = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Icon>;
const IconCoffee = (p) => <Icon {...p}><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 2v3M10 2v3M14 2v3"/></Icon>;

// Appointments
const IconStethoscope = (p) => <Icon {...p}><path d="M11 2v2M5 2v2M5 3h6v6a3 3 0 0 1-6 0z"/><path d="M8 15a7 7 0 0 0 14 0v-6"/><circle cx="20" cy="10" r="2"/></Icon>;
const IconMapPin = (p) => <Icon {...p}><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></Icon>;
const IconVideo = (p) => <Icon {...p}><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconFilter = (p) => <Icon {...p}><path d="M4 4h16l-6 8v6l-4 2v-8z"/></Icon>;

// Chat
const IconRobot = (p) => <Icon {...p}><rect x="4" y="7" width="16" height="12" rx="2"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><path d="M12 3v4M8 19v2M16 19v2"/></Icon>;
const IconSend = (p) => <Icon {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></Icon>;
const IconMic = (p) => <Icon {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></Icon>;
const IconCamera = (p) => <Icon {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></Icon>;
const IconPaperclip = (p) => <Icon {...p}><path d="M21 12.2l-8.5 8.5a6 6 0 0 1-8.5-8.5L12.7 3.5a4 4 0 0 1 5.7 5.7l-8.5 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8"/></Icon>;

// Meds
const IconDroplet = (p) => <Icon {...p}><path d="M12 2s7 7 7 13a7 7 0 0 1-14 0c0-6 7-13 7-13z"/></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="M20 6L9 17l-5-5"/></Icon>;
const IconX = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>;
const IconRefresh = (p) => <Icon {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/></Icon>;
const IconAlert = (p) => <Icon {...p}><path d="M12 2L2 20h20zM12 9v4M12 17v.5"/></Icon>;

// Profile
const IconShield = (p) => <Icon {...p}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></Icon>;
const IconSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>;
const IconLogOut = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></Icon>;
const IconBadge = (p) => <Icon {...p}><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/></Icon>;
const IconTarget = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></Icon>;
const IconLock = (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Icon>;
const IconGlobe = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></Icon>;
const IconHeartPulse = (p) => <Icon {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/><path d="M3 13h3l2-3 3 6 2-4h4"/></Icon>;
const IconMore = (p) => <Icon {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></Icon>;

// Status bar
const StatusIcons = ({ color = "currentColor" }) => (
  <svg width="66" height="13" viewBox="0 0 66 13" fill="none">
    {/* signal */}
    <rect x="0" y="9" width="3" height="4" rx="0.6" fill={color}/>
    <rect x="5" y="6" width="3" height="7" rx="0.6" fill={color}/>
    <rect x="10" y="3" width="3" height="10" rx="0.6" fill={color}/>
    <rect x="15" y="0" width="3" height="13" rx="0.6" fill={color}/>
    {/* wifi */}
    <path d="M30 3c-2 0-4 0.8-5 2M30 5c-1 0-2 0.4-3 1.4M30 8l0 0" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <circle cx="30" cy="10" r="0.9" fill={color}/>
    {/* battery */}
    <rect x="42" y="2" width="20" height="10" rx="2.5" stroke={color} strokeWidth="1" fill="none"/>
    <rect x="44" y="4" width="14" height="6" rx="1" fill={color}/>
    <rect x="63" y="5" width="1.5" height="4" rx="0.5" fill={color}/>
  </svg>
);

Object.assign(window, {
  Icon,
  IconHome, IconCalendar, IconChat, IconPill, IconUser,
  IconBell, IconSearch, IconPlus, IconChevronRight, IconChevronLeft, IconChevronDown,
  IconHeart, IconActivity, IconFootprints, IconMoon, IconWater, IconFire, IconSparkle,
  IconSun, IconCoffee,
  IconStethoscope, IconMapPin, IconVideo, IconClock, IconFilter,
  IconRobot, IconSend, IconMic, IconCamera, IconPaperclip,
  IconDroplet, IconCheck, IconX, IconRefresh, IconAlert,
  IconShield, IconSettings, IconLogOut, IconBadge, IconTarget, IconLock, IconGlobe,
  IconHeartPulse, IconMore,
  StatusIcons,
});
