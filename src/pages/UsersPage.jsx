import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  addFavorite,
  getRestaurants,
} from "../api";
import { useUser } from "../contexts/UserContext";

const ROLE_COLORS = {
  admin: "bg-red-50 text-red-700",
  restaurant_admin: "bg-purple-50 text-purple-700",
  restaurant_owner: "bg-purple-50 text-purple-700",
  delivery_driver: "bg-blue-50 text-blue-700",
  customer: "bg-green-50 text-green-700",
};

const ROLE_FILTER_LABELS = {
  "": "Todos",
  customer: "Customers",
  restaurant_admin: "Rest. Admins",
  restaurant_owner: "Owners",
  admin: "Admins",
  delivery_driver: "Drivers",
};

export default function UsersPage() {
  const { userId, setUserId, ROLE_LABELS } = useUser();
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "customer",
    phone: "",
  });
  const [editForm, setEditForm] = useState({ name: "", phone: "" });

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (roleFilter) params.role = roleFilter;
      const data = await getUsers(params);
      setUsers(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRestaurants() {
    try {
      const data = await getRestaurants({ limit: 50 });
      setRestaurants(data);
    } catch {
      /* ignore */
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createUser(form);
      toast.success("Usuario creado");
      setShowCreate(false);
      setForm({ name: "", email: "", role: "customer", phone: "" });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleUpdate(id) {
    try {
      await updateUser(id, editForm);
      toast.success("Usuario actualizado");
      setEditingId(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar este usuario?")) return;
    try {
      await deleteUser(id);
      toast.success("Usuario eliminado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleAddFavorite(uid) {
    const restaurantId = prompt("Restaurant ID para agregar a favoritos:");
    if (!restaurantId) return;
    try {
      await addFavorite(uid, restaurantId.trim());
      toast.success("Favorito agregado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function handleImpersonate(id, name) {
    setUserId(id);
    toast.success(`Ahora eres: ${name}`);
  }

  useEffect(() => {
    load();
    loadRestaurants();
  }, [roleFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button
          className="btn-primary btn-sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {Object.entries(ROLE_FILTER_LABELS).map(([r, label]) => (
          <button
            key={r}
            className={`btn-sm ${
              roleFilter === r ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setRoleFilter(r)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">Crear usuario</h2>
          <form
            onSubmit={handleCreate}
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
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
            />
            <select
              className="input"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value }))
              }
            >
              <option value="customer">Customer</option>
              <option value="restaurant_owner">Restaurant Owner</option>
              <option value="admin">Admin</option>
              <option value="delivery_driver">Delivery Driver</option>
            </select>
            <input
              className="input"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary btn-sm">
                Crear
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div className="text-gray-400 text-center py-8">Cargando...</div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 font-medium text-gray-500">Rol</th>
              <th className="px-4 py-3 font-medium text-gray-500">
                Favoritos
              </th>
              <th className="px-4 py-3 font-medium text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => {
              const isActive = u._id === userId;
              return (
                <tr
                  key={u._id}
                  className={
                    isActive
                      ? "bg-orange-50 border-l-4 border-l-orange-400"
                      : "hover:bg-gray-50"
                  }
                >
                  <td className="px-4 py-3">
                    {editingId === u._id ? (
                      <input
                        className="input"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            name: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full font-semibold">
                            ACTIVO
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        ROLE_COLORS[u.role] || "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(u.favorites || []).length} restaurantes
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {editingId === u._id ? (
                        <>
                          <button
                            className="btn-primary btn-sm text-xs"
                            onClick={() => handleUpdate(u._id)}
                          >
                            Guardar
                          </button>
                          <button
                            className="btn-secondary btn-sm text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={`btn-sm text-xs ${
                              isActive
                                ? "bg-orange-500 text-white cursor-default"
                                : "btn-primary"
                            }`}
                            onClick={() =>
                              !isActive && handleImpersonate(u._id, u.name)
                            }
                            disabled={isActive}
                          >
                            {isActive ? "En uso" : "Usar"}
                          </button>
                          <button
                            className="btn-secondary btn-sm text-xs"
                            onClick={() => {
                              setEditingId(u._id);
                              setEditForm({
                                name: u.name,
                                phone: u.phone || "",
                              });
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-secondary btn-sm text-xs"
                            onClick={() => handleAddFavorite(u._id)}
                          >
                            +Fav
                          </button>
                          <button
                            className="btn-danger btn-sm text-xs"
                            onClick={() => handleDelete(u._id)}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && users.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No hay usuarios. Ejecuta el seed script o crea uno.
        </div>
      )}
    </div>
  );
}
