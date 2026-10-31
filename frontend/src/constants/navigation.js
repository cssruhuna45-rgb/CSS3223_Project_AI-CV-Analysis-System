// The workspace navigation, in one place.
//
// The sidebar and the topbar search both read this list, so a
// destination can never appear in one and be missing from the other,
// and neither can offer a page the signed-in account is not allowed
// to open.
//
// Every entry here is a route that already exists in App.jsx. Some
// candidate routes are deliberately absent:
//
//   /skill-gap and /interview are reached through the StepBar once
//   their prerequisites are met. Listing them as ordinary links would
//   invite people to open an interview with no CV analysed behind it,
//   which the page then has to refuse.
//
//   /apply/:code needs an invite code, so it is reached from the invite
//   link or from Apply for a Job. A bare link to it could not work.
//
// Keep this in step with the route table in App.jsx and the guards in
// constants/accounts.js.

import {
  Home,
  FileText,
  TrendingUp,
  Award,
  Ticket,
  LayoutDashboard,
  Briefcase,
  ShieldCheck,
  Clock,
  Send,
  Users,
  BarChart3,
} from 'lucide-react';

import { isApprovedRecruiter } from './accounts';

const CANDIDATE_NAV = [
  {
    path: '/home',
    label: 'Home',
    icon: Home,
    description: 'Start here: analyse a CV or begin an interview',
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Your workspace, latest CV and recent results',
  },
  {
    path: '/upload',
    label: 'CV Analysis',
    icon: FileText,
    description: 'Upload a CV and review the extracted profile',
  },
  {
    path: '/progress',
    label: 'My Progress',
    icon: TrendingUp,
    description: 'Score trend and interview history',
  },
  {
    path: '/scorecard',
    label: 'Scorecards',
    icon: Award,
    description: 'Completed interview evaluations',
  },
  {
    path: '/applications',
    label: 'My Applications',
    icon: Send,
    description: 'Jobs you applied for and what the recruiter decided',
  },
  {
    path: '/join',
    label: 'Apply for a Job',
    icon: Ticket,
    description: 'Open a recruiter invitation code',
  },
];

const RECRUITER_NAV = [
  {
    path: '/recruiter',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Candidates who interviewed for your jobs',
  },
  {
    path: '/jobs',
    label: 'Jobs',
    icon: Briefcase,
    description: 'Create jobs and copy invitation links',
  },
  {
    path: '/applicants',
    label: 'Applicants',
    icon: Users,
    description: 'Review who applied and shortlist or reject them',
  },
  {
    path: '/comparison',
    label: 'Compare Results',
    icon: BarChart3,
    description: 'Completed assessments for one job, side by side',
  },
];

// A recruiter waiting on - or refused - approval has exactly one page.
// Showing the dashboard here would be a link straight to a redirect.
const PENDING_NAV = [
  {
    path: '/pending',
    label: 'Account Status',
    icon: Clock,
    description: 'Your recruiter approval status',
  },
];

const ADMIN_NAV = [
  {
    path: '/admin',
    label: 'Administration',
    icon: ShieldCheck,
    description: 'Approve, reject or revoke recruiter accounts',
  },
];

/**
 * The pages this account may open, in sidebar order.
 *
 * Mirrors ProtectedRoute: candidate pages for candidates, recruiter
 * pages only once approved, the waiting page while not, administration
 * for administrators. A signed-out visitor gets nothing - the public
 * pages keep their own header.
 */
export function navigationFor(user) {
  if (!user) return [];
  if (user.role === 'admin') return ADMIN_NAV;
  if (user.role === 'recruiter') {
    return isApprovedRecruiter(user) ? RECRUITER_NAV : PENDING_NAV;
  }
  return CANDIDATE_NAV;
}

/**
 * Which navigation entry the current URL belongs to.
 *
 * Matched longest-first so /join/ABC123 marks Join Interview rather
 * than falling through to nothing, while /home does not light up for
 * every path that happens to begin with a slash.
 */
export function activeNavPath(navItems, pathname) {
  const match = [...navItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));

  return match ? match.path : null;
}

/**
 * Page search: a plain substring match over the labels and
 * descriptions of pages this account can already reach.
 *
 * Deliberately local. There is no search endpoint behind this, and it
 * must not imply one: it moves between screens, it does not look
 * inside CVs or candidate records.
 */
export function searchNavigation(navItems, query) {
  const term = query.trim().toLowerCase();

  if (!term) return navItems;

  return navItems.filter((item) =>
    item.label.toLowerCase().includes(term) ||
    item.description.toLowerCase().includes(term) ||
    item.path.toLowerCase().includes(term)
  );
}
