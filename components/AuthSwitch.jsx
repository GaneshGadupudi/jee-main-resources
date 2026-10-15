"use client";

import { useEffect, useState } from "react";

// Renders `guest` for logged-out visitors and `member` for logged-in users (nothing until auth is known).
export default function AuthSwitch({ guest, member }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    fetch("/api/auth/session").then((response) => response.json()).then((data) => setUser(data.user || null)).catch(() => setUser(null));
  }, []);
  if (user === undefined) return null;
  return user ? member : guest;
}
