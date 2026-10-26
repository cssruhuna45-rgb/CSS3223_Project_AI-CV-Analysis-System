import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), Link: ({ children }) => <span>{children}</span> }));
import CVUpload from './CVUpload';
import { resumeAPI } from '../services/api';
jest.mock('../services/api', () => ({ resumeAPI: { upload: jest.fn(), getAnalysis: jest.fn(), analyze: jest.fn() }, aiResumeAPI: { feedback: jest.fn() } }));
let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(global, 'crypto', { configurable: true, value: require('crypto').webcrypto });
  sessionStorage.clear(); jest.clearAllMocks();
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<CVUpload />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
function button(text) { return [...container.querySelectorAll('button')].find(b => b.textContent.includes(text)); }
function choose(size) {
  const input = container.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { configurable: true, value: [new File([new Uint8Array(size)], 'sample.pdf', { type: 'application/pdf' })] });
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
}
test('rejects files over the advertised 10 MB limit before uploading', () => {
  choose(10 * 1024 * 1024 + 1);
  expect(container.textContent).toContain('larger than 10 MB');
  expect(resumeAPI.upload).not.toHaveBeenCalled();
});
test('accepts 158 KB and retries failed analysis without another upload', async () => {
  resumeAPI.upload.mockResolvedValue({ id: 7, extractedText: 'Sample candidate experience' });
  resumeAPI.getAnalysis.mockRejectedValue(Object.assign(new Error('Not ready'), { status: 404 }));
  resumeAPI.analyze.mockRejectedValue(new Error('Service temporarily unavailable'));
  choose(158 * 1024);
  await act(async () => button('Analyze Resume').click());
  expect(container.textContent).toContain('Service temporarily unavailable');
  await act(async () => button('Retry').click());
  expect(resumeAPI.upload).toHaveBeenCalledTimes(1);
  expect(resumeAPI.analyze).toHaveBeenCalledTimes(2);
});
test('blocks file changes while uploading and releases them on cancel', async () => {
  resumeAPI.upload.mockImplementation(() => new Promise(() => {}));
  choose(158 * 1024);
  await act(async () => button('Analyze Resume').click());
  expect(container.querySelector('input[type=file]').disabled).toBe(true);
  act(() => button('Cancel').click());
  expect(resumeAPI.upload.mock.calls[0][1].signal.aborted).toBe(true);
  expect(container.querySelector('input[type=file]').disabled).toBe(false);
});
