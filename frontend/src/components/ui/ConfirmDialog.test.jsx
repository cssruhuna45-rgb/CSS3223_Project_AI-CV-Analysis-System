import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import ConfirmDialog from './ConfirmDialog';

let container;
let root;
let onConfirm;
let onCancel;

const render = (props = {}) => act(() => root.render(
  <ConfirmDialog open title="Approve these questions?" confirmLabel="Approve"
    onConfirm={onConfirm} onCancel={onCancel} {...props}>
    <p>They cannot be changed afterwards.</p>
  </ConfirmDialog>,
));

const button = (label) => [...container.querySelectorAll('button')].find((b) => b.textContent === label);

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  onConfirm = jest.fn();
  onCancel = jest.fn();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test('renders nothing while closed', () => {
  render({ open: false });
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

test('shows the title and message as a labelled modal dialog', () => {
  render();
  const dialog = container.querySelector('[role="dialog"]');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent)
    .toBe('Approve these questions?');
  expect(dialog.textContent).toContain('They cannot be changed afterwards.');
});

test('focus starts on Cancel so Enter never confirms by accident', () => {
  render();
  expect(document.activeElement).toBe(button('Cancel'));
});

test('the confirm and cancel buttons call their handlers', () => {
  render();
  act(() => Simulate.click(button('Approve')));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  act(() => Simulate.click(button('Cancel')));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('Escape and a click on the backdrop cancel', () => {
  render();
  act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
  act(() => Simulate.click(container.querySelector('[role="dialog"]')));
  expect(onCancel).toHaveBeenCalledTimes(2);
  expect(onConfirm).not.toHaveBeenCalled();
});

test('cannot be dismissed while busy', () => {
  render({ busy: true });
  act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
  act(() => Simulate.click(container.querySelector('[role="dialog"]')));
  expect(onCancel).not.toHaveBeenCalled();
});
