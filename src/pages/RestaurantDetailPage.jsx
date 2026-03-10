import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getRestaurant,
  updateRestaurant,
  updateRestaurantStatus,
  getMenuCategories,
  getReviews,
  getRatingDistribution,
} from "../api";

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ratingDist, setRatingDist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  async function load() {
    setLoading(true);
    try {
      const [r, cats, revs] = await Promise.all([
        getRestaurant(id),
        getMenuCategories(id).catch(() => []),
        getReviews({ restaurantId: id, limit: 10 }),
      ]);
      setRestaurant(r);
      setCategories(cats);
      setReviews(revs);
      setForm({ name: r.name, description: r.description || "" });

      getRatingDistribution(id)
        .then(setRatingDist)
        .catch(() => {});
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      await updateRestaurant(id, form);
      toast.success("Restaurante actualizado");
      setEditing(false);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function toggleStatus() {
    try {
      await updateRestaurantStatus(id, {
        isAcceptingOrders: !restaurant.isAcceptingOrders,
      });
      toast.success("Estado actualizado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading)
    return <div className="text-gray-400 text-center py-12">Cargando...</div>;
  if (!restaurant)
    return (
      <div className="text-gray-400 text-center py-12">
        Restaurante no encontrado
      </div>
    );

  const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

  return (
    <div>
      <button
        className="btn-secondary btn-sm mb-4"
        onClick={() => navigate("/")}
      >
        ← Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-3">
                <input
                  className="input text-xl font-bold"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
                <textarea
                  className="input"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary btn-sm">
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setEditing(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{restaurant.name}</h1>
                    <p className="text-gray-500 mt-1">
                      {restaurant.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setEditing(true)}
                    >
                      Editar
                    </button>
                    <button
                      className={`btn-sm ${
                        restaurant.isAcceptingOrders
                          ? "btn-danger"
                          : "btn-primary"
                      }`}
                      onClick={toggleStatus}
                    >
                      {restaurant.isAcceptingOrders
                        ? "Cerrar pedidos"
                        : "Abrir pedidos"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {(restaurant.cuisineTypes || []).map((c) => (
                    <span
                      key={c}
                      className="badge bg-orange-50 text-orange-700"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <div className="mt-4">
                  <button
                    className="btn-primary"
                    onClick={() =>
                      navigate(`/restaurants/${id}/menu`)
                    }
                  >
                    Ver menú completo
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Categorías del menú</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={typeof cat === "string" ? cat : cat._id}
                    className="badge bg-blue-50 text-blue-700 text-sm"
                  >
                    {typeof cat === "string" ? cat : cat._id} (
                    {cat.count || ""})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="card p-4">
            <h2 className="font-semibold mb-3">
              Reseñas recientes ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay reseñas aún</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r._id}
                    className="border-b last:border-0 pb-3 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">
                        {stars(r.rating)}
                      </span>
                      {r.title && (
                        <span className="font-medium text-sm">{r.title}</span>
                      )}
                    </div>
                    {r.comment && (
                      <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(r.tags || []).map((t) => (
                        <span
                          key={t}
                          className="badge bg-blue-50 text-blue-600 text-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Estadísticas</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rating promedio</span>
                <span className="text-yellow-500 font-bold text-lg">
                  ★ {restaurant.avgRating?.toFixed(1) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total reseñas</span>
                <span className="font-bold">
                  {restaurant.totalReviews || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total pedidos</span>
                <span className="font-bold">
                  {restaurant.totalOrders || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estado</span>
                <span
                  className={`badge ${
                    restaurant.isAcceptingOrders
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {restaurant.isAcceptingOrders ? "Abierto" : "Cerrado"}
                </span>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          {ratingDist && (
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Distribución de ratings</h2>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((n) => {
                  const item = Array.isArray(ratingDist)
                    ? ratingDist.find((d) => d._id === n)
                    : null;
                  const count = item?.count || 0;
                  const total = Array.isArray(ratingDist)
                    ? ratingDist.reduce((s, d) => s + (d.count || 0), 0)
                    : 1;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-right text-yellow-500">
                        {n}★
                      </span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-gray-500 text-xs">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Address */}
          {restaurant.address && (
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Dirección</h2>
              <p className="text-sm text-gray-600">
                {restaurant.address.street}
              </p>
              <p className="text-sm text-gray-600">
                {restaurant.address.city}, {restaurant.address.zone}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
