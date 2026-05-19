"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ─── Types ──────────────────────────────────────────────────────

export interface CibilFlagState {
  /** Whether the farmer has an adverse CIBIL flag */
  cibilFlag: boolean;
  /** Overdue amount in INR (only meaningful when cibilFlag=true) */
  overdueInr: number | null;
  /** Name of the issuing institution (e.g. "SBI") */
  issuer: string | null;
  /**
   * Whether the banker has acknowledged the CIBIL flag via the
   * confirmation dialog checkbox. Set by C12's approve dialog.
   */
  acknowledged: boolean;
  /** Callback to set acknowledged state */
  setAcknowledged: (v: boolean) => void;
}

// ─── Context ────────────────────────────────────────────────────

const CibilFlagContext = createContext<CibilFlagState>({
  cibilFlag: false,
  overdueInr: null,
  issuer: null,
  acknowledged: false,
  setAcknowledged: () => {},
});

// ─── Provider ───────────────────────────────────────────────────

interface CibilFlagProviderProps {
  cibilFlag: boolean;
  overdueInr?: number | null;
  issuer?: string | null;
  children: ReactNode;
}

export function CibilFlagProvider({
  cibilFlag,
  overdueInr = null,
  issuer = null,
  children,
}: CibilFlagProviderProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const value = useMemo<CibilFlagState>(
    () => ({
      cibilFlag,
      overdueInr: overdueInr ?? null,
      issuer: issuer ?? null,
      acknowledged,
      setAcknowledged,
    }),
    [cibilFlag, overdueInr, issuer, acknowledged],
  );

  return (
    <CibilFlagContext.Provider value={value}>
      {children}
    </CibilFlagContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────

export function useCibilFlag(): CibilFlagState {
  return useContext(CibilFlagContext);
}

export default CibilFlagContext;
