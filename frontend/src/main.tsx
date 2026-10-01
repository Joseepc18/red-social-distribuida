import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/plus-jakarta-sans";
import "./styles/foundation.css";
import "./styles/tokens.css";
import "./styles/application.css";
import "./styles/people.css";
import { ThemeProvider } from "./context/ThemeProvider";
import { App } from "./App";
import { AuthProvider } from "./context/AuthProvider";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
