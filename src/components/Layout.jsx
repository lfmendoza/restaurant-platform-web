import { NavLink, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useUser } from "../contexts/UserContext";
import { useCart } from "../contexts/CartContext";

const NAV_ITEMS = [
  { to: "/", label: "Restaurantes", icon: "🏪" },
  { to: "/orders", label: "Pedidos", icon: "📋" },
  { to: "/reviews", label: "Reseñas", icon: "⭐" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/simulation", label: "Simulación", icon: "🚀" },
  { to: "/users", label: "Usuarios", icon: "👥" },
  { to: "/files", label: "Archivos", icon: "📁" },
];

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700",
  restaurant_admin: "bg-purple-100 text-purple-700",
  restaurant_owner: "bg-purple-100 text-purple-700",
  delivery_driver: "bg-blue-100 text-blue-700",
  customer: "bg-green-100 text-green-700",
};

export default function Layout() {
  const { activeUser, loadingUser, ROLE_LABELS } = useUser();
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <NavLink to="/" className="text-2xl font-bold text-orange-500 shrink-0">
            RestaurantOps
          </NavLink>

          <nav className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide">
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive ? "bg-orange-100 text-orange-700" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-base">🛒</span>
              <span className="hidden sm:inline">Carrito</span>
              {cartCount > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </NavLink>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "bg-orange-100 text-orange-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/users"
            className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
          >
            {loadingUser ? (
              <span className="text-xs text-gray-400">Cargando...</span>
            ) : activeUser ? (
              <>
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {activeUser.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-medium text-gray-800 leading-tight max-w-[140px] truncate">
                    {activeUser.name}
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      ROLE_COLORS[activeUser.role] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ROLE_LABELS[activeUser.role] || activeUser.role}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-xs text-gray-400">Sin usuario</span>
            )}
          </NavLink>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
