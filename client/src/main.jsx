import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router";
import "toastify-js/src/toastify.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";
import { store } from "./store";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const content = (
  <Provider store={store}>
    <ThemeProvider>
      <BrowserRouter><App /></BrowserRouter>
    </ThemeProvider>
  </Provider>
);

createRoot(document.getElementById("root")).render(
  <StrictMode>{clientId ? <GoogleOAuthProvider clientId={clientId}>{content}</GoogleOAuthProvider> : content}</StrictMode>,
);
