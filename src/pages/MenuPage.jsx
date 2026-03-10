import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUser } from "../contexts/UserContext";
import { useCart } from "../contexts/CartContext";
import {
  getMenuItems,
  getRestaurant,
  getMenuCategories,
  addToCart,
  updateMenuItemAvailability,
  getFileUrl,
  createMenuItem,
  updateMenuItem,
  createManyMenuItems,
  updateCategoryPrice,
  bulkMenuItems,
  deleteMenuItem,
} from "../api";

export default function MenuPage() {
  const { id: restaurantId } = useParams();
  const navigate = useNavigate();
  const { userId } = useUser();

  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showCatPrice, setShowCatPrice] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Platos Principales",
    description: "",
    allergens: "",
  });
  const [bulkJson, setBulkJson] = useState("");
  const [catPriceForm, setCatPriceForm] = useState({
    category: "",
    priceChange: "",
    type: "increase",
  });
  const { cartCount, refreshCartCount, setCartCountFromCart } = useCart();

  async function loadRestaurant() {
    try {
      const r = await getRestaurant(restaurantId);
      setRestaurant(r);
    } catch {
      /* ignore */
    }
  }

  async function loadCategories() {
    try {
      const cats = await getMenuCategories(restaurantId);
      if (Array.isArray(cats)) {
        setCategories(cats.map((c) => (typeof c === "string" ? c : c._id)));
      }
    } catch {
      /* fallback to items */
    }
  }

  async function load(cat = category) {
    setLoading(true);
    try {
      const params = { restaurantId, limit: 100 };
      if (cat) params.category = cat;
      if (search.trim()) params.q = search.trim();
      if (sortBy) params.sort = sortBy;
      const data = await getMenuItems(params);
      setItems(data);
      if (categories.length === 0) {
        const cats = [...new Set(data.map((i) => i.category))];
        setCategories(cats);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(item) {
    try {
      const result = await addToCart({
        userId,
        menuItemId: item._id,
        quantity: 1,
      });
      setCartCountFromCart(result);
      toast.success(`${item.name} agregado al carrito`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleToggleAvail(item) {
    try {
      await updateMenuItemAvailability(item._id, !item.available);
      toast.success(
        item.available ? "Item desactivado" : "Item activado"
      );
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createMenuItem({
        restaurantId,
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        allergens: form.allergens
          ? form.allergens.split(",").map((s) => s.trim())
          : [],
      });
      setShowCreate(false);
      setForm({
        name: "",
        price: "",
        category: "Platos Principales",
        description: "",
        allergens: "",
      });
      toast.success("Platillo creado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleUpdateItem(e) {
    e.preventDefault();
    try {
      await updateMenuItem(editingItem._id, {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        allergens: form.allergens
          ? form.allergens.split(",").map((s) => s.trim())
          : [],
      });
      setEditingItem(null);
      toast.success("Platillo actualizado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDeleteItem(id) {
    if (!confirm("Eliminar este platillo?")) return;
    try {
      await deleteMenuItem(id);
      toast.success("Platillo eliminado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleBulkCreate() {
    try {
      const parsed = JSON.parse(bulkJson);
      const itemsToCreate = (Array.isArray(parsed) ? parsed : [parsed]).map(
        (item) => ({ ...item, restaurantId })
      );
      const result = await createManyMenuItems(itemsToCreate);
      toast.success(
        `${result.insertedCount || "Varios"} items creados`
      );
      setShowBulk(false);
      setBulkJson("");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleCategoryPriceUpdate() {
    try {
      await updateCategoryPrice(restaurantId, catPriceForm);
      toast.success("Precios actualizados por categoría");
      setShowCatPrice(false);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleBulkOps() {
    try {
      const result = await bulkMenuItems([
        {
          insertOne: {
            document: {
              restaurantId,
              name: "Item Bulk Demo",
              price: 45.0,
              category: "Bebidas",
              allergens: [],
            },
          },
        },
        ...(items[0]
          ? [
              {
                updateOne: {
                  filter: { _id: items[0]._id },
                  update: { $set: { price: items[0].price * 1.05 } },
                },
              },
            ]
          : []),
      ]);
      toast.success(
        `bulkWrite: inserted ${result.insertedCount}, modified ${result.modifiedCount}`
      );
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    loadRestaurant();
    loadCategories();
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId && userId) refreshCartCount(userId, restaurantId);
  }, [restaurantId, userId, refreshCartCount]);

  useEffect(() => {
    if (restaurantId) load();
  }, [restaurantId, category, sortBy]);

  const grouped = categories.reduce((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  const ungrouped = items.filter(
    (i) => !categories.includes(i.category)
  );
  if (ungrouped.length > 0) grouped["Otros"] = ungrouped;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          className="btn-secondary btn-sm"
          onClick={() => navigate("/")}
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold flex-1">
          {restaurant?.name || "Menú"}
        </h1>
        <button
          className="btn-primary btn-sm relative"
          onClick={() => navigate("/cart")}
        >
          🛒 Carrito
          {cartCount > 0 && (
            <span className="ml-1 bg-white text-orange-600 rounded-full px-1.5 text-xs font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Search and Sort */}
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500">Buscar platillos</label>
            <input
              className="input"
              placeholder="Buscar platillos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Ordenar</label>
            <select
              className="input w-40"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="">Predeterminado</option>
              <option value="price">Precio ↑</option>
              <option value="-price">Precio ↓</option>
              <option value="-salesCount">Más vendidos</option>
            </select>
          </div>
          <button className="btn-primary btn-sm" onClick={() => load()}>
            Buscar
          </button>
        </div>
      </div>

      {/* Category Tabs + Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`btn-sm ${
            category === "" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => setCategory("")}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`btn-sm ${
              category === c ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
        <div className="flex gap-1 ml-auto">
          <button
            className="btn-secondary btn-sm text-xs"
            onClick={() => setShowCreate(!showCreate)}
          >
            + Agregar
          </button>
          <button
            className="btn-secondary btn-sm text-xs"
            onClick={() => setShowBulk(!showBulk)}
          >
            insertMany
          </button>
          <button
            className="btn-secondary btn-sm text-xs"
            onClick={() => setShowCatPrice(!showCatPrice)}
          >
            Precio/Cat
          </button>
          <button
            className="btn-secondary btn-sm text-xs"
            onClick={handleBulkOps}
          >
            bulkWrite
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingItem) && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">
            {editingItem ? "Editar platillo" : "Nuevo platillo"}
          </h2>
          <form
            onSubmit={editingItem ? handleUpdateItem : handleCreate}
            className="grid grid-cols-2 gap-3"
          >
            <input
              className="input"
              placeholder="Nombre"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              required
            />
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="Precio"
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: e.target.value }))
              }
              required
            />
            <input
              className="input"
              placeholder="Categoría"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Descripción"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <input
              className="input col-span-2"
              placeholder="Alérgenos (separados por coma)"
              value={form.allergens}
              onChange={(e) =>
                setForm((f) => ({ ...f, allergens: e.target.value }))
              }
            />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary btn-sm">
                {editingItem ? "Actualizar" : "Crear"}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  setShowCreate(false);
                  setEditingItem(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Insert */}
      {showBulk && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">
            insertMany (POST /menu-items/many)
          </h2>
          <textarea
            className="input font-mono text-xs h-32"
            placeholder='[{"name":"Tacos","price":35,"category":"Entradas","allergens":["gluten"]}]'
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button
              className="btn-primary btn-sm"
              onClick={handleBulkCreate}
            >
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

      {/* Category Price Update */}
      {showCatPrice && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">
            Actualizar precio por categoría
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <input
              className="input"
              placeholder="Categoría"
              value={catPriceForm.category}
              onChange={(e) =>
                setCatPriceForm((f) => ({
                  ...f,
                  category: e.target.value,
                }))
              }
            />
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="Cambio de precio"
              value={catPriceForm.priceChange}
              onChange={(e) =>
                setCatPriceForm((f) => ({
                  ...f,
                  priceChange: e.target.value,
                }))
              }
            />
            <select
              className="input"
              value={catPriceForm.type}
              onChange={(e) =>
                setCatPriceForm((f) => ({
                  ...f,
                  type: e.target.value,
                }))
              }
            >
              <option value="increase">Incrementar</option>
              <option value="decrease">Decrementar</option>
              <option value="set">Establecer</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className="btn-primary btn-sm"
              onClick={handleCategoryPriceUpdate}
            >
              Aplicar
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowCatPrice(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-gray-400 text-center py-8">
          Cargando menú...
        </div>
      )}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-1">
            {cat}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {catItems.map((item) => (
              <div
                key={item._id}
                className={`card ${!item.available ? "opacity-60" : ""}`}
              >
                {item.imageFileId && (
                  <img
                    src={getFileUrl(item.imageFileId)}
                    alt={item.name}
                    className="w-full h-32 object-cover"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="text-orange-600 font-bold text-sm ml-2">
                      Q{item.price}
                    </span>
                  </div>

                  {item.allergens?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.allergens.map((a) => (
                        <span
                          key={a}
                          className="badge bg-yellow-50 text-yellow-700 text-xs"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.salesCount > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {item.salesCount} vendidos
                    </div>
                  )}

                  <div className="flex gap-1 mt-2">
                    <button
                      className="btn-primary btn-sm flex-1 text-xs"
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.available}
                    >
                      {item.available ? "Agregar" : "No disponible"}
                    </button>
                    <button
                      className="btn-secondary btn-sm text-xs"
                      onClick={() => handleToggleAvail(item)}
                    >
                      {item.available ? "↓" : "↑"}
                    </button>
                    <button
                      className="btn-secondary btn-sm text-xs"
                      onClick={() => {
                        setEditingItem(item);
                        setShowCreate(false);
                        setForm({
                          name: item.name,
                          price: String(item.price),
                          category: item.category,
                          description: item.description || "",
                          allergens: (item.allergens || []).join(", "),
                        });
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="btn-danger btn-sm text-xs"
                      onClick={() => handleDeleteItem(item._id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && items.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No hay platillos en el menú.
        </div>
      )}
    </div>
  );
}
