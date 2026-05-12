import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      theme="dark"
      closeButton
      toastOptions={{
        style: {
          background: "#13161A",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#E2E8F0",
          fontFamily: "DM Sans, sans-serif",
        },
      }}
    />
  </React.StrictMode>,
);
