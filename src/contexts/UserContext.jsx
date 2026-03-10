import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUser } from "../api";

const UserContext = createContext(null);

const DEFAULT_USER_ID = "000000000000000000000001";

const ROLE_LABELS = {
  customer: "Customer",
  admin: "Admin",
  restaurant_admin: "Restaurant Admin",
  restaurant_owner: "Restaurant Owner",
  delivery_driver: "Delivery Driver",
};

export function UserProvider({ children }) {
  const [userId, setUserIdRaw] = useState(
    () => localStorage.getItem("demoUserId") || DEFAULT_USER_ID
  );
  const [activeUser, setActiveUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const setUserId = useCallback((id) => {
    setUserIdRaw(id);
    localStorage.setItem("demoUserId", id);
  }, []);

  useEffect(() => {
    if (!userId || userId.length < 24) {
      setActiveUser(null);
      return;
    }

    let cancelled = false;
    setLoadingUser(true);
    getUser(userId)
      .then((u) => {
        if (!cancelled) setActiveUser(u);
      })
      .catch(() => {
        if (!cancelled) setActiveUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  return (
    <UserContext.Provider
      value={{ userId, setUserId, activeUser, loadingUser, ROLE_LABELS }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
