import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUser } from "../contexts/UserContext";
import {
  getReviews,
  createReview,
  deleteReview,
  deleteManyReviews,
  addReviewTag,
  addRestaurantResponse,
  voteHelpful,
  getRestaurants,
  getOrders,
} from "../api";
import RestaurantTypeahead from "../components/RestaurantTypeahead";

export default function ReviewsPage() {
  const { userId } = useUser();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    orderId: "",
    restaurantId: "",
    rating: 5,
    title: "",
    comment: "",
    tags: "",
  });

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (restaurantFilter) params.restaurantId = restaurantFilter;
      if (ratingFilter) params.rating = ratingFilter;
      const data = await getReviews(params);
      setReviews(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRestaurants() {
    try {
      const data = await getRestaurants({ limit: 1000 });
      setRestaurants(data);
    } catch {
      /* ignore */
    }
  }

  async function loadDeliveredOrders() {
    try {
      const data = await getOrders({ status: "delivered", limit: 50 });
      setDeliveredOrders(data);
    } catch {
      /* ignore */
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createReview({
        userId,
        orderId: form.orderId,
        ...(form.restaurantId && { restaurantId: form.restaurantId }),
        rating: Number(form.rating),
        title: form.title,
        comment: form.comment,
        tags: form.tags
          ? form.tags.split(",").map((s) => s.trim())
          : [],
      });
      toast.success("Reseña creada");
      setShowCreate(false);
      setForm({
        orderId: "",
        restaurantId: "",
        rating: 5,
        title: "",
        comment: "",
        tags: "",
      });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar esta reseña?")) return;
    try {
      await deleteReview(id);
      toast.success("Reseña eliminada");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDeleteMany() {
    if (!restaurantFilter) {
      toast.error("Selecciona un restaurante primero");
      return;
    }
    if (!confirm("Eliminar todas las reseñas de este restaurante?")) return;
    try {
      await deleteManyReviews({ restaurantId: restaurantFilter });
      toast.success("Reseñas eliminadas");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleAddTag(id) {
    const tag = prompt("Tag a agregar:");
    if (!tag) return;
    try {
      await addReviewTag(id, tag.trim());
      toast.success("Tag agregado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleResponse(id) {
    const msg = prompt("Respuesta del restaurante:");
    if (!msg) return;
    try {
      await addRestaurantResponse(id, msg);
      toast.success("Respuesta agregada");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleHelpful(id) {
    try {
      await voteHelpful(id);
      toast.success("Voto registrado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    loadRestaurants();
    loadDeliveredOrders();
  }, []);
  useEffect(() => {
    load();
  }, [restaurantFilter, ratingFilter]);

  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Reseñas</h1>
        <div className="flex gap-2">
          {restaurantFilter && (
            <button
              className="btn-danger btn-sm"
              onClick={handleDeleteMany}
            >
              Eliminar del restaurante
            </button>
          )}
          <button
            className="btn-primary btn-sm"
            onClick={() => {
              setShowCreate(!showCreate);
              if (!showCreate) loadDeliveredOrders();
            }}
          >
            + Nueva reseña
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">Crear reseña</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">
                Orden (solo delivered)
              </label>
              <select
                className="input"
                value={form.orderId}
                onChange={(e) => {
                  const order = deliveredOrders.find(
                    (o) => o._id === e.target.value
                  );
                  setForm((f) => ({
                    ...f,
                    orderId: e.target.value,
                    restaurantId:
                      order?.restaurantId || order?.restaurant?._id || "",
                  }));
                }}
                required
              >
                <option value="">Seleccionar orden...</option>
                {deliveredOrders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} — {o.restaurant?.name || o.restaurantId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Rating</label>
              <select
                className="input"
                value={form.rating}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rating: e.target.value }))
                }
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {stars(n)} ({n})
                  </option>
                ))}
              </select>
            </div>
            <input
              className="input"
              placeholder="Título"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Tags (separados por coma)"
              value={form.tags}
              onChange={(e) =>
                setForm((f) => ({ ...f, tags: e.target.value }))
              }
            />
            <textarea
              className="input col-span-2"
              rows={3}
              placeholder="Comentario..."
              value={form.comment}
              onChange={(e) =>
                setForm((f) => ({ ...f, comment: e.target.value }))
              }
            />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary btn-sm">
                Crear reseña
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Restaurante</label>
            <RestaurantTypeahead
              restaurants={restaurants}
              value={restaurantFilter}
              onChange={setRestaurantFilter}
              emptyLabel="Todos"
              className="w-64"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Calificación</label>
            <select
              className="input w-24"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-gray-400 text-center py-8">Cargando...</div>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r._id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 text-lg">
                    {stars(r.rating)}
                  </span>
                  {r.title && (
                    <span className="font-semibold">{r.title}</span>
                  )}
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(r.tags || []).map((t) => (
                    <span
                      key={t}
                      className="badge bg-blue-50 text-blue-600"
                    >
                      {t}
                    </span>
                  ))}
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => handleAddTag(r._id)}
                  >
                    + tag
                  </button>
                </div>

                {/* Restaurant response */}
                {r.restaurantResponse ? (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                    <span className="font-medium text-orange-700">
                      Respuesta:{" "}
                    </span>
                    {r.restaurantResponse.message}
                  </div>
                ) : (
                  <button
                    className="text-xs text-orange-500 hover:text-orange-700 mt-1"
                    onClick={() => handleResponse(r._id)}
                  >
                    + Responder
                  </button>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <button
                    className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    onClick={() => handleHelpful(r._id)}
                  >
                    👍 Útil{" "}
                    {r.helpfulVotes > 0 && (
                      <span className="font-bold">({r.helpfulVotes})</span>
                    )}
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                className="btn-danger btn-sm ml-3"
                onClick={() => handleDelete(r._id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && reviews.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No hay reseñas. Crea un pedido, márcalo como entregado y luego crea
          una reseña.
        </div>
      )}
    </div>
  );
}
