## Plataforma de Restaurantes – Cliente Web

Aplicación web para la gestión de una plataforma de restaurantes, desarrollada con React y Vite.
Permite a los usuarios explorar restaurantes, revisar menús, gestionar el carrito, realizar pedidos, dejar reseñas, ver analíticas avanzadas y ejecutar simulaciones en tiempo real.

### Repositorios del proyecto

- **API (backend):** https://github.com/lfmendoza/restaurant-platform-api
- **Cliente (frontend):** https://github.com/lfmendoza/restaurant-platform-web

### Stack tecnológico

- **Framework:** React 19
- **Empaquetador:** Vite 7
- **Estilos:** Tailwind CSS 3
- **Routing:** React Router DOM
- **Gráficas:** Recharts
- **Notificaciones:** React Hot Toast

### Características principales

- **Exploración de restaurantes:** listado, búsqueda geoespacial por lat/lng y cocina, detalle con stats
- **Gestión de menús:** CRUD completo, búsqueda de texto, ordenamiento, toggle de disponibilidad, insertMany, bulkWrite, actualización de precio por categoría
- **Carrito de compras:** persistencia desde API, agregar/modificar/eliminar items, vaciar carrito
- **Checkout:** dirección de entrega con coordenadas, método de pago, cálculo de subtotal + IVA 12% + delivery
- **Pedidos:** listado con filtro por estado, timeline visual de 7 estados (FSM), transiciones, detalle en modal, paginación, eliminar individual y cancelados
- **Reseñas:** crear reseña (solo órdenes delivered), rating 1-5, tags, respuesta del restaurante, voto útil, eliminar individual y masivo
- **Analytics con gráficas:** top restaurantes, items más vendidos, revenue por mes/categoría/diario, distribución de ratings, velocidad de pedidos, tags, alérgenos, tiempo de transición, vistas materializadas, batch jobs
- **Simulación en tiempo real:** panel de control con duración/velocidad/peak, SSE stream con throughput, latencia p50/p95/p99, heatmap por zona, distribución de estados, feed de eventos live
- **Usuarios:** CRUD completo, filtro por rol, agregar favoritos, seleccionar usuario activo
- **Archivos (GridFS):** upload con drag & drop, preview, asociación a menu items/restaurantes, galería con descarga y eliminación

### Estructura del proyecto

```
src/
├── api.js                          # Capa de comunicación con el API (65+ funciones + SSE helper)
├── App.jsx                         # Router principal con React Router
├── main.jsx                        # Entry point
├── index.css                       # Estilos Tailwind + componentes custom
├── contexts/
│   └── UserContext.jsx             # Contexto global de usuario
├── components/
│   ├── Layout.jsx                  # Layout con navbar + navegación
│   └── StatusTimeline.jsx          # Timeline visual de estados de orden
└── pages/
    ├── RestaurantsPage.jsx         # Discovery + búsqueda + CRUD
    ├── RestaurantDetailPage.jsx    # Detalle + stats + edición + categorías
    ├── MenuPage.jsx                # Menú completo con todas las operaciones
    ├── CartPage.jsx                # Carrito con checkout
    ├── OrdersPage.jsx              # Pedidos con FSM + timeline
    ├── ReviewsPage.jsx             # Reseñas con crear/tags/helpful
    ├── AnalyticsPage.jsx           # Dashboard con gráficas Recharts
    ├── SimulationPage.jsx          # Panel de simulación + SSE real-time
    ├── UsersPage.jsx               # CRUD de usuarios
    └── FilesPage.jsx               # GridFS upload/galería
```

### Prerrequisitos

- Node.js (versión LTS reciente)
- npm
- Backend corriendo en `http://localhost:3000` (ver repo del API)

### Instalación y ejecución

```bash
git clone https://github.com/lfmendoza/restaurant-platform-web.git
cd restaurant-platform-web
npm install
npm run dev
```

El cliente se ejecuta en `http://localhost:5173` y hace proxy automático de todas las peticiones API a `http://localhost:3000`.

### Scripts disponibles

| Comando           | Descripción                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Servidor de desarrollo (Vite)      |
| `npm run build`   | Build de producción                |
| `npm run preview` | Preview del build de producción    |

### Configuración del API

La aplicación consume los servicios del backend. Consulta el repositorio del API para instrucciones de configuración:
https://github.com/lfmendoza/restaurant-platform-api

### Licencia y uso

Proyecto desarrollado como parte del curso CC3089 Bases de Datos 2, Universidad del Valle de Guatemala.
