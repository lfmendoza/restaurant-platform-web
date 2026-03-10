import { useState, useEffect } from "react";
import { getOrders, updateOrderStatus, deleteCancelledOrders } from "../api";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready_for_pickup: "bg-indigo-100 text-indigo-700",
  picked_up: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up"],
  picked_up: ["delivered"],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (statusFilter) params.status = statusFilter;
      const data = await getOrders(params);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    try {
      await updateOrderStatus(orderId, { status: newStatus, actor: "demo_user" });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleDeleteCancelled() {
    if (!confirm("Eliminar todos los pedidos cancelados?")) return;
    try {
      const result = await deleteCancelledOrders();
      alert(`Eliminados: ${result.deleted} pedidos`);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <button className="btn-danger btn-sm" onClick={handleDeleteCancelled}>
          🗑 Eliminar cancelados
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["", "pending", "confirmed", "preparing", "ready_for_pickup", "picked_up", "delivered", "cancelled"].map(s => (
          <button key={s} className={`btn-sm ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setStatusFilter(s)}>
            {s || "Todos"}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 text-center py-8">Cargando...</div>}

      <div className="space-y-3">
        {orders.map(order => (
          <div key={order._id} className="card">
            <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === order._id ? null : order._id)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-bold text-gray-700">{order.orderNumber}</span>
                  <span className="ml-3 text-sm text-gray-500">{order.restaurant?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                    {order.status}
                  </span>
                  <span className="font-bold text-orange-600">Q{order.total}</span>
                  <span className="text-gray-400">{expanded === order._id ? "▲" : "▼"}</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {order.user?.name} · {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>

            {expanded === order._id && (
              <div className="border-t p-4 bg-gray-50">
                {/* Items embebidos */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Items (embebidos)</p>
                  <div className="space-y-1">
                    {(order.items || []).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span>Q{item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status history */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Historial de estados</p>
                  <div className="space-y-1">
                    {(order.statusHistory || []).map((h, i) => (
                      <div key={i} className="text-xs flex gap-2">
                        <span className={`badge ${STATUS_COLORS[h.status] || "bg-gray-100"}`}>{h.status}</span>
                        <span className="text-gray-400">{new Date(h.timestamp).toLocaleTimeString()}</span>
                        <span className="text-gray-400">{h.actor}</span>
                        {h.durationFromPrevSec > 0 && <span className="text-gray-400">{h.durationFromPrevSec}s</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* FSM transitions */}
                {NEXT_STATUS[order.status] && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cambiar estado</p>
                    <div className="flex gap-2">
                      {NEXT_STATUS[order.status].map(s => (
                        <button key={s}
                          className={`btn-sm text-xs ${s === "cancelled" ? "btn-danger" : "btn-primary"}`}
                          onClick={() => handleStatusChange(order._id, s)}>
                          → {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && orders.length === 0 && (
        <div className="text-center text-gray-400 py-12">No hay pedidos.</div>
      )}
    </div>
  );
}
