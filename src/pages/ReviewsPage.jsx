import { useState, useEffect } from "react";
import { getReviews, deleteReview, addReviewTag, addRestaurantResponse, getRestaurants } from "../api";

const DEMO_USER_ID = "000000000000000000000001";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (restaurantFilter) params.restaurantId = restaurantFilter;
      if (ratingFilter) params.rating = ratingFilter;
      const data = await getReviews(params);
      setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadRestaurants() {
    try {
      const data = await getRestaurants({ limit: 20 });
      setRestaurants(data);
    } catch (e) {}
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar esta reseña?")) return;
    try {
      await deleteReview(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleAddTag(id) {
    const tag = prompt("Tag a agregar:");
    if (!tag) return;
    try {
      await addReviewTag(id, tag.trim());
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleResponse(id) {
    const msg = prompt("Respuesta del restaurante:");
    if (!msg) return;
    try {
      await addRestaurantResponse(id, msg);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  useEffect(() => { loadRestaurants(); }, []);
  useEffect(() => { load(); }, [restaurantFilter, ratingFilter]);

  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Reseñas</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Restaurante</label>
            <select className="input w-48" value={restaurantFilter} onChange={e => setRestaurantFilter(e.target.value)}>
              <option value="">Todos</option>
              {restaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Calificación</label>
            <select className="input w-24" value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
              <option value="">Todas</option>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="text-gray-400 text-center py-8">Cargando...</div>}

      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r._id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 text-lg">{stars(r.rating)}</span>
                  {r.title && <span className="font-semibold">{r.title}</span>}
                </div>
                {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}

                {/* Tags (array) */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(r.tags || []).map(t => (
                    <span key={t} className="badge bg-blue-50 text-blue-600">{t}</span>
                  ))}
                  <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => handleAddTag(r._id)}>
                    + tag ($addToSet)
                  </button>
                </div>

                {/* Restaurant response (embedded 1:1) */}
                {r.restaurantResponse ? (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                    <span className="font-medium text-orange-700">Respuesta del restaurante: </span>
                    {r.restaurantResponse.message}
                  </div>
                ) : (
                  <button className="text-xs text-orange-500 hover:text-orange-700 mt-1"
                    onClick={() => handleResponse(r._id)}>
                    + Responder (embebido 1:1)
                  </button>
                )}

                <div className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleString()}</div>
              </div>

              <button className="btn-danger btn-sm ml-3" onClick={() => handleDelete(r._id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {!loading && reviews.length === 0 && (
        <div className="text-center text-gray-400 py-12">No hay reseñas. Crea un pedido y márcalo como entregado primero.</div>
      )}
    </div>
  );
}
