import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AppShell from './AppShell';
import { notificationsAPI, NOTIFICATIONS_CHANGED } from '../services/jobApplicationsApi';

// The unread count beside My Applications.
//
// A shortlisted candidate was told by a notification they only saw once
// they opened My Applications - which is the page the notification was
// pointing them at. The badge puts the count where they already are.
//
// It reuses the existing unread-count endpoint. There is no store, no
// interval and no second source of truth: whoever marks a notification
// read says so, and the badge re-reads from the server.

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

jest.mock('./ThemeToggle', () => ({ __esModule: true, default: () => null }));
jest.mock('./PageSearch', () => ({ __esModule: true, default: () => null }));
jest.mock('./BrandLogo', () => ({ __esModule: true, default: () => null }));

jest.mock('../services/jobApplicationsApi', () => ({
  notificationsAPI: { unreadCount: jest.fn() },
  NOTIFICATIONS_CHANGED: 'vynterva:notifications-changed',
}));

const CANDIDATE = { name: 'Cara', email: 'cara@example.com', role: 'candidate' };
const RECRUITER = { name: 'Rita', email: 'rita@example.com', role: 'recruiter', approvalStatus: 'approved' };

let container;
let root;

const render = async (user, unread = 0) => {
  notificationsAPI.unreadCount.mockResolvedValue({ unread });

  await act(async () => {
    root.render(<AppShell user={user} onLogout={() => {}}><p>page</p></AppShell>);
  });
};

// The sidebar renders twice - once fixed, once inside the mobile
// drawer - so the badge is expected more than once.
const badges = () =>
  [...container.querySelectorAll('.shell-nav-badge')].map((b) => b.textContent);

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

test('an unread announcement shows a count beside My Applications', async () => {
  await render(CANDIDATE, 3);

  expect(badges()).toContain('3');
});

test('the count sits on the applications entry, not on another page', async () => {
  await render(CANDIDATE, 1);

  const badged = [...container.querySelectorAll('.shell-nav-link')]
    .filter((link) => link.querySelector('.shell-nav-badge'))
    .map((link) => link.textContent);

  expect(badged.length).toBeGreaterThan(0);
  badged.forEach((text) => expect(text).toContain('My Applications'));
});

test('nothing is read out as a bare number', async () => {
  await render(CANDIDATE, 2);

  // The pill itself is hidden from screen readers; the words beside it
  // are what gets announced.
  expect(container.querySelector('.shell-nav-badge').getAttribute('aria-hidden')).toBe('true');
  expect(container.textContent).toContain('2 unread updates');
});

test('one unread update is announced in the singular', async () => {
  await render(CANDIDATE, 1);

  expect(container.textContent).toContain('1 unread update');
  expect(container.textContent).not.toContain('1 unread updates');
});

test('no badge when there is nothing unread', async () => {
  await render(CANDIDATE, 0);

  expect(badges()).toHaveLength(0);
});

test('a large count is shortened rather than widening the sidebar', async () => {
  await render(CANDIDATE, 42);

  expect(badges()).toContain('9+');
  // The real number is still what gets announced.
  expect(container.textContent).toContain('42 unread updates');
});

test('the badge clears when a notification is marked read', async () => {
  await render(CANDIDATE, 1);
  expect(badges()).toContain('1');

  notificationsAPI.unreadCount.mockResolvedValue({ unread: 0 });

  await act(async () => {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  });

  expect(badges()).toHaveLength(0);
});

test('a recruiter has no applications page, so nothing is counted', async () => {
  await render(RECRUITER, 5);

  expect(badges()).toHaveLength(0);
  // And no pointless request on their behalf.
  expect(notificationsAPI.unreadCount).not.toHaveBeenCalled();
});

test('a notifications outage leaves the navigation working', async () => {
  notificationsAPI.unreadCount.mockRejectedValue(new Error('down'));

  await act(async () => {
    root.render(<AppShell user={CANDIDATE} onLogout={() => {}}><p>page</p></AppShell>);
  });

  expect(badges()).toHaveLength(0);
  // Every destination is still there.
  expect(container.textContent).toContain('My Applications');
  expect(container.textContent).toContain('CV Analysis');
});
