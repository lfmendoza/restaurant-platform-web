import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { listFiles, uploadFile, deleteFile, getFileUrl, getRestaurants, getMenuItems } from "../api";
import RestaurantTypeahead from "../components/RestaurantTypeahead";

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [menuItemId, setMenuItemId] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [searchRestaurant, setSearchRestaurant] = useState("");
  const [searchMenuItem, setSearchMenuItem] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getRestaurants({ limit: 500 }).then(setRestaurants).catch(() => {});
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      setMenuItems([]);
      setMenuItemId("");
      return;
    }
    getMenuItems({ restaurantId, limit: 500 }).then(setMenuItems).catch(() => setMenuItems([]));
    setMenuItemId("");
  }, [restaurantId]);

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (searchRestaurant.trim()) params.restaurantName = searchRestaurant.trim();
      if (searchMenuItem.trim()) params.menuItemName = searchMenuItem.trim();
      const data = await listFiles(params);
      setFiles(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) return toast.error("Selecciona un archivo");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      if (menuItemId) formData.append("menuItemId", menuItemId);
      if (restaurantId) formData.append("restaurantId", restaurantId);

      const result = await uploadFile(formData);
      toast.success(`Archivo subido: ${result.fileId}`);
      setSelectedFile(null);
      setPreview(null);
      setMenuItemId("");
      setRestaurantId("");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar este archivo de GridFS?")) return;
    try {
      await deleteFile(id);
      toast.success("Archivo eliminado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function handleFileSelect(file) {
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [searchRestaurant, searchMenuItem]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Archivos — GridFS</h1>
      </div>

      {/* Upload */}
      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-3">Subir imagen (GridFS upload)</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-orange-400 bg-orange-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="w-32 h-32 object-cover rounded border mx-auto"
              />
            ) : (
              <div>
                <div className="text-3xl mb-2">📤</div>
                <p className="text-gray-500 text-sm">
                  Arrastra una imagen aquí o haz clic para seleccionar
                </p>
              </div>
            )}
            {selectedFile && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">
                Restaurante (opcional)
              </label>
              <RestaurantTypeahead
                restaurants={restaurants}
                value={restaurantId}
                onChange={setRestaurantId}
                placeholder="Buscar restaurante..."
                emptyLabel="Ninguno"
                allowEmpty={true}
                className="mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Ítem de menú (opcional, depende del restaurante)
              </label>
              <select
                className="input mt-0.5"
                value={menuItemId}
                onChange={(e) => setMenuItemId(e.target.value)}
                disabled={!restaurantId}
              >
                <option value="">{restaurantId ? "Seleccionar ítem..." : "Primero selecciona un restaurante"}</option>
                {menuItems.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={uploading}
          >
            {uploading ? "Subiendo..." : "Subir a GridFS"}
          </button>
        </form>
      </div>

      {/* File list */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold mb-3">
          Archivos en GridFS ({files.length})
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Buscar por restaurante</label>
            <input
              className="input mt-0.5"
              placeholder="Nombre del restaurante..."
              value={searchRestaurant}
              onChange={(e) => setSearchRestaurant(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Buscar por ítem de menú</label>
            <input
              className="input mt-0.5"
              placeholder="Nombre del platillo..."
              value={searchMenuItem}
              onChange={(e) => setSearchMenuItem(e.target.value)}
            />
          </div>
        </div>
      </div>
      {loading && (
        <div className="text-gray-400 text-center py-8">Cargando...</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {files.map((f) => (
          <div key={f._id} className="card overflow-hidden group">
            <img
              src={getFileUrl(f._id)}
              alt={f.filename}
              className="w-full h-32 object-cover bg-gray-100"
              onError={(e) => {
                e.target.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%239ca3af' font-size='12'%3EImg%3C/text%3E%3C/svg%3E";
              }}
            />
            <div className="p-2">
              <p className="text-xs font-medium text-gray-700 truncate">
                {f.filename}
              </p>
              <p className="text-xs text-gray-400">
                {(f.length / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-gray-400">
                {new Date(f.uploadDate).toLocaleDateString()}
              </p>
              {(f.restaurantName || f.menuItemName) && (
                <div className="text-xs text-gray-400 mt-1">
                  {f.restaurantName && (
                    <span className="block truncate" title={f.restaurantName}>
                      Rest: {f.restaurantName}
                    </span>
                  )}
                  {f.menuItemName && (
                    <span className="block truncate" title={f.menuItemName}>
                      Menú: {f.menuItemName}
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-1 mt-2">
                <a
                  href={getFileUrl(f._id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary btn-sm text-xs flex-1 text-center"
                >
                  Ver
                </a>
                <button
                  className="btn-danger btn-sm text-xs"
                  onClick={() => handleDelete(f._id)}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && files.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No hay archivos en GridFS. Sube una imagen arriba.
        </div>
      )}
    </div>
  );
}
