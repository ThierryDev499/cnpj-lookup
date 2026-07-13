import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CnpjPage } from "./cnpj/CnpjPage";
import "./cnpj.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <CnpjPage />
  </StrictMode>,
);
