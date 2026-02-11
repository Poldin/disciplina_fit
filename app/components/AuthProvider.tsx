"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none" | "loading";

/** Stato abbonamento con dettagli per UX (scadenza/valido fino al) */
export type SubscriptionInfo = {
  status: SubscriptionStatus;
  /** data ISO in cui l'abbonamento scade (o diventa effettiva la cancellazione) - usata per mostrare "valido fino al..." */
  closingDate: string | null;
  /** true se l'utente ha accesso alle discipline (active, trialing, past_due) */
  hasAccess: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  subscription: SubscriptionStatus;
  /** Dettagli abbonamento per messaggi UI (cancellazione richiesta, data X) */
  subscriptionInfo: SubscriptionInfo | null;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  subscription: "loading",
  subscriptionInfo: null,
  signOut: async () => {},
  refreshSubscription: async () => {},
});

const ACCESS_STATUSES: SubscriptionStatus[] = ["active", "past_due", "trialing"];

function buildSubscriptionInfo(
  data: { status: string; closing_date: string | null } | null
): SubscriptionInfo {
  if (!data) {
    return { status: "none", closingDate: null, hasAccess: false };
  }
  const status = data.status as SubscriptionStatus;
  const hasAccess = ACCESS_STATUSES.includes(status);
  return {
    status,
    closingDate: data.closing_date,
    hasAccess,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus>("loading");
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const supabase = createClient();

  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      // Recupera la subscription più recente (qualsiasi stato) per avere tutti i dettagli
      const { data } = await supabase
        .from("subscriptions")
        .select("status, closing_date")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const info = buildSubscriptionInfo(data);
      setSubscription(info.status);
      setSubscriptionInfo(info);
    } catch {
      setSubscription("none");
      setSubscriptionInfo(buildSubscriptionInfo(null));
    }
  }, [supabase]);

  const refreshSubscription = useCallback(async () => {
    if (user) {
      await fetchSubscription(user.id);
    }
  }, [user, fetchSubscription]);

  useEffect(() => {
    // Recupera sessione iniziale
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchSubscription(user.id);
      } else {
        setSubscription("none");
        setSubscriptionInfo(buildSubscriptionInfo(null));
      }
      setLoading(false);
    });

    // Ascolta i cambiamenti di autenticazione
    const {
      data: { subscription: authSub },
    } =     supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        fetchSubscription(newUser.id);
      } else {
        setSubscription("none");
        setSubscriptionInfo(buildSubscriptionInfo(null));
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [supabase, fetchSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubscription("none");
    setSubscriptionInfo(buildSubscriptionInfo(null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, subscription, subscriptionInfo, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
