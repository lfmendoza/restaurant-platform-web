import { useState, useEffect } from "react";
import { getRestaurants, searchRestaurants, createRestaurant, updateRestaurantStatus, deleteRestaurant } from "../api";

const CUISINES = ["italiana", "mexicana", "japonesa", "americana", "guatemalteca", "peruana"];

export default function RestaurantsPage({ onSelectRestaurant }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lat, setLat] = useState("14.6013");
  const [lng, setLng] = useState("-90.5128");
  const [cuisine, setCuisine] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", cuisineTypes: [] });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getRestaurants({ isActive: true, limit: 30 });
      setRestaurants(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function search() {
    setLoading(true);
    setError("");
    try {
      const data = await searchRestaurants({ lat, lng, ...(cuisine ? { cuisine } : {}), limit: 30 });
      setRestaurants(data.restaurants || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(r) {
    try {
      await updateRestaurantStatus(r._id, { isAcceptingOrders: !r.isAcceptingOrders });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this restaurant?")) return;
    try {
      await deleteRestaurant(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createRestaurant({
        ...form,
        location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        address: { street: "Demo street", city: "Guatemala", zone: "Zona 10" },
        operatingHours: {
          monday: { open: "10:00", close: "22:00" }, tuesday: { open: "10:00", close: "22:00" },
          wednesday: { open: "10:00", close: "22:00" }, thursday: { open: "10:00", close: "22:00" },
          friday: { open: "10:00", close: "23:00" }, saturday: { open: "11:00", close: "23:00" },
          sunday: { open: "11:00", close: "21:00" },
        },
        cuisineTypes: form.cuisineTypes.length ? form.cuisineTypes : ["guatemalteca"],
      });
      setShowCreate(false);
      setForm({ name: "", description: "", cuisineTypes: [] });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Restaurantes</h1>
        <button className="btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          + Nuevo restaurante
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">Crear restaurante</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Nombre" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="input" placeholder="Descripción" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary btn-sm">Crear</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Search bar */}
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Búsqueda geoespacial</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500">Latitud</label>
            <input className="input w-32" value={lat} onChange={e => setLat(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Longitud</label>
            <input className="input w-36" value={lng} onChange={e => setLng(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Cocina</label>
            <select className="input w-36" value={cuisine} onChange={e => setCuisine(e.target.value)}>
              <option value="">Todas</option>
              {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn-primary btn-sm" onClick={search}>Buscar por zona</button>
          <button className="btn-secondary btn-sm" onClick={load}>Ver todos</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {loading && <div className="text-gray-400 text-center py-8">Cargando...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map(r => (
          <div key={r._id} className="card hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>
                </div>
                <span className={`badge ${r.isAcceptingOrders ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {r.isAcceptingOrders ? "Abierto" : "Cerrado"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {(r.cuisineTypes || []).map(c => (
                  <span key={c} className="badge bg-orange-50 text-orange-700">{c}</span>
                ))}
              </div>

              {r.avgRating > 0 && (
                <div className="text-sm text-yellow-600 mt-2">★ {r.avgRating} ({r.totalReviews} reseñas)</div>
              )}
              {r.deliveryFee !== undefined && (
                <div className="text-xs text-gray-500 mt-1">Envío: Q{r.deliveryFee} · ~{r.estimatedMinutes}min</div>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button className="btn-primary btn-sm flex-1" onClick={() => onSelectRestaurant(r)}>
                  Ver menú
                </button>
                <button className="btn-secondary btn-sm" onClick={() => toggleStatus(r)}>
                  {r.isAcceptingOrders ? "Cerrar" : "Abrir"}
                </button>
                <button className="btn-danger btn-sm" onClick={() => handleDelete(r._id)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && restaurants.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No se encontraron restaurantes. Ejecuta el seed script primero.
        </div>
      )}
    </div>
  );
}
