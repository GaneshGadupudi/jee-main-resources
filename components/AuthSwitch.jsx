"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// Renders `guest` for logged-out visitors and `member` for logged-in users (nothing until auth is known).
export default function AuthSwitch({ guest, member }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null)).catch(() => setUser(null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (user === undefined) return null;
  return user ? member : guest;
}
