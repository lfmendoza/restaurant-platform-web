const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

// Restaurants
export const createRestaurant = (body) => req("POST", "/restaurants", body);
export const searchRestaurants = (params) =>
  req("GET", `/restaurants/search?${new URLSearchParams(params)}`);
export const getRestaurants = (params = {}) =>
  req("GET", `/restaurants?${new URLSearchParams(params)}`);
export const getRestaurant = (id) => req("GET", `/restaurants/${id}`);
export const updateRestaurantStatus = (id, body) =>
  req("PATCH", `/restaurants/${id}/status`, body);
export const deleteRestaurant = (id) => req("DELETE", `/restaurants/${id}`);

// Menu Items
export const createMenuItem = (body) => req("POST", "/menu-items", body);
export const getMenuItems = (params = {}) =>
  req("GET", `/menu-items?${new URLSearchParams(params)}`);
export const getMenuItem = (id) => req("GET", `/menu-items/${id}`);
export const updateMenuItemAvailability = (id, available) =>
  req("PATCH", `/menu-items/${id}/availability`, { available });
export const bulkMenuItems = (operations) =>
  req("POST", "/menu-items/bulk", { operations });
export const deleteMenuItem = (id) => req("DELETE", `/menu-items/${id}`);

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

// Orders
export const createOrder = (body) => req("POST", "/orders", body);
export const getOrders = (params = {}) =>
  req("GET", `/orders?${new URLSearchParams(params)}`);
export const getOrder = (id) => req("GET", `/orders/${id}`);
export const updateOrderStatus = (id, body) =>
  req("PATCH", `/orders/${id}/status`, body);
export const deleteCancelledOrders = (params = {}) =>
  req("DELETE", `/orders/cancelled?${new URLSearchParams(params)}`);

// Reviews
export const createReview = (body) => req("POST", "/reviews", body);
export const getReviews = (params = {}) =>
  req("GET", `/reviews?${new URLSearchParams(params)}`);
export const addReviewTag = (id, tag) =>
  req("PATCH", `/reviews/${id}/tag`, { tag });
export const addRestaurantResponse = (id, message) =>
  req("PATCH", `/reviews/${id}/response`, { message });
export const deleteReview = (id) => req("DELETE", `/reviews/${id}`);

// Files
export const uploadFile = (formData) =>
  req("POST", "/files/upload", formData, true);
export const getFileUrl = (id) => `${BASE}/files/${id}`;
export const deleteFile = (id) => req("DELETE", `/files/${id}`);
export const listFiles = (params = {}) =>
  req("GET", `/files?${new URLSearchParams(params)}`);

// Analytics
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
