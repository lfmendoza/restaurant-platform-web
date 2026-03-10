import { useState, useEffect, useRef, useCallback, memo } from "react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceDot, ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from "recharts";
import ChartCardExpandable from "../components/ChartCardExpandable";
import {
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  getSimulationStatus,
  getSimulationMetrics,
  createSSEConnection,
} from "../api";

const STATUS_COLORS = {
  pending: "#EAB308",
  confirmed: "#3B82F6",
  preparing: "#F97316",
  ready_for_pickup: "#6366F1",
  picked_up: "#A855F7",
  delivered: "#22C55E",
  cancelled: "#EF4444",
};

const PIE_COLORS = Object.values(STATUS_COLORS);

function parseTime(val) {
  if (val == null) return null;
  if (typeof val === "object" && val.formatted) return val.formatted;
  if (typeof val === "object" && val.ms != null) {
    const secs = Math.floor(val.ms / 1000);
    if (secs >= 60) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${secs}s`;
  }
  const num = Number(val);
  if (isNaN(num)) return null;
  const secs = num > 60000 ? Math.floor(num / 1000) : Math.floor(num);
  if (secs >= 60) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${secs}s`;
}

function clamp(value, min, max) {
  const n = Number(value);
  if (isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function ChartSkeleton({ height = 200 }) {
  return (
    <div style={{ height }} className="rounded overflow-hidden">
      <div className="h-full shimmer rounded" />
    </div>
  );
}

const ThroughputChart = memo(function ThroughputChart({ data, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="ordersPerMin"
          stroke="#F97316"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

const StatusDistChart = memo(function StatusDistChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          outerRadius={70}
          dataKey="value"
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});

function generateBellCurve(p50, p95, p99) {
  const mean = p50;
  const sigma1 = (p95 - p50) / 1.645;
  const sigma2 = (p99 - p50) / 2.326;
  const sigma = (sigma1 + sigma2) / 2;
  if (sigma <= 0 || isNaN(sigma)) return [];

  const lo = Math.max(0, mean - 3.5 * sigma);
  const hi = mean + 3.5 * sigma;
  const step = (hi - lo) / 80;
  const points = [];
  for (let x = lo; x <= hi; x += step) {
    const z = (x - mean) / sigma;
    const y = Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
    points.push({ latency: Math.round(x), density: y });
  }
  return points;
}

function densityAt(mean, sigma, x) {
  return Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
}

function LatencyBellChart({ p50, p95, p99, height = 240 }) {
  const curve = generateBellCurve(p50, p95, p99);
  if (curve.length === 0) return null;

  const mean = p50;
  const sigma = ((p95 - p50) / 1.645 + (p99 - p50) / 2.326) / 2;
  const d50 = densityAt(mean, sigma, p50);
  const d95 = densityAt(mean, sigma, p95);
  const d99 = densityAt(mean, sigma, p99);

  const maxDensity = Math.max(d50, d95, d99, ...curve.map((c) => c.density));
  const yDomainMax = maxDensity * 1.35;

  const lo = Math.max(0, mean - 3.5 * sigma);
  const hi = mean + 3.5 * sigma;
  const xDomain = [Math.floor(lo), Math.ceil(hi)];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        key={`${p50}-${p95}-${p99}`}
        data={curve}
        margin={{ top: 50, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="latency"
          type="number"
          domain={xDomain}
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`}
        />
        <YAxis
          dataKey="density"
          domain={[0, yDomainMax]}
          tick={{ fontSize: 9 }}
          tickFormatter={(v) => v.toExponential(1)}
          label={{ value: "Densidad", angle: -90, position: "insideLeft", fontSize: 10 }}
        />
        <Tooltip
          formatter={(v) => v.toFixed(6)}
          labelFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${v}ms`}
        />
        <Area type="monotone" dataKey="density" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} isAnimationActive={false} />
        <ReferenceLine
          segment={[{ x: p50, y: 0 }, { x: p50, y: yDomainMax }]}
          stroke="#3B82F6"
          strokeWidth={2}
          label={{ value: `p50: ${p50.toFixed(0)}ms`, position: "top", fontSize: 10, fill: "#3B82F6", dy: 0 }}
        />
        <ReferenceLine
          segment={[{ x: p95, y: 0 }, { x: p95, y: yDomainMax }]}
          stroke="#F97316"
          strokeWidth={2}
          label={{ value: `p95: ${p95.toFixed(0)}ms`, position: "top", fontSize: 10, fill: "#F97316", dy: 14 }}
        />
        <ReferenceLine
          segment={[{ x: p99, y: 0 }, { x: p99, y: yDomainMax }]}
          stroke="#EF4444"
          strokeWidth={2}
          label={{ value: `p99: ${p99.toFixed(0)}ms`, position: "top", fontSize: 10, fill: "#EF4444", dy: 28 }}
        />
        <ReferenceDot x={Math.round(p50)} y={d50} r={8} fill="#3B82F6" stroke="#fff" strokeWidth={2} />
        <ReferenceDot x={Math.round(p95)} y={d95} r={8} fill="#F97316" stroke="#fff" strokeWidth={2} />
        <ReferenceDot x={Math.round(p99)} y={d99} r={8} fill="#EF4444" stroke="#fff" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const ZONE_LABEL_SHORT = {
  "Carretera a El Salvador": "CAES",
  "Carretera El Salvador": "CAES",
};

function shortenZoneLabel(zone) {
  return ZONE_LABEL_SHORT[zone] || zone;
}

const PatternChart = memo(function PatternChart({ data, title, color = "#14B8A6", height }) {
  if (!data || data.length === 0) return null;
  const h = height ?? Math.max(180, data.length * 28);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
        <Tooltip />
        <Bar dataKey="value" fill={color} isAnimationActive={false} name="Pedidos">
          <LabelList dataKey="value" position="right" fontSize={10} formatter={(v) => v} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

const ZoneHeatmapChart = memo(function ZoneHeatmapChart({ data, height = 200 }) {
  const chartData = data.map((d) => ({ ...d, zoneLabel: shortenZoneLabel(d.zone) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="zoneLabel" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip formatter={(v) => [v, "Pedidos"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.zone ?? _} />
        <Bar dataKey="count" fill="#6366F1" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
});

let eventIdCounter = 0;

const LS_KEY = "sim_last_results";

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {}
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function SimulationPage() {
  const cached = loadFromLocalStorage();

  const [config, setConfig] = useState({
    durationMinutes: 1,
    ordersPerMinute: 5,
    peakMultiplier: 2,
    speedMultiplier: 10,
  });
  const [status, setStatus] = useState(cached?.status || null);
  const [metrics, setMetrics] = useState(cached?.metrics || null);
  const [events, setEvents] = useState(cached?.events || []);
  const [throughputHistory, setThroughputHistory] = useState(cached?.throughputHistory || []);
  const [statusDist, setStatusDist] = useState(cached?.statusDist || []);
  const [loading, setLoading] = useState("");
  const [restoredFromCache, setRestoredFromCache] = useState(!!cached);
  const [totalEvents, setTotalEvents] = useState(cached?.events?.length ?? 0);
  const cachedSavedAt = useRef(cached?.savedAt);
  const eventSourceRef = useRef(null);
  const eventFeedRef = useRef(null);
  const eventBufferRef = useRef([]);
  const flushScheduledRef = useRef(false);
  const latestMetricsRef = useRef(null);
  const mountedRef = useRef(true);

  const statusRef = useRef(status);
  const metricsRef = useRef(metrics);
  const eventsRef = useRef(events);
  const throughputRef = useRef(throughputHistory);
  const statusDistRef = useRef(statusDist);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);
  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { throughputRef.current = throughputHistory; }, [throughputHistory]);
  useEffect(() => { statusDistRef.current = statusDist; }, [statusDist]);

  const persistSnapshot = useCallback(() => {
    saveToLocalStorage({
      status: statusRef.current,
      metrics: metricsRef.current,
      events: eventsRef.current,
      throughputHistory: throughputRef.current,
      statusDist: statusDistRef.current,
    });
  }, []);

  const flushEvents = useCallback(() => {
    flushScheduledRef.current = false;
    const buffered = eventBufferRef.current;
    if (buffered.length === 0) return;
    eventBufferRef.current = [];
    setTotalEvents((n) => n + buffered.length);
    setEvents((prev) => [...prev, ...buffered].slice(-150));
  }, []);

  const addEvent = useCallback((type, data) => {
    eventBufferRef.current.push({
      type,
      data,
      time: new Date().toLocaleTimeString(),
      id: ++eventIdCounter,
    });
    if (!flushScheduledRef.current) {
      flushScheduledRef.current = true;
      requestAnimationFrame(flushEvents);
    }
  }, [flushEvents]);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    eventSourceRef.current = createSSEConnection("/simulation/stream", {
      onOpen: () => addEvent("system", { message: "SSE conectado" }),
      onError: () => {},
      "order:created": (data) => addEvent("order:created", data),
      "order:transitioned": (data) => addEvent("order:transitioned", data),
      "simulation:started": (data) => addEvent("simulation:started", data),
      "simulation:ready": (data) => {
        setStatus(data);
        addEvent("simulation:started", { message: "Simulación iniciada", config: data?.config });
      },
      "simulation:error": (data) => {
        toast.error(data?.error || "Error al iniciar simulación");
      },
      "metrics:update": (data) => {
        latestMetricsRef.current = data;
      },
      "simulation:complete": (data) => {
        addEvent("simulation:complete", data);
        setStatus((s) => {
          const updated = { ...s, state: "completed" };
          statusRef.current = updated;
          return updated;
        });
        setTimeout(persistSnapshot, 500);
        if (mountedRef.current) toast.success("Simulación completada");
      },
      "simulation:paused": (data) => {
        addEvent("simulation:paused", data);
        setStatus((s) => ({ ...s, state: "paused" }));
      },
      "simulation:resumed": (data) => {
        addEvent("simulation:resumed", data);
        setStatus((s) => ({ ...s, state: "running" }));
      },
    });
  }, [addEvent, persistSnapshot]);

  function disconnectSSE() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  async function handleStart() {
    setLoading("start");
    try {
      setEvents([]);
      setTotalEvents(0);
      setThroughputHistory([]);
      setStatusDist([]);
      setMetrics(null);
      setRestoredFromCache(false);
      connectSSE();
      const res = await startSimulation(config);
      setStatus(res);
      toast.success("Simulación iniciada");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading("");
    }
  }

  async function handlePause() {
    setLoading("pause");
    try {
      await pauseSimulation();
      setStatus((s) => ({ ...s, state: "paused" }));
      persistSnapshot();
      toast.success("Simulación pausada");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading("");
    }
  }

  async function handleResume() {
    setLoading("resume");
    try {
      await resumeSimulation();
      setStatus((s) => ({ ...s, state: "running" }));
      toast.success("Simulación reanudada");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading("");
    }
  }

  async function handleStop() {
    setLoading("stop");
    try {
      await stopSimulation();
      setStatus((s) => {
        const updated = { ...s, state: "stopped" };
        statusRef.current = updated;
        return updated;
      });
      disconnectSSE();
      persistSnapshot();
      toast.success("Simulación detenida");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading("");
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const s = await getSimulationStatus();
        if (!mountedRef.current) return;
        setStatus(s);

        const isActive = s?.state === "running" || s?.state === "paused";

        if (isActive) {
          setRestoredFromCache(false);
          try {
            const m = await getSimulationMetrics();
            if (!mountedRef.current) return;
            setMetrics(m);
            if (m?.statusDistribution) {
              setStatusDist(
                Object.entries(m.statusDistribution).map(([name, value]) => ({ name, value }))
              );
            }
          } catch {}
          connectSSE();
        }
      } catch {}
    })();

    const metricsInterval = setInterval(() => {
      const data = latestMetricsRef.current;
      if (!data) return;
      latestMetricsRef.current = null;
      setMetrics(data);

      setStatus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          elapsed: data.elapsed || prev.elapsed,
          remaining: data.remaining || prev.remaining,
          orders: data.orders || prev.orders,
          ordersCreated: data.orders?.totalCreated ?? prev.ordersCreated,
        };
      });

      const now = new Date().toLocaleTimeString();

      if (data.throughput) {
        setThroughputHistory((prev) =>
          [...prev, { time: now, ordersPerMin: data.throughput.completedInWindow || 0 }].slice(-60)
        );
      }

      if (data.statusDistribution) {
        setStatusDist(
          Object.entries(data.statusDistribution).map(([name, value]) => ({ name, value }))
        );
      }
    }, 1000);

    const saveInterval = setInterval(() => {
      if (statusRef.current?.state === "running" || statusRef.current?.state === "paused") {
        persistSnapshot();
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(metricsInterval);
      clearInterval(saveInterval);
      persistSnapshot();
      disconnectSSE();
    };
  }, [connectSSE, persistSnapshot]);

  useEffect(() => {
    const container = eventFeedRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [events]);

  const isRunning = status?.state === "running";
  const isPaused = status?.state === "paused";
  const isStarting = status?.state === "starting";
  const isIdle = !status || status.state === "stopped" || status.state === "completed" || status.state === "idle";
  const isSimulationActive = isStarting || isRunning || isPaused;

  const elapsedStr = parseTime(status?.elapsed);
  const remainingStr = parseTime(status?.remaining);
  const ordersCreated = status?.ordersCreated ?? status?.orders?.totalCreated;

  const zoneData = metrics?.zoneHeatmap
    ? Object.entries(metrics.zoneHeatmap).map(([zone, count]) => ({ zone, count }))
    : null;

  const patternByCuisine = metrics?.patterns?.byCuisine
    ? Object.entries(metrics.patterns.byCuisine).map(([name, value]) => ({ name, value }))
    : [];
  const patternByPayment = metrics?.patterns?.byPaymentMethod
    ? Object.entries(metrics.patterns.byPaymentMethod).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Simulación en Tiempo Real</h1>

      {restoredFromCache && isIdle && metrics && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3 mb-4 flex items-center justify-between">
          <span>
            Mostrando resultados de la última simulación
            {cachedSavedAt.current && (
              <span className="text-blue-500 ml-1">
                ({new Date(cachedSavedAt.current).toLocaleString()})
              </span>
            )}
          </span>
          <button
            className="text-xs text-blue-600 underline"
            onClick={() => {
              setRestoredFromCache(false);
              setStatus(null);
              setMetrics(null);
              setEvents([]);
              setTotalEvents(0);
              setThroughputHistory([]);
              setStatusDist([]);
              localStorage.removeItem(LS_KEY);
            }}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-3">Configuración</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500">Duración (min)</label>
            <select
              className="input"
              value={config.durationMinutes}
              onChange={(e) =>
                setConfig((c) => ({ ...c, durationMinutes: Number(e.target.value) }))
              }
              disabled={!isIdle}
            >
              {[1, 5, 10, 15].map((v) => (
                <option key={v} value={v}>{v} min</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-0.5">Minutos de tiempo simulado</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Pedidos/min</label>
            <input
              className="input"
              type="number"
              min="1"
              max="50"
              value={config.ordersPerMinute}
              onChange={(e) =>
                setConfig((c) => ({ ...c, ordersPerMinute: clamp(e.target.value, 1, 50) }))
              }
              disabled={!isIdle}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Órdenes por minuto simulado (1-50)</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Peak Multiplier</label>
            <input
              className="input"
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={config.peakMultiplier}
              onChange={(e) =>
                setConfig((c) => ({ ...c, peakMultiplier: clamp(e.target.value, 1, 10) }))
              }
              disabled={!isIdle}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Factor durante picos de demanda (1-10)</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Speed Multiplier</label>
            <input
              className="input"
              type="number"
              min="1"
              max="100"
              value={config.speedMultiplier}
              onChange={(e) =>
                setConfig((c) => ({ ...c, speedMultiplier: clamp(e.target.value, 1, 100) }))
              }
              disabled={!isIdle}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Velocidad del reloj: 10x = 1 min en 6s reales</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isIdle && (
            <button className="btn-primary" onClick={handleStart} disabled={loading === "start"}>
              {loading === "start" ? "Conectando..." : "▶ Iniciar simulación"}
            </button>
          )}
          {isStarting && (
            <span className="btn-secondary opacity-75 cursor-not-allowed">Iniciando en segundo plano...</span>
          )}
          {isRunning && (
            <button className="btn-secondary" onClick={handlePause} disabled={loading === "pause"}>
              ⏸ Pausar
            </button>
          )}
          {isPaused && (
            <button className="btn-primary" onClick={handleResume} disabled={loading === "resume"}>
              ▶ Reanudar
            </button>
          )}
          {(isRunning || isPaused) && (
            <button className="btn-danger" onClick={handleStop} disabled={loading === "stop"}>
              ⏹ Detener
            </button>
          )}
          {!eventSourceRef.current && !isIdle && (
            <button className="btn-secondary btn-sm" onClick={connectSSE}>
              Reconectar SSE
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Estado: </span>
              <span
                className={`font-bold ${
                  isStarting ? "text-blue-600 animate-pulse" : isRunning ? "text-green-600" : isPaused ? "text-yellow-600" : "text-gray-600"
                }`}
              >
                {status.state?.toUpperCase()}
                {isStarting && "..."}
              </span>
            </div>
            {elapsedStr && (
              <div>
                <span className="text-gray-500">Transcurrido: </span>
                <span className="font-mono">{elapsedStr}</span>
              </div>
            )}
            {remainingStr && (
              <div>
                <span className="text-gray-500">Restante: </span>
                <span className="font-mono">{remainingStr}</span>
              </div>
            )}
            {ordersCreated != null && (
              <div>
                <span className="text-gray-500">Pedidos creados: </span>
                <span className="font-bold text-orange-600">{ordersCreated}</span>
              </div>
            )}
            {metrics?.orders && (
              <>
                <div>
                  <span className="text-gray-500">Completados: </span>
                  <span className="font-bold text-green-600">{metrics.orders.totalCompleted || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cancelados: </span>
                  <span className="font-bold text-red-600">{metrics.orders.totalCancelled || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Throughput */}
        <ChartCardExpandable
          title="Throughput (pedidos/min)"
          expandedContent={
            throughputHistory.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <ThroughputChart data={throughputHistory} height="100%" />
              </div>
            ) : null
          }
        >
          {throughputHistory.length > 0 ? (
            <ThroughputChart data={throughputHistory} />
          ) : isSimulationActive ? (
            <ChartSkeleton height={200} />
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">
              Inicia una simulación para ver datos
            </div>
          )}
        </ChartCardExpandable>

        {/* Status Distribution */}
        <ChartCardExpandable
          title="Distribución de estados"
          expandedContent={
            statusDist.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <StatusDistChart data={statusDist} height="100%" />
              </div>
            ) : null
          }
        >
          {statusDist.length > 0 ? (
            <StatusDistChart data={statusDist} />
          ) : isSimulationActive ? (
            <ChartSkeleton height={250} />
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">
              Sin datos de distribución
            </div>
          )}
        </ChartCardExpandable>

        {/* Latency distribution (bell curve) */}
        <ChartCardExpandable
          title="Distribución de latencia"
          expandedContent={
            metrics?.latency?.count > 0 && metrics.latency.p50 > 0 && metrics.latency.p95 > metrics.latency.p50 ? (
              <div className="h-[calc(90vh-100px)]">
                <LatencyBellChart
                  p50={metrics.latency.p50}
                  p95={metrics.latency.p95}
                  p99={metrics.latency.p99}
                  height="100%"
                />
              </div>
            ) : null
          }
        >
          {isSimulationActive && !metrics?.latency?.count ? (
            <ChartSkeleton height={280} />
          ) : metrics?.latency && metrics.latency.count > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-3 text-center mb-4">
                <div>
                  <div className="text-xl font-bold text-blue-600">
                    {metrics.latency.p50?.toFixed(0) || "\u2014"}
                  </div>
                  <div className="text-[10px] text-gray-500">p50 (ms)</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-orange-600">
                    {metrics.latency.p95?.toFixed(0) || "\u2014"}
                  </div>
                  <div className="text-[10px] text-gray-500">p95 (ms)</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">
                    {metrics.latency.p99?.toFixed(0) || "\u2014"}
                  </div>
                  <div className="text-[10px] text-gray-500">p99 (ms)</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-600">
                    {metrics.latency.avg?.toFixed(0) || "\u2014"}
                  </div>
                  <div className="text-[10px] text-gray-500">avg (ms)</div>
                </div>
              </div>
              {metrics.latency.p50 > 0 && metrics.latency.p95 > metrics.latency.p50 && (
                <LatencyBellChart
                  p50={metrics.latency.p50}
                  p95={metrics.latency.p95}
                  p99={metrics.latency.p99}
                />
              )}
            </>
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">
              Sin datos de latencia
            </div>
          )}
        </ChartCardExpandable>

        {/* Zone Heatmap */}
        <ChartCardExpandable
          title="Heatmap por zona"
          expandedContent={
            zoneData && zoneData.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <ZoneHeatmapChart data={zoneData} height="100%" />
              </div>
            ) : null
          }
        >
          {zoneData && zoneData.length > 0 ? (
            <ZoneHeatmapChart data={zoneData} />
          ) : isSimulationActive ? (
            <ChartSkeleton height={200} />
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">
              Sin datos de zona
            </div>
          )}
        </ChartCardExpandable>

        {/* Patterns by Cuisine */}
        <ChartCardExpandable
          title="Pedidos por tipo de cocina"
          expandedContent={
            patternByCuisine.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <PatternChart data={patternByCuisine} title="Cocina" color="#14B8A6" height="100%" />
              </div>
            ) : null
          }
        >
          {patternByCuisine.length > 0 ? (
            <PatternChart data={patternByCuisine} title="Cocina" color="#14B8A6" />
          ) : isSimulationActive ? (
            <ChartSkeleton height={180} />
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">
              Sin datos de cocina
            </div>
          )}
        </ChartCardExpandable>

        {/* Patterns by Payment */}
        <ChartCardExpandable
          title="Pedidos por método de pago"
          expandedContent={
            patternByPayment.length > 0 ? (
              <div className="h-[calc(90vh-100px)]">
                <PatternChart data={patternByPayment} title="Pago" color="#EC4899" height="100%" />
              </div>
            ) : null
          }
        >
          {patternByPayment.length > 0 ? (
            <PatternChart data={patternByPayment} title="Pago" color="#EC4899" />
          ) : isSimulationActive ? (
            <ChartSkeleton height={180} />
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">
              Sin datos de pago
            </div>
          )}
        </ChartCardExpandable>
      </div>

      {/* Raw Metrics */}
      {metrics && (
        <div className="card p-4 mb-6">
          <details>
            <summary className="font-semibold text-sm cursor-pointer">
              Métricas completas (JSON)
            </summary>
            <pre className="text-xs bg-gray-50 p-3 rounded mt-2 overflow-auto max-h-64">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Event Feed */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">
          Feed de eventos en tiempo real ({totalEvents})
          {events.length < totalEvents && (
            <span className="text-gray-500 font-normal ml-1">
              · mostrando últimos {events.length}
            </span>
          )}
        </h3>
        <div
          ref={eventFeedRef}
          className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs"
        >
          {events.length === 0 && (
            <p className="text-gray-400">No hay eventos. Inicia una simulación.</p>
          )}
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`flex gap-2 py-0.5 ${
                ev.type === "order:created"
                  ? "text-green-700"
                  : ev.type === "order:transitioned"
                  ? "text-blue-700"
                  : ev.type.startsWith("simulation:")
                  ? "text-orange-700 font-bold"
                  : "text-gray-500"
              }`}
            >
              <span className="text-gray-400 shrink-0">{ev.time}</span>
              <span className="shrink-0 w-36">[{ev.type}]</span>
              <span className="truncate">
                {typeof ev.data === "string"
                  ? ev.data
                  : ev.type === "simulation:started"
                  ? (ev.data?.message || "Simulación iniciada")
                  : ev.data?.orderNumber ||
                    ev.data?.message ||
                    JSON.stringify(ev.data)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
