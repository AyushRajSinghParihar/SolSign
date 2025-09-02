import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { WalletContextProvider } from "./providers/WalletContextProvider.tsx";
import { TRPCProvider } from "./providers/TRPCProvider.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletContextProvider>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </WalletContextProvider>
  </React.StrictMode>
);
