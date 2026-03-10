import { createContext, useContext, useState, useCallback } from "react";
import { getCart } from "../api";

const CartContext = createContext(null);

const DISCOVERY_LOCATION_KEY = "deliveryDiscoveryLocation";

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async (userId, restaurantId) => {
    if (!userId) {
      setCartCount(0);
      return;
    }
    try {
      const cart = await getCart(userId, restaurantId);
      const total = (cart?.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
      setCartCount(total);
    } catch {
      setCartCount(0);
    }
  }, []);

  const setCartCountFromCart = useCallback((cart) => {
    const total = (cart?.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
    setCartCount(total);
  }, []);

  const setDiscoveryLocation = useCallback((lat, lng) => {
    if (lat != null && lng != null) {
      sessionStorage.setItem(DISCOVERY_LOCATION_KEY, JSON.stringify({ lat: Number(lat), lng: Number(lng) }));
    }
  }, []);

  const getDiscoveryLocation = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(DISCOVERY_LOCATION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartCount,
        setCartCount,
        refreshCartCount,
        setCartCountFromCart,
        setDiscoveryLocation,
        getDiscoveryLocation,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
