import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LocaleProvider } from './context/LocaleContext';
import { SettingsProvider } from './context/SettingsContext';
import { BoardProvider } from './context/BoardContext';
// FIX: Add NavigationProvider to wrap the App component
import { NavigationProvider } from './context/NavigationContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <LocaleProvider>
      <SettingsProvider>
        <AuthProvider>
          <BoardProvider>
            <NavigationProvider>
              <App />
            </NavigationProvider>
          </BoardProvider>
        </AuthProvider>
      </SettingsProvider>
    </LocaleProvider>
  </React.StrictMode>
);