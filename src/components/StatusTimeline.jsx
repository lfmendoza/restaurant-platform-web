const STATUS_META = {
  pending: { color: "bg-yellow-400", label: "Pendiente" },
  confirmed: { color: "bg-blue-400", label: "Confirmado" },
  preparing: { color: "bg-orange-400", label: "Preparando" },
  ready_for_pickup: { color: "bg-indigo-400", label: "Listo" },
  picked_up: { color: "bg-purple-400", label: "Recogido" },
  delivered: { color: "bg-green-500", label: "Entregado" },
  cancelled: { color: "bg-red-500", label: "Cancelado" },
};

const STATUS_ORDER = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "picked_up",
  "delivered",
];

export default function StatusTimeline({ statusHistory = [], currentStatus }) {
  const isCancelled = currentStatus === "cancelled";
  const steps = isCancelled
    ? statusHistory.map((h) => h.status)
    : STATUS_ORDER;

  const completedSet = new Set(statusHistory.map((h) => h.status));
  const historyMap = {};
  for (const h of statusHistory) {
    historyMap[h.status] = h;
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {steps.map((status, i) => {
        const meta = STATUS_META[status] || { color: "bg-gray-300", label: status };
        const isCompleted = completedSet.has(status);
        const isCurrent = status === currentStatus;
        const entry = historyMap[status];

        return (
          <div key={status} className="flex items-center">
            <div className="flex flex-col items-center min-w-[80px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  isCompleted || isCurrent
                    ? meta.color
                    : "bg-gray-200 text-gray-400"
                } ${isCurrent ? "ring-2 ring-offset-2 ring-orange-400" : ""}`}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  isCompleted || isCurrent ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {meta.label}
              </span>
              {entry && (
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              )}
              {entry?.durationFromPrevSec > 0 && (
                <span className="text-[10px] text-gray-400">
                  +{entry.durationFromPrevSec}s
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  completedSet.has(steps[i + 1]) ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
