import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  getDashboard,
  getCount, getBestSellingItems,
  getRatingDistribution, getOrderVelocity,
  getAvgTransitionTime, getDailyRevenue,
  getRevenueByCategory, runBatch, getRestaurants,
} from "../api";
import RestaurantTypeahead from "../components/RestaurantTypeahead";
import ChartCardExpandable from "../components/ChartCardExpandable";

const CHART_COLORS = [
  "#F97316", "#3B82F6", "#22C55E", "#EAB308", "#A855F7",
  "#EF4444", "#6366F1", "#14B8A6", "#EC4899", "#84CC16",
];

function fmtCurrency(v) {
  if (v == null) return "Q0";
  if (v >= 1000000) return `Q${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `Q${(v / 1000).toFixed(1)}K`;
  return `Q${v.toFixed(0)}`;
}

function StatCard({ title, value, sub }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold text-orange-600">{value ?? "\u2014"}</div>
      <div className="text-sm font-medium text-gray-700 mt-1">{title}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, loading, expandedContent }) {
  return (
    <ChartCardExpandable
      title={title}
      expandedContent={loading ? null : expandedContent}
    >
      {loading ? (
        <div className="text-gray-400 text-sm text-center py-12">Cargando...</div>
      ) : (
        children
      )}
    </ChartCardExpandable>
  );
}

export default function AnalyticsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState({});
  const [data, setData] = useState({});

  async function run(key, fn) {
    setLoading((l) => ({ ...l, [key]: true }));
    try {
      const result = await fn();
      setData((d) => ({ ...d, [key]: result }));
    } catch (e) {
      toast.error(`${key}: ${e.message}`);
      setData((d) => ({ ...d, [key]: null }));
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }

  const loadGlobal = useCallback(async () => {
    setLoading((l) => ({ ...l, _global: true }));
    try {
      const result = await getDashboard();
      setData((d) => ({ ...d, ...result }));
    } catch (e) {
      toast.error(`Dashboard: ${e.message}`);
    } finally {
      setLoading((l) => ({ ...l, _global: false }));
    }
  }, []);

  const loadForRestaurant = useCallback((rId) => {
    if (!rId) return;
    run("count_orders", () => getCount({ collection: "orders", status: "delivered", restaurantId: rId }));
    run("count_reviews", () => getCount({ collection: "reviews", restaurantId: rId }));
    run("best_items", () => getBestSellingItems({ limit: 10, restaurantId: rId }));
    run("rev_category", () => getRevenueByCategory({ restaurantId: rId }));
    run("daily_rev", () => getDailyRevenue({ days: 30, restaurantId: rId }));
    run("rating_dist", () => getRatingDistribution(rId));
    run("velocity", () => getOrderVelocity(rId));
    run("avg_transition", () => getAvgTransitionTime(rId));
  }, []);

  useEffect(() => {
    getRestaurants({ limit: 1000 })
      .then(setRestaurants)
      .catch(() => {});
    loadGlobal();
  }, [loadGlobal]);

  function handleRestaurantChange(rId) {
    setRestaurantId(rId);
    if (rId) {
      loadForRestaurant(rId);
    } else {
      loadGlobal();
    }
  }

  function handleReload() {
    if (restaurantId) {
      loadForRestaurant(restaurantId);
    } else {
      loadGlobal();
    }
  }

  const selectedName = restaurants.find((r) => r._id === restaurantId)?.name;
  const isFiltered = !!restaurantId;

  const countOrders = data.count_orders?.count ?? data.count_orders;
  const countReviews = data.count_reviews?.count ?? data.count_reviews;
  const distinctStatus = Array.isArray(data.distinct_status) ? data.distinct_status : data.distinct_status?.values || [];
  const distinctCats = Array.isArray(data.distinct_categories) ? data.distinct_categories : data.distinct_categories?.values || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Analytics & Agregaciones</h1>
        <div className="flex gap-2">
          <button className="btn-primary btn-sm" onClick={handleReload}>
            Recargar todo
          </button>
          <button className="btn-secondary btn-sm" onClick={() => run("batch_daily", () => runBatch("daily"))}>
            Run daily batch
          </button>
          <button className="btn-secondary btn-sm" onClick={() => run("batch_weekly", () => runBatch("weekly"))}>
            Run weekly batch
          </button>
        </div>
      </div>

      {/* Restaurant Selector */}
      <div className="card p-4 mb-6">
        <label className="text-sm font-medium text-gray-700">
          Filtrar por restaurante
        </label>
        <RestaurantTypeahead
          restaurants={restaurants}
          value={restaurantId}
          onChange={handleRestaurantChange}
          emptyLabel="Todos los restaurantes (global)"
          className="mt-1 max-w-md"
        />
        {isFiltered && (
          <p className="text-xs text-orange-600 mt-1 font-medium">
            Mostrando métricas filtradas para: {selectedName}
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 mb-6 ${isFiltered ? "grid-cols-2 md:grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        <StatCard title="Pedidos entregados" value={typeof countOrders === "number" ? countOrders : "\u2014"} />
        <StatCard title="Reseñas totales" value={typeof countReviews === "number" ? countReviews : "\u2014"} />
        {!isFiltered && (
          <>
            <StatCard title="Estados distintos" value={distinctStatus.length || "\u2014"} sub={distinctStatus.join(", ")} />
            <StatCard title="Categorías menú" value={distinctCats.length || "\u2014"} sub={distinctCats.slice(0, 5).join(", ")} />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Daily Revenue */}
        <ChartCard
          title={isFiltered ? `Revenue diario — ${selectedName}` : "Revenue diario (30 días)"}
          loading={loading._global || loading.daily_rev}
          expandedContent={
            Array.isArray(data.daily_rev) && data.daily_rev.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily_rev}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tickFormatter={fmtCurrency} />
                    <Tooltip
                      formatter={(v, name) => {
                        if (name === "Revenue") return [`Q${typeof v === "number" ? v.toFixed(2) : v}`, name];
                        return [v, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="totalRevenue" fill="#F97316" name="Revenue" radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="orderCount" stroke="#3B82F6" strokeWidth={2} dot={false} name="Pedidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null
          }
        >
          {Array.isArray(data.daily_rev) && data.daily_rev.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.daily_rev}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tickFormatter={fmtCurrency} />
                <Tooltip
                  formatter={(v, name) => {
                    if (name === "Revenue") return [`Q${typeof v === "number" ? v.toFixed(2) : v}`, name];
                    return [v, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="totalRevenue" fill="#F97316" name="Revenue" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="orderCount" stroke="#3B82F6" strokeWidth={2} dot={false} name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
        </ChartCard>

        {/* Best Selling Items */}
        <ChartCard
          title={isFiltered ? `Platillos más vendidos — ${selectedName}` : "Platillos más vendidos"}
          loading={loading._global || loading.best_items}
          expandedContent={
            Array.isArray(data.best_items) && data.best_items.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.best_items}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalQty" fill="#3B82F6" name="Vendidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null
          }
        >
          {Array.isArray(data.best_items) && data.best_items.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.best_items}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQty" fill="#3B82F6" name="Vendidos" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
        </ChartCard>

        {/* Revenue by Category */}
        <ChartCard
          title={isFiltered ? `Revenue por categoría — ${selectedName}` : "Revenue por categoría"}
          loading={loading._global || loading.rev_category}
          expandedContent={
            Array.isArray(data.rev_category) && data.rev_category.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.rev_category}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={fmtCurrency} />
                    <Tooltip formatter={(v) => `Q${v.toFixed(2)}`} />
                    <Bar dataKey="totalRevenue" fill="#A855F7" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null
          }
        >
          {Array.isArray(data.rev_category) && data.rev_category.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.rev_category}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tickFormatter={fmtCurrency} />
                <Tooltip formatter={(v) => `Q${v.toFixed(2)}`} />
                <Bar dataKey="totalRevenue" fill="#A855F7" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
        </ChartCard>

        {/* Top Restaurants - only when global */}
        {!isFiltered && (
          <ChartCard
            title="Top restaurantes por rating"
            loading={loading._global}
            expandedContent={
              Array.isArray(data.top_rest) && data.top_rest.length > 0 ? (
                <div className="h-[calc(90vh-100px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top_rest.map((r) => ({ ...r, name: r.restaurant?.name || "N/A" }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Bar dataKey="avgRating" fill="#F97316" name="Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null
            }
          >
            {Array.isArray(data.top_rest) && data.top_rest.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.top_rest.map((r) => ({ ...r, name: r.restaurant?.name || "N/A" }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="avgRating" fill="#F97316" name="Rating" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
          </ChartCard>
        )}

        {/* Restaurant Stats - only when global */}
        {!isFiltered && (
          <ChartCard
            title="Stats por restaurante (vistas materializadas)"
            loading={loading._global}
            expandedContent={
              Array.isArray(data.rest_stats) && data.rest_stats.length > 0 ? (
                <div className="h-[calc(90vh-100px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.rest_stats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="restaurantName" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalOrders" fill="#3B82F6" name="Pedidos" />
                      <Bar dataKey="totalReviews" fill="#22C55E" name="Reseñas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null
            }
          >
            {Array.isArray(data.rest_stats) && data.rest_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.rest_stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="restaurantName" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalOrders" fill="#3B82F6" name="Pedidos" />
                  <Bar dataKey="totalReviews" fill="#22C55E" name="Reseñas" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
          </ChartCard>
        )}

        {/* Tags - only when global */}
        {!isFiltered && (
          <ChartCard
            title="Tags más usados en reseñas"
            loading={loading._global}
            expandedContent={
              Array.isArray(data.tags) && data.tags.length > 0 ? (
                <div className="h-[calc(90vh-100px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.tags} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="tag" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#14B8A6" name="Usos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null
            }
          >
            {Array.isArray(data.tags) && data.tags.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.tags} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="tag" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14B8A6" name="Usos" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
          </ChartCard>
        )}

        {/* Allergens - only when global */}
        {!isFiltered && (
          <ChartCard
            title="Alérgenos más comunes"
            loading={loading._global}
            expandedContent={
              Array.isArray(data.allergens) && data.allergens.length > 0 ? (
                <div className="h-[calc(90vh-100px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.allergens} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="allergen" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#EF4444" name="Items" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null
            }
          >
            {Array.isArray(data.allergens) && data.allergens.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.allergens} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="allergen" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF4444" name="Items" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
          </ChartCard>
        )}

        {/* Rating Distribution - only when restaurant selected */}
        {isFiltered && (() => {
          const dist = data.rating_dist?.distribution || (Array.isArray(data.rating_dist) ? data.rating_dist : []);
          return (
            <ChartCard
              title={`Distribución de ratings — ${selectedName}`}
              loading={loading.rating_dist}
              expandedContent={
                dist.length > 0 ? (
                  <div className="h-[calc(90vh-100px)]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dist.map((d) => ({ rating: `${d.rating ?? d._id}★`, count: d.count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Reseñas" radius={[4, 4, 0, 0]}>
                          {dist.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null
              }
            >
              {dist.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dist.map((d) => ({ rating: `${d.rating ?? d._id}★`, count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Reseñas" radius={[4, 4, 0, 0]}>
                      {dist.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos de ratings</p>}
            </ChartCard>
          );
        })()}

        {/* Order Velocity - only when restaurant selected */}
        {isFiltered && (
          <ChartCard
            title={`Velocidad de pedidos — ${selectedName}`}
            loading={loading.velocity}
            expandedContent={
              Array.isArray(data.velocity) && data.velocity.length > 0 ? (
                <div className="h-[calc(90vh-100px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.velocity.map((d) => ({ ...d, label: new Date(d.window).toLocaleTimeString() }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} name="Pedidos" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : null
            }
          >
            {Array.isArray(data.velocity) && data.velocity.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.velocity.map((d) => ({ ...d, label: new Date(d.window).toLocaleTimeString() }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} name="Pedidos" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>}
          </ChartCard>
        )}

        {/* Avg Transition Time - only when restaurant selected */}
        {isFiltered && (
          <ChartCard
            title={`Tiempo promedio entre transiciones — ${selectedName}`}
            loading={loading.avg_transition}
            expandedContent={
              Array.isArray(data.avg_transition) && data.avg_transition.length > 0 ? (
                <div className="h-[calc(90vh-100px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.avg_transition.map((d) => ({ ...d, transition: `${d.from || "?"} → ${d.to}` }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="transition" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={(v) => `${typeof v === "number" ? v.toFixed(1) : v}s`} />
                      <Bar dataKey="avgDurationSec" fill="#EC4899" name="Segundos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null
            }
          >
            {Array.isArray(data.avg_transition) && data.avg_transition.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.avg_transition.map((d) => ({ ...d, transition: `${d.from || "?"} → ${d.to}` }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="transition" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(v) => `${typeof v === "number" ? v.toFixed(1) : v}s`} />
                  <Bar dataKey="avgDurationSec" fill="#EC4899" name="Segundos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              data.avg_transition ? (
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(data.avg_transition, null, 2)}
                </pre>
              ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
            )}
          </ChartCard>
        )}
      </div>

      {/* Batch Results */}
      {(data.batch_daily || data.batch_weekly) && (
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-2">Resultado de batch jobs</h3>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
            {JSON.stringify(
              { daily: data.batch_daily, weekly: data.batch_weekly },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
