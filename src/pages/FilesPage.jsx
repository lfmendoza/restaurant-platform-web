import { useState, useEffect } from "react";
import { listFiles, uploadFile, deleteFile, getFileUrl } from "../api";

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [menuItemId, setMenuItemId] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listFiles({ limit: 20 });
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) return alert("Selecciona un archivo");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      if (menuItemId) formData.append("menuItemId", menuItemId);
      if (restaurantId) formData.append("restaurantId", restaurantId);

      const result = await uploadFile(formData);
      alert(`✅ Archivo subido: ${result.fileId}`);
      setSelectedFile(null);
      setPreview(null);
      setMenuItemId("");
      setRestaurantId("");
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar este archivo de GridFS?")) return;
    try {
      await deleteFile(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Archivos — GridFS</h1>
      </div>

      {/* Upload */}
      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-3">Subir imagen (GridFS upload)</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Archivo de imagen</label>
            <input type="file" accept="image/*" className="block mt-1 text-sm" onChange={handleFileChange} />
          </div>

          {preview && (
            <img src={preview} alt="preview" className="w-32 h-32 object-cover rounded border" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Menu Item ID (opcional)</label>
              <input className="input" placeholder="ObjectId" value={menuItemId}
                onChange={e => setMenuItemId(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Restaurant ID (opcional)</label>
              <input className="input" placeholder="ObjectId" value={restaurantId}
                onChange={e => setRestaurantId(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-sm" disabled={uploading}>
            {uploading ? "Subiendo..." : "📤 Subir a GridFS"}
          </button>
        </form>
      </div>

      {/* File list */}
      <h2 className="font-semibold mb-3">Archivos en GridFS ({files.length})</h2>
      {loading && <div className="text-gray-400 text-center py-8">Cargando...</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {files.map(f => (
          <div key={f._id} className="card overflow-hidden">
            <img
              src={getFileUrl(f._id)}
              alt={f.filename}
              className="w-full h-32 object-cover bg-gray-100"
              onError={e => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%239ca3af' font-size='12'%3EImg%3C/text%3E%3C/svg%3E";
              }}
            />
            <div className="p-2">
              <p className="text-xs font-medium text-gray-700 truncate">{f.filename}</p>
              <p className="text-xs text-gray-400">{(f.length / 1024).toFixed(1)} KB</p>
              <p className="text-xs text-gray-400">{new Date(f.uploadDate).toLocaleDateString()}</p>
              <div className="flex gap-1 mt-2">
                <a href={getFileUrl(f._id)} target="_blank" rel="noreferrer"
                  className="btn-secondary btn-sm text-xs flex-1 text-center">
                  📥 Ver
                </a>
                <button className="btn-danger btn-sm text-xs" onClick={() => handleDelete(f._id)}>🗑</button>
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
