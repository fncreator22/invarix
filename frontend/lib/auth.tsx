"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { CLERK_ENABLED } from "@/lib/auth-config";


export interface AuthBridgeValue {
  enabled: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const noAuth: AuthBridgeValue = {
  enabled: false,
  isSignedIn: false,
  getToken: async () => null,
  signOut: async () => {
    window.location.assign(window.location.origin);
  },
};

const AuthContext = createContext<AuthBridgeValue>(noAuth);

function ClerkBridge({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const clerk = useClerk();
  const value = useMemo<AuthBridgeValue>(
    () => ({
      enabled: true,
      isSignedIn: !!isSignedIn,
      getToken: () => getToken(),
      signOut: () => clerk.signOut({ redirectUrl: "/" }),
    }),
    [getToken, isSignedIn, clerk],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthBridge({ children }: { children: ReactNode }) {
  return CLERK_ENABLED ? <ClerkBridge>{children}</ClerkBridge> : <>{children}</>;
}

export const useAuthBridge = () => useContext(AuthContext);
