import { useState } from "react";
import {
  getCount, getDistinct, getTopRestaurants, getBestSellingItems,
  getRevenueByMonth, getRatingDistribution, getRestaurantStats,
  getDailyRevenue, getTags, getAllergens, getRevenueByCategory, runBatch
} from "../api";

function ResultBox({ title, data, loading }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-2">{title}</h3>
      {loading ? (
        <div className="text-gray-400 text-sm">Cargando...</div>
      ) : data ? (
        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64 text-gray-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <div className="text-gray-400 text-sm">Sin datos</div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [restaurantId, setRestaurantId] = useState("");

  async function run(key, fn) {
    setLoading(l => ({ ...l, [key]: true }));
    try {
      const data = await fn();
      setResults(r => ({ ...r, [key]: data }));
    } catch (e) {
      setResults(r => ({ ...r, [key]: { error: e.message } }));
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  }

  const QUERIES = [
    {
      group: "Agregaciones Simples",
      items: [
        { key: "count_orders", label: "countDocuments orders (entregados)", fn: () => getCount({ collection: "orders", status: "delivered" }) },
        { key: "count_reviews", label: "countDocuments reviews", fn: () => getCount({ collection: "reviews" }) },
        { key: "distinct_status", label: "distinct status en orders", fn: () => getDistinct({ collection: "orders", field: "status" }) },
        { key: "distinct_categories", label: "distinct categorías menu_items", fn: () => getDistinct({ collection: "menu_items", field: "category" }) },
      ],
    },
    {
      group: "Pipelines Complejas",
      items: [
        { key: "top_rest", label: "P1: Top restaurantes (avgRating)", fn: () => getTopRestaurants({ limit: 5 }) },
        { key: "best_items", label: "P2: Platillos más vendidos ($unwind items)", fn: () => getBestSellingItems({ limit: 10 }) },
        { key: "rev_month", label: "P3: Revenue por mes ($group temporal)", fn: () => getRevenueByMonth() },
        {
          key: "rating_dist",
          label: "P4: Distribución de ratings ($group + $push)",
          fn: () => restaurantId ? getRatingDistribution(restaurantId) : Promise.resolve({ error: "Ingresa un restaurantId" }),
        },
        {
          key: "velocity",
          label: "P5: Order velocity 5min ($dateTrunc)",
          fn: () => restaurantId
            ? fetch(`/analytics/order-velocity/${restaurantId}`).then(r => r.json())
            : Promise.resolve({ error: "Ingresa un restaurantId" }),
        },
        { key: "rev_category", label: "P6: Revenue por categoría (embebido $unwind)", fn: () => getRevenueByCategory() },
      ],
    },
    {
      group: "Arrays en Agregaciones",
      items: [
        { key: "tags", label: "Tags más usados en reseñas ($unwind tags)", fn: () => getTags() },
        { key: "allergens", label: "Alérgenos más comunes ($unwind allergens)", fn: () => getAllergens() },
      ],
    },
    {
      group: "OLAP — Vistas Materializadas",
      items: [
        { key: "rest_stats", label: "restaurant_stats (pre-computed)", fn: () => getRestaurantStats({ limit: 5 }) },
        { key: "daily_rev", label: "daily_revenue (batch)", fn: () => getDailyRevenue({ days: 30 }) },
      ],
    },
    {
      group: "Batch $merge (Materialized View)",
      items: [
        { key: "batch_daily", label: "Run daily revenue batch ($match → $group → $merge)", fn: () => runBatch("daily") },
        { key: "batch_weekly", label: "Run weekly reconciliation ($match → $lookup → $merge)", fn: () => runBatch("weekly") },
      ],
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Analytics & Agregaciones</h1>
      </div>

      <div className="card p-4 mb-6">
        <label className="text-sm font-medium text-gray-700">Restaurant ID (para P4/P5)</label>
        <input className="input mt-1 max-w-xs" placeholder="ObjectId del restaurante"
          value={restaurantId} onChange={e => setRestaurantId(e.target.value)} />
      </div>

      <div className="space-y-8">
        {QUERIES.map(({ group, items }) => (
          <div key={group}>
            <h2 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">{group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(({ key, label, fn }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button className="btn-primary btn-sm text-xs" onClick={() => run(key, fn)}>
                      ▶ Ejecutar
                    </button>
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                  {(results[key] || loading[key]) && (
                    <ResultBox title={label} data={results[key]} loading={loading[key]} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
