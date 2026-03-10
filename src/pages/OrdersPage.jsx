import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  getOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  deleteCancelledOrders,
} from "../api";
import StatusTimeline from "../components/StatusTimeline";

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
  const [detailOrder, setDetailOrder] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function load() {
    setLoading(true);
    try {
      const params = { limit: pageSize, skip: (page - 1) * pageSize };
      if (statusFilter) params.status = statusFilter;
      const data = await getOrders(params);
      setOrders(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    try {
      await updateOrderStatus(orderId, {
        status: newStatus,
        actor: "demo_user",
      });
      toast.success(`Estado cambiado a ${newStatus}`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDeleteOrder(id) {
    if (!confirm("Eliminar esta orden?")) return;
    try {
      await deleteOrder(id);
      toast.success("Orden eliminada");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDeleteCancelled() {
    if (!confirm("Eliminar todos los pedidos cancelados?")) return;
    try {
      const result = await deleteCancelledOrders();
      toast.success(`Eliminados: ${result.deleted} pedidos`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleViewDetail(id) {
    try {
      const order = await getOrder(id);
      setDetailOrder(order);
    } catch (e) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <button className="btn-danger btn-sm" onClick={handleDeleteCancelled}>
          Eliminar cancelados
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          "",
          "pending",
          "confirmed",
          "preparing",
          "ready_for_pickup",
          "picked_up",
          "delivered",
          "cancelled",
        ].map((s) => (
          <button
            key={s}
            className={`btn-sm ${
              statusFilter === s ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {s || "Todos"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-gray-400 text-center py-8">Cargando...</div>
      )}

      {/* Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                Orden {detailOrder.orderNumber}
              </h2>
              <button
                className="btn-secondary btn-sm"
                onClick={() => setDetailOrder(null)}
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="mb-4">
              <StatusTimeline
                statusHistory={detailOrder.statusHistory}
                currentStatus={detailOrder.status}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500">Estado:</span>{" "}
                <span
                  className={`badge ${
                    STATUS_COLORS[detailOrder.status] || ""
                  }`}
                >
                  {detailOrder.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>{" "}
                <span className="font-bold text-orange-600">
                  Q{detailOrder.total}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Usuario:</span>{" "}
                {detailOrder.user?.name || detailOrder.userId}
              </div>
              <div>
                <span className="text-gray-500">Restaurante:</span>{" "}
                {detailOrder.restaurant?.name || detailOrder.restaurantId}
              </div>
              <div>
                <span className="text-gray-500">Fecha:</span>{" "}
                {new Date(detailOrder.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="text-gray-500">Pago:</span>{" "}
                {detailOrder.paymentMethod}
              </div>
            </div>

            <h3 className="font-semibold text-sm mb-2">Items</h3>
            <div className="space-y-1 mb-4">
              {(detailOrder.items || []).map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>Q{item.subtotal}</span>
                </div>
              ))}
            </div>

            {detailOrder.deliveryAddress && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Dirección:</span>{" "}
                {detailOrder.deliveryAddress.street},{" "}
                {detailOrder.deliveryAddress.zone},{" "}
                {detailOrder.deliveryAddress.city}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order._id} className="card">
            <div
              className="p-4 cursor-pointer"
              onClick={() =>
                setExpanded(expanded === order._id ? null : order._id)
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-bold text-gray-700">
                    {order.orderNumber}
                  </span>
                  <span className="ml-3 text-sm text-gray-500">
                    {order.restaurant?.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="font-bold text-orange-600">
                    Q{order.total}
                  </span>
                  <span className="text-gray-400">
                    {expanded === order._id ? "▲" : "▼"}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {order.user?.name} ·{" "}
                {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>

            {expanded === order._id && (
              <div className="border-t p-4 bg-gray-50">
                {/* Timeline */}
                <div className="mb-4">
                  <StatusTimeline
                    statusHistory={order.statusHistory}
                    currentStatus={order.status}
                  />
                </div>

                {/* Items */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Items
                  </p>
                  <div className="space-y-1">
                    {(order.items || []).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>Q{item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUS[order.status] &&
                    NEXT_STATUS[order.status].map((s) => (
                      <button
                        key={s}
                        className={`btn-sm text-xs ${
                          s === "cancelled" ? "btn-danger" : "btn-primary"
                        }`}
                        onClick={() => handleStatusChange(order._id, s)}
                      >
                        → {s}
                      </button>
                    ))}
                  <button
                    className="btn-secondary btn-sm text-xs"
                    onClick={() => handleViewDetail(order._id)}
                  >
                    Ver detalle
                  </button>
                  <button
                    className="btn-danger btn-sm text-xs"
                    onClick={() => handleDeleteOrder(order._id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-6">
        <button
          className="btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Anterior
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-600">
          Página {page}
        </span>
        <button
          className="btn-secondary btn-sm"
          disabled={orders.length < pageSize}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente →
        </button>
      </div>

      {!loading && orders.length === 0 && (
        <div className="text-center text-gray-400 py-12">No hay pedidos.</div>
      )}
    </div>
  );
}
