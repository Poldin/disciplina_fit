"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

type SubscriptionStatus = "active" | "canceled" | "past_due" | "none" | "loading";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  subscription: SubscriptionStatus;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  subscription: "loading",
  signOut: async () => {},
  refreshSubscription: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus>("loading");
  const supabase = createClient();

  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .in("status", ["active", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setSubscription((data?.status as SubscriptionStatus) || "none");
    } catch {
      setSubscription("none");
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
      }
      setLoading(false);
    });

    // Ascolta i cambiamenti di autenticazione
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        fetchSubscription(newUser.id);
      } else {
        setSubscription("none");
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [supabase, fetchSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubscription("none");
  };

  return (
    <AuthContext.Provider value={{ user, loading, subscription, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
