import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUser } from "../contexts/UserContext";
import { useCart } from "../contexts/CartContext";
import {
  getCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  createOrder,
} from "../api";
import Map from "../components/Map";

const DEFAULT_COORDS = [-90.5069, 14.5943]; // [lng, lat] GeoJSON

function coordsMatch(a, b, tolerance = 0.0001) {
  if (!a || !b || a.length < 2 || b.length < 2) return false;
  return Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const { getDiscoveryLocation, setCartCountFromCart } = useCart();
  const discovery = getDiscoveryLocation();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    const coords = discovery
      ? [discovery.lng, discovery.lat]
      : DEFAULT_COORDS;
    return {
      street: "6a Avenida 12-34",
      city: "Guatemala",
      zone: "Zona 10",
      coordinates: { type: "Point", coordinates: coords },
    };
  });
  const [paymentMethod, setPaymentMethod] = useState("card");

  const deliveryCoords = deliveryAddress.coordinates?.coordinates || [];
  const discoveryCoords = discovery ? [discovery.lng, discovery.lat] : null;
  const addressMatchesDiscovery =
    !discoveryCoords || coordsMatch(deliveryCoords, discoveryCoords);

  async function loadCart() {
    setLoading(true);
    try {
      const data = await getCart(userId);
      const cartData = data && data.items?.length > 0 ? data : null;
      setCart(cartData);
      setCartCountFromCart(cartData);
    } catch {
      setCart(null);
      setCartCountFromCart(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(menuItemId) {
    try {
      await removeFromCart(menuItemId, userId);
      toast.success("Item removido");
      loadCart();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleQtyChange(menuItemId, qty) {
    try {
      await updateCartItem(menuItemId, { userId, quantity: qty });
      loadCart();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleClear() {
    if (!confirm("Vaciar todo el carrito?")) return;
    try {
      await clearCart(userId);
      setCart(null);
      setCartCountFromCart(null);
      toast.success("Carrito vaciado");
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleCheckout() {
    if (!cart) return;
    setCheckingOut(true);
    try {
      const order = await createOrder({
        userId,
        cartId: cart._id,
        deliveryAddress,
        paymentMethod,
      });
      setCart(null);
      setCartCountFromCart(null);
      toast.success(
        `Pedido ${order.orderNumber} creado — Total: Q${order.total}`
      );
      navigate("/orders");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCheckingOut(false);
    }
  }

  function handleMapClick(latlng) {
    setDeliveryAddress((a) => ({
      ...a,
      coordinates: {
        type: "Point",
        coordinates: [latlng.lng, latlng.lat],
      },
    }));
    toast.success(
      `Dirección: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`
    );
  }

  useEffect(() => {
    if (userId) loadCart();
  }, [userId]);

  if (loading)
    return (
      <div className="text-gray-400 text-center py-12">
        Cargando carrito...
      </div>
    );

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🛒</div>
        <p className="text-gray-500 mb-4">Tu carrito está vacío.</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Explorar restaurantes
        </button>
      </div>
    );
  }

  const subtotal = cart.items.reduce(
    (s, i) => s + (i.subtotal || i.price * i.quantity),
    0
  );
  const tax = subtotal * 0.12;
  const deliveryFee = 15;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          className="btn-secondary btn-sm"
          onClick={() => navigate(-1)}
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold flex-1">Tu carrito</h1>
        <button className="btn-danger btn-sm" onClick={handleClear}>
          Vaciar carrito
        </button>
      </div>

      {/* Items */}
      <div className="card mb-4">
        {cart.items.map((item) => (
          <div
            key={String(item.menuItemId)}
            className="flex items-center gap-3 p-4 border-b last:border-0"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-gray-500">Q{item.price} c/u</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="w-7 h-7 rounded border text-lg flex items-center justify-center hover:bg-gray-50"
                onClick={() =>
                  item.quantity > 1
                    ? handleQtyChange(item.menuItemId, item.quantity - 1)
                    : handleRemove(item.menuItemId)
                }
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-medium">
                {item.quantity}
              </span>
              <button
                className="w-7 h-7 rounded border text-lg flex items-center justify-center hover:bg-gray-50"
                onClick={() =>
                  handleQtyChange(item.menuItemId, item.quantity + 1)
                }
              >
                +
              </button>
            </div>
            <span className="font-semibold text-sm w-16 text-right">
              Q{(item.subtotal || item.price * item.quantity).toFixed(2)}
            </span>
            <button
              className="text-red-400 hover:text-red-600"
              onClick={() => handleRemove(item.menuItemId)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Warning if address differs from discovery */}
      {!addressMatchesDiscovery && discoveryCoords && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          La dirección de entrega no coincide con la ubicación usada al buscar restaurantes. Verifica que el punto en el mapa sea correcto.
        </div>
      )}

      {/* Delivery Address with Map */}
      <div className="card mb-4">
        <div className="p-4 border-b">
          <h2 className="font-semibold mb-1">Dirección de entrega</h2>
          <p className="text-xs text-gray-500">
            Haz clic en el mapa para seleccionar el punto de entrega.
          </p>
        </div>

        <Map
          deliveryPoint={deliveryAddress.coordinates.coordinates}
          onMapClick={handleMapClick}
          height="280px"
        />

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input col-span-2"
              placeholder="Calle"
              value={deliveryAddress.street}
              onChange={(e) =>
                setDeliveryAddress((a) => ({ ...a, street: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Ciudad"
              value={deliveryAddress.city}
              onChange={(e) =>
                setDeliveryAddress((a) => ({ ...a, city: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Zona"
              value={deliveryAddress.zone}
              onChange={(e) =>
                setDeliveryAddress((a) => ({ ...a, zone: e.target.value }))
              }
            />
            <div>
              <label className="text-xs text-gray-500">Latitud</label>
              <input
                className="input"
                type="number"
                step="any"
                value={deliveryAddress.coordinates.coordinates[1]}
                onChange={(e) =>
                  setDeliveryAddress((a) => ({
                    ...a,
                    coordinates: {
                      type: "Point",
                      coordinates: [
                        a.coordinates.coordinates[0],
                        parseFloat(e.target.value) || 0,
                      ],
                    },
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Longitud</label>
              <input
                className="input"
                type="number"
                step="any"
                value={deliveryAddress.coordinates.coordinates[0]}
                onChange={(e) =>
                  setDeliveryAddress((a) => ({
                    ...a,
                    coordinates: {
                      type: "Point",
                      coordinates: [
                        parseFloat(e.target.value) || 0,
                        a.coordinates.coordinates[1],
                      ],
                    },
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-sm font-medium text-gray-700">
              Método de pago
            </label>
            <select
              className="input mt-1"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="card">Tarjeta</option>
              <option value="cash">Efectivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card p-4 mb-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Q{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>IVA (12%)</span>
            <span>Q{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Envío</span>
            <span>Q{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span>
            <span>Q{(subtotal + tax + deliveryFee).toFixed(2)}</span>
          </div>
        </div>
        <button
          className="btn-primary w-full mt-4"
          onClick={handleCheckout}
          disabled={checkingOut}
        >
          {checkingOut ? "Procesando..." : "Confirmar pedido"}
        </button>
      </div>
    </div>
  );
}
