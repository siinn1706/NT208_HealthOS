import {
  Activity,
  Bell,
  Brain,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  HeartPulse,
  LayoutDashboard,
  Medal,
  MessageCircle,
  Pill,
  Settings,
  Target,
  Trophy,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * Sidebar information architecture grouped by user mental model:
 *   Overview – at-a-glance dashboard
 *   Track    – data the user logs (vitals, meals)
 *   Care     – clinical context (appointments, reminders, risk)
 *   Grow     – goals, achievements, leaderboard, reports
 *   You      – personal account surface (profile, chat, settings)
 *
 * The translation keys map to `dashboard.nav.*` so existing copy stays valid.
 */
export interface NavLink {
  /** translation key under `dashboard.nav.*` */
  key: string;
  icon: LucideIcon;
  /** path WITHOUT locale prefix; locale handled by `@/navigation` Link */
  href: string;
  /** Soft "coming soon" routes still appear but may be styled muted. */
  comingSoon?: boolean;
  /** Show a live unread badge for chat. */
  hasUnreadBadge?: boolean;
}

export interface NavGroup {
  /** translation key under `dashboard.nav.groups.*` */
  key: string;
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "overview",
    links: [{ key: "overview", icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    key: "track",
    links: [
      { key: "nutrition", icon: UtensilsCrossed, href: "/dashboard/meals" },
      { key: "vitalsDevices", icon: Activity, href: "/dashboard/health" },
    ],
  },
  {
    key: "care",
    links: [
      { key: "reminders", icon: Bell, href: "/dashboard/reminders" },
      { key: "medications", icon: Pill, href: "/dashboard/medications" },
      { key: "appointments", icon: ClipboardList, href: "/dashboard/appointments" },
      { key: "visitPrep", icon: ClipboardCheck, href: "/dashboard/visit-prep" },
      { key: "emergencyCard", icon: HeartPulse, href: "/dashboard/emergency-card" },
      { key: "risk", icon: Brain, href: "/dashboard/risk" },
    ],
  },
  {
    key: "grow",
    links: [
      { key: "goals", icon: Target, href: "/dashboard/progress" },
      { key: "achievements", icon: Trophy, href: "/dashboard/achievements" },
      { key: "leaderboard", icon: Medal, href: "/dashboard/leaderboard", comingSoon: true },
      { key: "reports", icon: FileBarChart2, href: "/dashboard/reports" },
    ],
  },
  {
    key: "you",
    links: [
      { key: "profile", icon: User, href: "/dashboard/profile" },
      { key: "chat", icon: MessageCircle, href: "/dashboard/chat", hasUnreadBadge: true },
      { key: "settings", icon: Settings, href: "/dashboard/settings" },
    ],
  },
];

export const ALL_NAV_LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);

/** Mobile bottom-tab subset – kept short to fit common phone widths. */
export const MOBILE_NAV_LINKS: NavLink[] = [
  { key: "overview", icon: LayoutDashboard, href: "/dashboard" },
  { key: "nutrition", icon: UtensilsCrossed, href: "/dashboard/meals" },
  { key: "vitalsDevices", icon: Activity, href: "/dashboard/health" },
  { key: "chat", icon: MessageCircle, href: "/dashboard/chat", hasUnreadBadge: true },
  { key: "profile", icon: User, href: "/dashboard/profile" },
];
