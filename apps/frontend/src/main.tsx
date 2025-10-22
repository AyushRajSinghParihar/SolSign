import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { WalletContextProvider } from "./providers/WalletContextProvider.tsx";
import { TRPCProvider } from "./providers/TRPCProvider.tsx";

// Log environment configuration on startup
console.log('🚀 SolSign Frontend Initializing...');
console.log('📍 Environment Configuration:', {
  apiUrl: import.meta.env.VITE_API_URL || '❌ NOT SET',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '❌ NOT SET',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ NOT SET',
  mode: import.meta.env.MODE,
  origin: window.location.origin,
  userAgent: navigator.userAgent,
});

// Warn about missing configuration
if (!import.meta.env.VITE_API_URL) {
  console.error('⚠️ VITE_API_URL is not configured! Backend calls will fail.');
}
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error('⚠️ VITE_SUPABASE_URL is not configured! Supabase calls will fail.');
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('⚠️ VITE_SUPABASE_ANON_KEY is not configured! Supabase calls will fail.');
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletContextProvider>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </WalletContextProvider>
  </React.StrictMode>
);
