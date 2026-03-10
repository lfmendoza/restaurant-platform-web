import { useState } from "react";
import RestaurantsPage from "./pages/RestaurantsPage";
import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import ReviewsPage from "./pages/ReviewsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import FilesPage from "./pages/FilesPage";

const TABS = [
  { id: "restaurants", label: "Restaurantes" },
  { id: "orders", label: "Mis Pedidos" },
  { id: "reviews", label: "Reseñas" },
  { id: "analytics", label: "Analytics" },
  { id: "files", label: "Archivos (GridFS)" },
];

// Simple global user ID for demo (first seeded user)
export const DEMO_USER_ID = localStorage.getItem("demoUserId") || "";

export default function App() {
  const [tab, setTab] = useState("restaurants");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="text-2xl font-bold text-orange-500">🍽 RestaurantOS</span>
          <nav className="flex gap-1 flex-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "bg-orange-100 text-orange-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "restaurants" && (
          <RestaurantsPage
            onSelectRestaurant={(r) => {
              setSelectedRestaurant(r);
              setTab("menu");
            }}
          />
        )}
        {tab === "menu" && selectedRestaurant && (
          <MenuPage
            restaurant={selectedRestaurant}
            cart={cart}
            setCart={setCart}
            onViewCart={() => setTab("cart")}
            onBack={() => setTab("restaurants")}
          />
        )}
        {tab === "cart" && (
          <CartPage
            cart={cart}
            setCart={setCart}
            onOrderPlaced={() => setTab("orders")}
            onBack={() => setTab("menu")}
          />
        )}
        {tab === "orders" && <OrdersPage />}
        {tab === "reviews" && <ReviewsPage />}
        {tab === "analytics" && <AnalyticsPage />}
        {tab === "files" && <FilesPage />}
      </main>
    </div>
  );
}
