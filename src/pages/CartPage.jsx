import { useState } from "react";
import { removeFromCart, updateCartItem, createOrder } from "../api";

const DEMO_USER_ID = "000000000000000000000001";

export default function CartPage({ cart, setCart, onOrderPlaced, onBack }) {
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "6a Avenida 12-34",
    city: "Guatemala",
    zone: "Zona 10",
    coordinates: { type: "Point", coordinates: [-90.5069, 14.5943] },
  });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);

  const userId = localStorage.getItem("demoUserId") || DEMO_USER_ID;

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🛒</div>
        <p className="text-gray-500">Tu carrito está vacío.</p>
        <button className="btn-secondary btn-sm mt-4" onClick={onBack}>Volver al menú</button>
      </div>
    );
  }

  async function handleRemove(menuItemId) {
    try {
      await removeFromCart(menuItemId, userId);
      const updated = { ...cart, items: cart.items.filter(i => i.menuItemId !== menuItemId) };
      setCart(updated.items.length ? updated : null);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleQtyChange(menuItemId, qty) {
    try {
      const result = await updateCartItem(menuItemId, { userId, quantity: qty });
      setCart(result);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleCheckout() {
    setLoading(true);
    try {
      const order = await createOrder({
        userId,
        cartId: cart._id,
        deliveryAddress,
        paymentMethod,
      });
      setCart(null);
      alert(`✅ Pedido creado: ${order.orderNumber}\nTotal: Q${order.total}`);
      onOrderPlaced();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const subtotal = cart.items.reduce((s, i) => s + i.subtotal, 0);
  const tax = subtotal * 0.12;
  const deliveryFee = 15;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button className="btn-secondary btn-sm" onClick={onBack}>← Volver</button>
        <h1 className="text-2xl font-bold">Tu carrito</h1>
      </div>

      {/* Items */}
      <div className="card mb-4">
        {cart.items.map((item) => (
          <div key={String(item.menuItemId)} className="flex items-center gap-3 p-4 border-b last:border-0">
            <div className="flex-1">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-gray-500">Q{item.price} c/u</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 rounded border text-lg flex items-center justify-center hover:bg-gray-50"
                onClick={() => item.quantity > 1 ? handleQtyChange(item.menuItemId, item.quantity - 1) : handleRemove(item.menuItemId)}>
                −
              </button>
              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
              <button className="w-7 h-7 rounded border text-lg flex items-center justify-center hover:bg-gray-50"
                onClick={() => handleQtyChange(item.menuItemId, item.quantity + 1)}>
                +
              </button>
            </div>
            <span className="font-semibold text-sm w-16 text-right">Q{item.subtotal.toFixed(2)}</span>
            <button className="text-red-400 hover:text-red-600" onClick={() => handleRemove(item.menuItemId)}>✕</button>
          </div>
        ))}
      </div>

      {/* Delivery address */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold mb-3">Dirección de entrega</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="input col-span-2" placeholder="Calle" value={deliveryAddress.street}
            onChange={e => setDeliveryAddress(a => ({ ...a, street: e.target.value }))} />
          <input className="input" placeholder="Ciudad" value={deliveryAddress.city}
            onChange={e => setDeliveryAddress(a => ({ ...a, city: e.target.value }))} />
          <input className="input" placeholder="Zona" value={deliveryAddress.zone}
            onChange={e => setDeliveryAddress(a => ({ ...a, zone: e.target.value }))} />
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium text-gray-700">Método de pago</label>
          <select className="input mt-1" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="card">Tarjeta</option>
            <option value="cash">Efectivo</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="card p-4 mb-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>Q{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-500"><span>IVA (12%)</span><span>Q{tax.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Envío</span><span>Q{deliveryFee.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span><span>Q{(subtotal + tax + deliveryFee).toFixed(2)}</span>
          </div>
        </div>
        <button className="btn-primary w-full mt-4" onClick={handleCheckout} disabled={loading}>
          {loading ? "Procesando..." : "Confirmar pedido"}
        </button>
      </div>
    </div>
  );
}
