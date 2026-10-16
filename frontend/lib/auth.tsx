"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CLERK_ENABLED } from "@/lib/auth-config";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  orgName?: string;
  role?: string;
}

export interface AuthBridgeValue {
  enabled: boolean;
  isSignedIn: boolean;
  user: UserProfile | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  signInLocally?: (user: UserProfile) => void;
}

const noAuth: AuthBridgeValue = {
  enabled: false,
  isSignedIn: false,
  user: null,
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
      user: clerk.user
        ? {
            id: clerk.user.id,
            name: clerk.user.fullName || clerk.user.primaryEmailAddress?.emailAddress.split("@")[0] || "User",
            email: clerk.user.primaryEmailAddress?.emailAddress || "",
            role: "admin",
          }
        : null,
      getToken: () => getToken(),
      signOut: () => clerk.signOut({ redirectUrl: "/" }),
    }),
    [getToken, isSignedIn, clerk],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocalAuthBridge({ children }: { children: ReactNode }) {
  const [localUser, setLocalUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("invarix_local_user");
      if (stored) {
        setLocalUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthBridgeValue>(() => {
    const isSignedIn = !!localUser;
    return {
      enabled: true,
      isSignedIn,
      user: localUser,
      getToken: async () => (localUser ? `local_jwt_${localUser.id}` : null),
      signOut: async () => {
        try {
          localStorage.removeItem("invarix_local_user");
          setLocalUser(null);
        } catch {
          // ignore
        }
        window.location.assign("/");
      },
      signInLocally: (user: UserProfile) => {
        try {
          localStorage.setItem("invarix_local_user", JSON.stringify(user));
          setLocalUser(user);
        } catch {
          // ignore
        }
      },
    };
  }, [localUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthBridge({ children }: { children: ReactNode }) {
  return CLERK_ENABLED ? <ClerkBridge>{children}</ClerkBridge> : <LocalAuthBridge>{children}</LocalAuthBridge>;
}

export const useAuthBridge = () => useContext(AuthContext);
