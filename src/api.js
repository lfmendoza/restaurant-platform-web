const BASE = import.meta.env.VITE_API_URL || "";

async function req(method, path, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body && !isForm) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  } else if (isForm) {
    opts.body = body;
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// Users
export const createUser = (body) => req("POST", "/users", body);
export const getUser = (id) => req("GET", `/users/${id}`);
export const getUsers = (params = {}) =>
  req("GET", `/users?${new URLSearchParams(params)}`);
export const updateUser = (id, body) => req("PATCH", `/users/${id}`, body);
export const addFavorite = (id, restaurantId) =>
  req("PATCH", `/users/${id}/favorites`, { restaurantId });
export const deleteUser = (id) => req("DELETE", `/users/${id}`);

// Restaurants
export const createRestaurant = (body) => req("POST", "/restaurants", body);
export const createManyRestaurants = (restaurants) =>
  req("POST", "/restaurants/many", { restaurants });
export const searchRestaurants = (params) =>
  req("GET", `/restaurants/search?${new URLSearchParams(params)}`);
export const getRestaurants = (params = {}) =>
  req("GET", `/restaurants?${new URLSearchParams(params)}`);
export const getRestaurant = (id) => req("GET", `/restaurants/${id}`);
export const getMenuCategories = (id) =>
  req("GET", `/restaurants/${id}/menu-categories`);
export const getDeliveryZones = (id) =>
  req("GET", `/restaurants/${id}/delivery-zones`);
export const getDeliveryZonesBatch = (restaurantIds) =>
  req("POST", "/restaurants/delivery-zones/batch", { restaurantIds });
export const updateRestaurant = (id, body) =>
  req("PATCH", `/restaurants/${id}`, body);
export const updateRestaurantStatus = (id, body) =>
  req("PATCH", `/restaurants/${id}/status`, body);
export const deleteRestaurant = (id) => req("DELETE", `/restaurants/${id}`);

// Menu Items
export const createMenuItem = (body) => req("POST", "/menu-items", body);
export const createManyMenuItems = (items) =>
  req("POST", "/menu-items/many", { items });
export const getMenuItems = (params = {}) =>
  req("GET", `/menu-items?${new URLSearchParams(params)}`);
export const getMenuItem = (id) => req("GET", `/menu-items/${id}`);
export const updateMenuItem = (id, body) =>
  req("PATCH", `/menu-items/${id}`, body);
export const updateMenuItemAvailability = (id, available) =>
  req("PATCH", `/menu-items/${id}/availability`, { available });
export const updateCategoryPrice = (restaurantId, body) =>
  req("PATCH", `/menu-items/restaurant/${restaurantId}/category-price`, body);
export const bulkMenuItems = (operations) =>
  req("POST", "/menu-items/bulk", { operations });
export const deleteMenuItem = (id) => req("DELETE", `/menu-items/${id}`);
export const deleteManyMenuItems = (params = {}) =>
  req("DELETE", `/menu-items?${new URLSearchParams(params)}`);

// Carts
export const getCart = (userId, restaurantId) =>
  req(
    "GET",
    `/carts?${new URLSearchParams({ userId, ...(restaurantId ? { restaurantId } : {}) })}`
  );
export const addToCart = (body) => req("POST", "/carts/items", body);
export const updateCartItem = (menuItemId, body) =>
  req("PATCH", `/carts/items/${menuItemId}`, body);
export const removeFromCart = (menuItemId, userId) =>
  req("DELETE", `/carts/items/${menuItemId}?${new URLSearchParams({ userId })}`);
export const clearCart = (userId) =>
  req("DELETE", `/carts?${new URLSearchParams({ userId })}`);

// Orders
export const createOrder = (body) => req("POST", "/orders", body);
export const getOrders = (params = {}) =>
  req("GET", `/orders?${new URLSearchParams(params)}`);
export const getOrder = (id) => req("GET", `/orders/${id}`);
export const updateOrderStatus = (id, body) =>
  req("PATCH", `/orders/${id}/status`, body);
export const deleteCancelledOrders = (params = {}) =>
  req("DELETE", `/orders/cancelled?${new URLSearchParams(params)}`);
export const deleteOrder = (id) => req("DELETE", `/orders/${id}`);

// Reviews
export const createReview = (body) => req("POST", "/reviews", body);
export const getReviews = (params = {}) =>
  req("GET", `/reviews?${new URLSearchParams(params)}`);
export const getReview = (id) => req("GET", `/reviews/${id}`);
export const addReviewTag = (id, tag) =>
  req("PATCH", `/reviews/${id}/tag`, { tag });
export const addRestaurantResponse = (id, message) =>
  req("PATCH", `/reviews/${id}/response`, { message });
export const voteHelpful = (id) =>
  req("PATCH", `/reviews/${id}/helpful`);
export const deleteReview = (id) => req("DELETE", `/reviews/${id}`);
export const deleteManyReviews = (params = {}) =>
  req("DELETE", `/reviews?${new URLSearchParams(params)}`);

// Files
export const uploadFile = (formData) =>
  req("POST", "/files/upload", formData, true);
export const getFileUrl = (id) => `${BASE}/files/${id}`;
export const deleteFile = (id) => req("DELETE", `/files/${id}`);
export const listFiles = (params = {}) =>
  req("GET", `/files?${new URLSearchParams(params)}`);

// Analytics
export const getDashboard = () => req("GET", "/analytics/dashboard");
export const getCount = (params) =>
  req("GET", `/analytics/count?${new URLSearchParams(params)}`);
export const getDistinct = (params) =>
  req("GET", `/analytics/distinct?${new URLSearchParams(params)}`);
export const getTopRestaurants = (params = {}) =>
  req("GET", `/analytics/top-restaurants?${new URLSearchParams(params)}`);
export const getBestSellingItems = (params = {}) =>
  req("GET", `/analytics/best-selling-items?${new URLSearchParams(params)}`);
export const getRevenueByMonth = (params = {}) =>
  req("GET", `/analytics/revenue-by-month?${new URLSearchParams(params)}`);
export const getRatingDistribution = (restaurantId) =>
  req("GET", `/analytics/rating-distribution/${restaurantId}`);
export const getOrderVelocity = (restaurantId, params = {}) =>
  req(
    "GET",
    `/analytics/order-velocity/${restaurantId}?${new URLSearchParams(params)}`
  );
export const getAvgTransitionTime = (restaurantId) =>
  req("GET", `/analytics/avg-transition-time/${restaurantId}`);
export const getRestaurantStats = (params = {}) =>
  req("GET", `/analytics/restaurant-stats?${new URLSearchParams(params)}`);
export const getDailyRevenue = (params = {}) =>
  req("GET", `/analytics/daily-revenue?${new URLSearchParams(params)}`);
export const getTags = (params = {}) =>
  req("GET", `/analytics/tags?${new URLSearchParams(params)}`);
export const getAllergens = () => req("GET", `/analytics/allergens`);
export const getRevenueByCategory = (params = {}) =>
  req("GET", `/analytics/revenue-by-category?${new URLSearchParams(params)}`);
export const runBatch = (job, targetDate) =>
  req("POST", "/analytics/run-batch", { job, targetDate });

// Simulation
export const startSimulation = (body) => req("POST", "/simulation/start", body);
export const pauseSimulation = () => req("POST", "/simulation/pause");
export const resumeSimulation = () => req("POST", "/simulation/resume");
export const stopSimulation = () => req("POST", "/simulation/stop");
export const getSimulationStatus = () => req("GET", "/simulation/status");
export const getSimulationMetrics = () => req("GET", "/simulation/metrics");

export function createSSEConnection(url, handlers) {
  const eventSource = new EventSource(`${BASE}${url}`);
  eventSource.onopen = () => handlers.onOpen?.();
  eventSource.onerror = (e) => handlers.onError?.(e);
  if (handlers.onMessage) {
    eventSource.onmessage = (e) => {
      try {
        handlers.onMessage(JSON.parse(e.data));
      } catch {
        handlers.onMessage(e.data);
      }
    };
  }
  const eventTypes = [
    "order:created",
    "order:transitioned",
    "metrics:update",
    "simulation:complete",
    "simulation:started",
    "simulation:ready",
    "simulation:paused",
    "simulation:resumed",
    "simulation:error",
  ];
  for (const type of eventTypes) {
    eventSource.addEventListener(type, (e) => {
      try {
        handlers[type]?.(JSON.parse(e.data));
      } catch {
        handlers[type]?.(e.data);
      }
    });
  }
  return eventSource;
}

// Health
export const healthCheck = () => req("GET", "/health");
