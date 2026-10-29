import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ChevronDown } from 'lucide-react';

import ThemeToggle from './ThemeToggle';
import PageSearch from './PageSearch';
import BrandLogo from './BrandLogo';
import { navigationFor, activeNavPath } from '../constants/navigation';
import { homePathFor } from '../constants/accounts';

/**
 * The signed-in workspace: a left sidebar of pages, a slim bar above
 * the content, and the page itself.
 *
 * <p>Public screens keep the original top navigation. The split is
 * deliberate: a visitor has three destinations and a sales argument to
 * read, while a signed-in account has a fixed set of places it returns
 * to repeatedly, which is what a persistent sidebar is for.
 *
 * <p>Routing, guards and page state live in App.jsx. This component
 * draws the frame around whatever App renders and owns nothing but the
 * drawer and menu open/closed flags, so changing the layout cannot
 * disturb an interview in progress.
 */
export default function AppShell({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const drawerRef = useRef(null);
  const drawerToggleRef = useRef(null);

  const navItems = navigationFor(user);
  const activePath = activeNavPath(navItems, location.pathname);
  const activeItem = navItems.find((item) => item.path === activePath);

  // Close transient UI when the page changes, so a drawer left open on
  // a phone does not cover the screen that was just opened.
  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Escape closes whichever layer is open, and focus goes back to the
  // control that opened it rather than to the top of the document.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      if (drawerOpen) {
        setDrawerOpen(false);
        drawerToggleRef.current?.focus();
      }

      setAccountOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // "Inside the account menu?" is asked of the clicked element itself,
  // not of a stored node. The account block is rendered twice - once
  // in the sidebar, once in the drawer - so a single ref can only ever
  // point at the second of them. It used to, and clicking Sign out in
  // the sidebar counted as a click outside: the menu closed on
  // mousedown and the button was gone before its click could fire.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (!event.target.closest?.('.shell-account')) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // The drawer is a dialog over the page on small screens, so Tab has
  // to stay inside it: behind it the page is inert to the eye, and a
  // keyboard that wanders out of it has nothing to show for it.
  useEffect(() => {
    if (!drawerOpen) return undefined;

    const drawer = drawerRef.current;
    if (!drawer) return undefined;

    const focusables = () =>
      Array.from(
        drawer.querySelectorAll(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

    focusables()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    drawer.addEventListener('keydown', onKeyDown);
    return () => drawer.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const goHome = useCallback(() => navigate(homePathFor(user)), [navigate, user]);

  // The wordmark is real text rather than part of the image: the
  // lockup's own wordmark is white and would disappear on the light
  // theme, while text takes its colour from the theme like everything
  // else. The mark is pure artwork, so it carries across both.
  const brand = (
    <button type="button" className="shell-brand" onClick={goHome}>
      <BrandLogo variant="mark" alt="" className="shell-brand-mark" />
      <span className="shell-brand-name">
        VYNTERVA<span className="shell-brand-accent"> AI</span>
      </span>
    </button>
  );

  const navList = (
    <ul className="shell-nav-list">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.path === activePath;

        return (
          <li key={item.path}>
            <button
              type="button"
              className={`shell-nav-link ${active ? 'shell-nav-link--active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" className="shell-nav-icon" />
              <span>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const accountBlock = (
    <div className="shell-account">
      <button
        type="button"
        className="shell-account-trigger"
        onClick={() => setAccountOpen((open) => !open)}
        aria-expanded={accountOpen}
        aria-haspopup="menu"
      >
        <span className="shell-avatar" aria-hidden="true">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </span>
        <span className="shell-account-text">
          <span className="shell-account-name">{user?.name || 'Account'}</span>
          <span className="shell-account-role">{roleLabel(user)}</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shell-account-chevron ${accountOpen ? 'shell-account-chevron--open' : ''}`}
        />
      </button>

      {accountOpen && (
        <div className="shell-account-menu" role="menu" aria-label="Account">
          <div className="shell-account-menu-head">
            <div className="shell-account-menu-name">{user?.name}</div>
            <div className="shell-account-menu-email">{user?.email}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            className="shell-account-menu-item shell-account-menu-item--danger"
            onClick={() => {
              setAccountOpen(false);
              onLogout();
            }}
          >
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="shell">
      {/* Desktop sidebar. Hidden below the drawer breakpoint, where
          the same navigation is rendered inside the drawer instead. */}
      <nav className="shell-sidebar" aria-label="Main navigation">
        <div className="shell-sidebar-head">{brand}</div>
        <div className="shell-sidebar-nav">{navList}</div>
        <div className="shell-sidebar-foot">{accountBlock}</div>
      </nav>

      {drawerOpen && (
        <div
          className="shell-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`shell-drawer ${drawerOpen ? 'shell-drawer--open' : ''}`}
        ref={drawerRef}
        id="shell-drawer"
        aria-label="Main navigation"
        aria-hidden={!drawerOpen}
        // Kept out of the tab order entirely while shut, so a closed
        // drawer is not a run of invisible stops before the page.
        inert={drawerOpen ? undefined : ''}
      >
        <div className="shell-drawer-head">
          {brand}
          <button
            type="button"
            className="shell-icon-btn"
            onClick={() => {
              setDrawerOpen(false);
              drawerToggleRef.current?.focus();
            }}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="shell-drawer-nav">{navList}</div>
        <div className="shell-drawer-foot">{accountBlock}</div>
      </nav>

      <div className="shell-main">
        <header className="shell-topbar">
          <button
            type="button"
            className="shell-icon-btn shell-drawer-toggle"
            ref={drawerToggleRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="shell-drawer"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <h1 className="shell-page-title">{activeItem?.label || pageTitleFor(location.pathname)}</h1>

          <div className="shell-topbar-actions">
            <PageSearch navItems={navItems} />
            <ThemeToggle />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

/**
 * Routes whose page draws its own full-width surface, so the shell
 * must not add the padding it gives ordinary pages.
 *
 * <p>Empty today: every page sits on the standard padded canvas. Kept
 * because a full-bleed screen is a recurring request and this is the
 * one place that decides it.
 */
export const BLEED_ROUTES = [];

function roleLabel(user) {
  if (!user) return '';
  if (user.role === 'admin') return 'Administrator';
  if (user.role === 'recruiter') {
    return user.approvalStatus === 'approved' ? 'Recruiter' : 'Recruiter (pending)';
  }
  return 'Candidate';
}

/**
 * A heading for pages that are reached through a workflow rather than
 * the sidebar, so the bar never sits empty on them.
 */
function pageTitleFor(pathname) {
  if (pathname.startsWith('/skill-gap')) return 'Skill Gap';
  if (pathname.startsWith('/interview')) return 'Interview';
  if (pathname.startsWith('/design-system')) return 'Design System';
  return 'Workspace';
}
