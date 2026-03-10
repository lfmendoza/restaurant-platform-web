import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCart } from "../contexts/CartContext";
import {
  getRestaurants,
  searchRestaurants,
  createRestaurant,
  createManyRestaurants,
  updateRestaurantStatus,
  deleteRestaurant,
  getDeliveryZonesBatch,
} from "../api";
import Map from "../components/Map";

const CUISINES = [
  "italiana",
  "mexicana",
  "japonesa",
  "americana",
  "guatemalteca",
  "peruana",
  "china",
  "thai",
];

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [locationSet, setLocationSet] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [viewMode, setViewMode] = useState("location"); // "location" | "all"

  const [showZones, setShowZones] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [hoveredRestaurantId, setHoveredRestaurantId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const { setDiscoveryLocation } = useCart();
  const [form, setForm] = useState({
    name: "",
    description: "",
    cuisineTypes: [],
  });
  const [bulkJson, setBulkJson] = useState("");

  const searchByLocation = useCallback(
    async (searchLat, searchLng, searchCuisine) => {
      if (!searchLat || !searchLng) return;
      setLoading(true);
      setError("");
      try {
        const data = await searchRestaurants({
          lat: searchLat,
          lng: searchLng,
          ...(searchCuisine ? { cuisine: searchCuisine } : {}),
          limit: 30,
        });
        setRestaurants(data.restaurants || data || []);
        setLocationSet(true);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  async function fetchZones(rests) {
    if (!rests || rests.length === 0) {
      setDeliveryZones([]);
      return;
    }
    setZonesLoading(true);
    try {
      const ids = rests.map((r) => r._id);
      const raw = await getDeliveryZonesBatch(ids);
      const converted = raw.map((z) => {
        const ring = z.area?.coordinates?.[0] || [];
        return {
          _id: z._id,
          name: z.zoneName,
          polygon: ring.map(([lng, lat]) => [lat, lng]),
          deliveryFee: z.deliveryFee,
          estimatedMinutes: z.estimatedMinutes,
          restaurantId: z.restaurantId,
        };
      });
      setDeliveryZones(converted);
    } catch {
      setDeliveryZones([]);
    } finally {
      setZonesLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const data = await getRestaurants({ isActive: true, limit: 50 });
      setRestaurants(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude.toFixed(6);
        const newLng = pos.coords.longitude.toFixed(6);
        setLat(newLat);
        setLng(newLng);
        setDiscoveryLocation(parseFloat(newLat), parseFloat(newLng));
        setGeoLoading(false);
        toast.success("Ubicación detectada");
        searchByLocation(newLat, newLng, cuisine);
      },
      (err) => {
        setGeoLoading(false);
        toast.error(`Error de geolocalización: ${err.message}`);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }

  function handleMapClick(latlng) {
    const newLat = latlng.lat.toFixed(6);
    const newLng = latlng.lng.toFixed(6);
    setLat(newLat);
    setLng(newLng);
    setDiscoveryLocation(latlng.lat, latlng.lng);
    searchByLocation(newLat, newLng, cuisine);
  }

  function handleCuisineChange(newCuisine) {
    setCuisine(newCuisine);
    if (lat && lng) {
      searchByLocation(lat, lng, newCuisine);
    }
  }

  async function toggleStatus(r) {
    try {
      await updateRestaurantStatus(r._id, {
        isAcceptingOrders: !r.isAcceptingOrders,
      });
      toast.success(
        r.isAcceptingOrders ? "Restaurante cerrado" : "Restaurante abierto"
      );
      if (viewMode === "all") loadAll();
      else if (lat && lng) searchByLocation(lat, lng, cuisine);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar este restaurante?")) return;
    try {
      await deleteRestaurant(id);
      toast.success("Restaurante eliminado");
      if (viewMode === "all") loadAll();
      else if (lat && lng) searchByLocation(lat, lng, cuisine);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createRestaurant({
        ...form,
        location: {
          type: "Point",
          coordinates: [parseFloat(lng) || -90.5128, parseFloat(lat) || 14.6013],
        },
        address: { street: "Demo street", city: "Guatemala", zone: "Zona 10" },
        operatingHours: {
          monday: { open: "10:00", close: "22:00" },
          tuesday: { open: "10:00", close: "22:00" },
          wednesday: { open: "10:00", close: "22:00" },
          thursday: { open: "10:00", close: "22:00" },
          friday: { open: "10:00", close: "23:00" },
          saturday: { open: "11:00", close: "23:00" },
          sunday: { open: "11:00", close: "21:00" },
        },
        cuisineTypes: form.cuisineTypes.length
          ? form.cuisineTypes
          : ["guatemalteca"],
      });
      setShowCreate(false);
      setForm({ name: "", description: "", cuisineTypes: [] });
      toast.success("Restaurante creado");
      if (viewMode === "all") loadAll();
      else if (lat && lng) searchByLocation(lat, lng, cuisine);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleBulkCreate() {
    try {
      const parsed = JSON.parse(bulkJson);
      const result = await createManyRestaurants(
        Array.isArray(parsed) ? parsed : [parsed]
      );
      toast.success(`${result.insertedCount || "Varios"} restaurantes creados`);
      setShowBulk(false);
      setBulkJson("");
      if (viewMode === "all") loadAll();
      else if (lat && lng) searchByLocation(lat, lng, cuisine);
    } catch (e) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    if (viewMode === "all") loadAll();
  }, [viewMode]);

  const restaurantsRef = useRef(restaurants);
  restaurantsRef.current = restaurants;
  const restaurantIdsKey = restaurants.map((r) => r._id).join(",");

  useEffect(() => {
    if (showZones && restaurantsRef.current.length > 0) {
      fetchZones(restaurantsRef.current);
    } else {
      setDeliveryZones([]);
    }
  }, [showZones, restaurantIdsKey]);

  const showLocationPrompt = viewMode === "location" && !locationSet;
  const restaurantsWithLocation = restaurants.filter(
    (r) => r.location?.coordinates?.length >= 2
  );
  const missingLocationCount = restaurants.length - restaurantsWithLocation.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Restaurantes</h1>
        <div className="flex gap-2">
          <button
            className={`btn-sm ${viewMode === "location" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setViewMode("location");
              if (!lat || !lng) {
                setLocationSet(false);
                setRestaurants([]);
              }
            }}
          >
            Por ubicación
          </button>
          <button
            className={`btn-sm ${viewMode === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("all")}
          >
            Ver todos
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowBulk(!showBulk)}
          >
            Bulk Create
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowCreate(!showCreate)}
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Location prompt */}
      {showLocationPrompt && (
        <div className="card mb-4 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              ¿Dónde quieres recibir tu pedido?
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Haz clic en el mapa o usa tu ubicación para ver restaurantes que entregan donde estás.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                className="btn-primary btn-sm"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
              >
                {geoLoading ? "Detectando..." : "📍 Usar mi ubicación"}
              </button>
            </div>
          </div>
          <Map
            onMapClick={handleMapClick}
            height="350px"
          />
        </div>
      )}

      {/* Map with results (after location is set) */}
      {viewMode === "location" && locationSet && (
        <div className="card mb-4 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Restaurantes que entregan en tu ubicación
              </h2>
              <p className="text-xs text-gray-500">
                {restaurants.length} restaurante{restaurants.length !== 1 ? "s" : ""} encontrado{restaurants.length !== 1 ? "s" : ""}
                {missingLocationCount > 0 && ` · ${restaurantsWithLocation.length} en el mapa`}
                {lat && lng && ` · ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <select
                className="input w-36 text-xs"
                value={cuisine}
                onChange={(e) => handleCuisineChange(e.target.value)}
              >
                <option value="">Todas las cocinas</option>
                {CUISINES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                className={`btn-sm text-xs ${showZones ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setShowZones(!showZones)}
                disabled={zonesLoading}
              >
                {zonesLoading ? "..." : showZones ? "Ocultar zonas" : "Ver zonas"}
              </button>
              <button
                className="btn-secondary btn-sm text-xs"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
              >
                {geoLoading ? "Detectando..." : "📍 Usar mi ubicación"}
              </button>
            </div>
          </div>
          <Map
            restaurants={restaurants}
            deliveryZones={deliveryZones}
            searchLat={lat}
            searchLng={lng}
            onMapClick={handleMapClick}
            onRestaurantClick={(r) => navigate(`/restaurants/${r._id}`)}
            highlightedRestaurantId={hoveredRestaurantId}
            onRestaurantHover={setHoveredRestaurantId}
            height="350px"
          />
        </div>
      )}

      {/* Map for "all" view mode */}
      {viewMode === "all" && (
        <div className="card mb-4 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Todos los restaurantes ({restaurants.length})
              </h2>
              <p className="text-xs text-gray-500">
                Modo explorador — {restaurantsWithLocation.length} con marcador en el mapa
                {missingLocationCount > 0 && `, ${missingLocationCount} sin ubicación`}
              </p>
            </div>
            <button
              className={`btn-sm text-xs ${showZones ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setShowZones(!showZones)}
              disabled={zonesLoading}
            >
              {zonesLoading ? "..." : showZones ? "Ocultar zonas" : "Ver zonas de delivery"}
            </button>
          </div>
          <Map
            restaurants={restaurants}
            deliveryZones={deliveryZones}
            onRestaurantClick={(r) => navigate(`/restaurants/${r._id}`)}
            highlightedRestaurantId={hoveredRestaurantId}
            onRestaurantHover={setHoveredRestaurantId}
            height="350px"
          />
        </div>
      )}

      {showCreate && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">Crear restaurante</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Descripción"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Tipos de cocina</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {CUISINES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`badge cursor-pointer ${
                      form.cuisineTypes.includes(c)
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        cuisineTypes: f.cuisineTypes.includes(c)
                          ? f.cuisineTypes.filter((x) => x !== c)
                          : [...f.cuisineTypes, c],
                      }))
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary btn-sm">
                Crear
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

      {showBulk && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">
            Bulk Create (POST /restaurants/many)
          </h2>
          <textarea
            className="input font-mono text-xs h-32"
            placeholder='[{"name":"R1","description":"...","cuisineTypes":["italiana"],"location":{"type":"Point","coordinates":[-90.51,14.60]},"address":{"street":"...","city":"Guatemala","zone":"Zona 10"},"operatingHours":{"monday":{"open":"10:00","close":"22:00"}}}]'
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button className="btn-primary btn-sm" onClick={handleBulkCreate}>
              Enviar
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowBulk(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-gray-400 text-center py-8">Cargando...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map((r) => {
          const rid = r._id?.toString?.() || r._id;
          const isHighlighted = hoveredRestaurantId === rid;
          const hasLocation = r.location?.coordinates?.length >= 2;

          return (
            <div
              key={r._id}
              className={`card transition-all duration-150 cursor-pointer ${
                isHighlighted
                  ? "ring-2 ring-orange-400 shadow-lg scale-[1.02]"
                  : "hover:shadow-md"
              }`}
              onMouseEnter={() => setHoveredRestaurantId(rid)}
              onMouseLeave={() => setHoveredRestaurantId(null)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {r.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`badge ${
                        r.isAcceptingOrders
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.isAcceptingOrders ? "Abierto" : "Cerrado"}
                    </span>
                    {!hasLocation && (
                      <span className="badge bg-yellow-100 text-yellow-700 text-[10px]">
                        Sin ubicación
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {(r.cuisineTypes || []).map((c) => (
                    <span
                      key={c}
                      className="badge bg-orange-50 text-orange-700"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                {(r.avgRating > 0 || r.totalReviews > 0) && (
                  <div className="text-sm text-yellow-600 mt-2">
                    ★ {r.avgRating?.toFixed(1) || "0.0"} ({r.totalReviews || 0}{" "}
                    reseñas)
                  </div>
                )}

                {r.deliveryFee != null && (
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Q{r.deliveryFee} envío
                    </span>
                    {r.estimatedMinutes != null && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        ~{r.estimatedMinutes} min
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    className="btn-primary btn-sm flex-1"
                    onClick={() => navigate(`/restaurants/${r._id}/menu`)}
                  >
                    Ver menú
                  </button>
                  <button
                    className="btn-secondary btn-sm text-xs"
                    onClick={() => navigate(`/restaurants/${r._id}`)}
                  >
                    Detalle
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => toggleStatus(r)}
                  >
                    {r.isAcceptingOrders ? "Cerrar" : "Abrir"}
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleDelete(r._id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && restaurants.length === 0 && !showLocationPrompt && (
        <div className="text-center text-gray-400 py-12">
          No se encontraron restaurantes en esta ubicación.
        </div>
      )}
    </div>
  );
}
