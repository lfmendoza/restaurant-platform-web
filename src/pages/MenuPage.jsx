import { useState, useEffect } from "react";
import { getMenuItems, addToCart, updateMenuItemAvailability, getFileUrl, createMenuItem, bulkMenuItems } from "../api";

const DEMO_USER_ID = "000000000000000000000001";

export default function MenuPage({ restaurant, cart, setCart, onViewCart, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", category: "Platos Principales", allergens: "" });
  const [cartCount, setCartCount] = useState(0);

  async function load(cat = category) {
    setLoading(true);
    try {
      const params = { restaurantId: restaurant._id, limit: 50 };
      if (cat) params.category = cat;
      const data = await getMenuItems(params);
      setItems(data);
      const cats = [...new Set(data.map(i => i.category))];
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(item) {
    try {
      const userId = localStorage.getItem("demoUserId") || DEMO_USER_ID;
      const result = await addToCart({ userId, menuItemId: item._id, quantity: 1 });
      setCart(result);
      setCartCount((result.items || []).length);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleToggleAvail(item) {
    try {
      await updateMenuItemAvailability(item._id, !item.available);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createMenuItem({
        restaurantId: restaurant._id,
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        allergens: form.allergens ? form.allergens.split(",").map(s => s.trim()) : [],
      });
      setShowCreate(false);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleBulkOps() {
    try {
      const result = await bulkMenuItems([
        {
          insertOne: {
            document: {
              restaurantId: restaurant._id,
              name: "Item Bulk Demo",
              price: 45.00,
              category: "Bebidas",
              allergens: [],
            },
          },
        },
        ...(items[0] ? [{
          updateOne: {
            filter: { _id: items[0]._id },
            update: { $set: { price: items[0].price * 1.05 } },
          },
        }] : []),
      ]);
      alert(`bulkWrite: inserted ${result.insertedCount}, modified ${result.modifiedCount}`);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  useEffect(() => { load(); }, [restaurant._id]);

  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button className="btn-secondary btn-sm" onClick={onBack}>← Volver</button>
        <h1 className="text-2xl font-bold flex-1">{restaurant.name}</h1>
        <button className="btn-primary btn-sm relative" onClick={onViewCart}>
          🛒 Carrito {cartCount > 0 && <span className="ml-1 bg-white text-orange-600 rounded-full px-1.5 text-xs font-bold">{cartCount}</span>}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={`btn-sm ${category === "" ? "btn-primary" : "btn-secondary"}`} onClick={() => { setCategory(""); load(""); }}>
          Todos
        </button>
        {categories.map(c => (
          <button key={c} className={`btn-sm ${category === c ? "btn-primary" : "btn-secondary"}`}
            onClick={() => { setCategory(c); load(c); }}>
            {c}
          </button>
        ))}
        <button className="btn-secondary btn-sm ml-auto" onClick={() => setShowCreate(!showCreate)}>+ Agregar platillo</button>
        <button className="btn-secondary btn-sm" onClick={handleBulkOps}>bulkWrite demo</button>
      </div>

      {showCreate && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">Nuevo platillo</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="input" type="number" placeholder="Precio" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
            <input className="input" placeholder="Categoría" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <input className="input" placeholder="Alérgenos (coma separados)" value={form.allergens} onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))} />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary btn-sm">Crear</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="text-gray-400 text-center py-8">Cargando menú...</div>}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-1">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {catItems.map(item => (
              <div key={item._id} className={`card ${!item.available ? "opacity-60" : ""}`}>
                {item.imageFileId && (
                  <img src={getFileUrl(item.imageFileId)} alt={item.name}
                    className="w-full h-32 object-cover" onError={e => (e.target.style.display = "none")} />
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>}
                    </div>
                    <span className="text-orange-600 font-bold text-sm ml-2">Q{item.price}</span>
                  </div>

                  {item.allergens?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.allergens.map(a => (
                        <span key={a} className="badge bg-yellow-50 text-yellow-700 text-xs">{a}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button className="btn-primary btn-sm flex-1 text-xs"
                      onClick={() => handleAddToCart(item)} disabled={!item.available}>
                      {item.available ? "Agregar al carrito" : "No disponible"}
                    </button>
                    <button className="btn-secondary btn-sm text-xs"
                      onClick={() => handleToggleAvail(item)}>
                      {item.available ? "↓ desactivar" : "↑ activar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
