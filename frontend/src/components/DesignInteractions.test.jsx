import React, { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import BrandLogo from './BrandLogo';
import StepBar from './StepBar';
import Navbar from './Navbar';
import Landing from '../pages/Landing';
import useScrollReveal from '../hooks/useScrollReveal';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));

let container;
let root;
let originalObserver;
let originalMatchMedia;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  originalObserver = global.IntersectionObserver;
  originalMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn(() => ({ matches: false }));
  sessionStorage.clear();
  mockNavigate.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  global.IntersectionObserver = originalObserver;
  window.matchMedia = originalMatchMedia;
  jest.useRealTimers();
});

test('workflow steps remain locked until the existing prerequisites are present', () => {
  act(() => root.render(<StepBar current={1} />));
  const buttons = [...container.querySelectorAll('button')];
  expect(buttons[1].disabled).toBe(true);
  expect(buttons[2].disabled).toBe(true);
  act(() => buttons[1].click());
  expect(mockNavigate).not.toHaveBeenCalled();

  sessionStorage.setItem('resumeAnalysis', '{}');
  sessionStorage.setItem('selectedJobField', 'software_engineering');
  act(() => root.render(<StepBar current={1} />));
  expect(container.querySelectorAll('button')[1].disabled).toBe(false);
  act(() => container.querySelectorAll('button')[1].click());
  expect(mockNavigate).toHaveBeenCalledWith('/skill-gap');
  expect(container.querySelectorAll('button')[2].disabled).toBe(true);
});

test('public mobile navigation opens, exposes sign in, and closes on a second click', () => {
  act(() => root.render(<Navbar user={null} onLogout={jest.fn()} />));
  const toggle = container.querySelector('.nav-mobile-toggle');
  act(() => toggle.click());
  expect(container.querySelector('#mobile-nav-menu').textContent).toContain('Sign In');
  act(() => {
    toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    toggle.click();
  });
  expect(container.querySelector('#mobile-nav-menu')).toBeNull();
});

test.each([
  [null, '/register'],
  [{ role: 'candidate' }, '/upload'],
  [{ role: 'recruiter', approvalStatus: 'pending' }, '/pending'],
  [{ role: 'recruiter', approvalStatus: 'approved' }, '/recruiter'],
  [{ role: 'admin' }, '/admin'],
])('the landing primary action preserves the account destination: %j', (user, path) => {
  act(() => root.render(<Landing user={user} />));
  expect(container.querySelector('.landing-hero-actions a').getAttribute('href')).toBe(path);
  expect(container.querySelector('figure').getAttribute('aria-label')).toContain('Illustrative');
});

function RevealExample() {
  const ref = useRef(null);
  useScrollReveal(ref);
  return <div ref={ref}><section className="subreveal"><button>Continue</button></section></div>;
}

test('missing observer support leaves reveal content accessible and visible', () => {
  delete global.IntersectionObserver;
  act(() => root.render(<RevealExample />));
  expect(container.querySelector('.subreveal').classList.contains('subreveal--visible')).toBe(true);
  expect(container.querySelector('.reveal-pending')).toBeNull();
});

test('an observer construction failure leaves content visible', () => {
  global.IntersectionObserver = jest.fn(() => { throw new Error('Observer unavailable'); });
  act(() => root.render(<RevealExample />));
  expect(container.querySelector('.subreveal').classList.contains('subreveal--visible')).toBe(true);
  expect(container.querySelector('.reveal-pending')).toBeNull();
});

test('keyboard focus reveals an offscreen section without waiting for scrolling', () => {
  const unobserve = jest.fn();
  const disconnect = jest.fn();
  global.IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), unobserve, disconnect }));
  const bounds = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 2000, bottom: 2200 });
  act(() => root.render(<RevealExample />));
  expect(container.querySelector('.reveal-pending')).not.toBeNull();
  act(() => container.querySelector('button').focus());
  expect(container.querySelector('.reveal-pending')).toBeNull();
  expect(unobserve).toHaveBeenCalled();
  bounds.mockRestore();
});

test('reduced motion keeps content immediately visible and the brand static', () => {
  jest.useFakeTimers();
  window.matchMedia = jest.fn(() => ({ matches: true }));
  act(() => root.render(<><BrandLogo /><RevealExample /></>));
  act(() => jest.advanceTimersByTime(2000));
  expect(container.querySelector('.brand-logo--shining')).toBeNull();
  expect(container.querySelector('.reveal-pending')).toBeNull();
});

test('logo shine ends once and has a cooldown on keyboard replay', () => {
  jest.useFakeTimers();
  act(() => root.render(<button><BrandLogo alt="" /></button>));
  act(() => jest.advanceTimersByTime(700));
  expect(container.querySelector('.brand-logo--shining')).not.toBeNull();
  act(() => jest.advanceTimersByTime(1100));
  expect(container.querySelector('.brand-logo--shining')).toBeNull();
  act(() => container.querySelector('button').focus());
  expect(container.querySelector('.brand-logo--shining')).toBeNull();
  act(() => jest.advanceTimersByTime(6000));
  act(() => { container.querySelector('button').blur(); container.querySelector('button').focus(); });
  expect(container.querySelector('.brand-logo--shining')).not.toBeNull();
});

test('interview branding opts out of decorative animation', () => {
  jest.useFakeTimers();
  act(() => root.render(<BrandLogo shine={false} />));
  act(() => jest.advanceTimersByTime(10000));
  expect(container.querySelector('.brand-logo--shining')).toBeNull();
});
