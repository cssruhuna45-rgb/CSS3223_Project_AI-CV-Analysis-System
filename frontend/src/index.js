import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { installPrintTheme } from './utils/print';

installPrintTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
