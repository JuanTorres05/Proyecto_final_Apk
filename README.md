# 🌌 Bibliotheca Nocturna — Sistema Móvil de Biblioteca Offline-First

Aplicación móvil de gestión bibliotecaria con identidad visual editorial nocturna inspirada en librerías independientes de noche (*"El conocimiento como mapa de estrellas"*). Desarrollada con **React Native (Expo)**, motor de base de datos **SQLite local**, backend API REST en **Node.js (Express)** y sincronización bidireccional automática.

---

## 🚀 Características y Módulos Implementados

1. **Autenticación y Registro**:
   - Registro de usuarios y login con JWT.
   - Persistencia de credenciales en almacenamiento seguro y SQLite local para permitir acceso en modo fuera de línea.
   - Botón de demostración rápida para pruebas ("Cuenta Demo SENA").

2. **Módulo 1: Catálogo de Libros**:
   - Búsqueda en tiempo real por título, autor o categoría.
   - Filtros dinámicos por género (Literatura, Programación, Clásicos, etc.) y disponibilidad de stock.
   - Vista detallada del ejemplar (sinopsis, portada, autor, ISBN, año, calificación promedio).

3. **Módulo 2: Préstamos y Devoluciones**:
   - Solicitud de préstamos (7, 14 o 21 días) con cálculo automático de fecha límite.
   - Validación de stock y bloqueo por sanciones pendientes.
   - Listado de préstamos activos con contador de días restantes.
   - Devolución de ejemplares con cálculo automático de multas si la entrega se realiza con retraso.
   - Pestaña de historial de préstamos devueltos.

4. **Módulo 3: Gestión de Perfil y Sanciones/Multas**:
   - Visualización y edición de datos del usuario (nombre, teléfono).
   - Módulo de sanciones: cálculo de deuda acumulada ($1.000 COP por día de retraso), detalle de infracciones y botón para registrar el pago de multas.

5. **Módulo 4: Reseñas y Calificaciones**:
   - Valoración de libros de 1 a 5 estrellas.
   - Comentarios y opiniones comunitarias visibles tanto online como offline.

6. **Mecanismo Offline-First & Sincronización Bidireccional**:
   - Almacenamiento local completo en SQLite (`biblioteca_local.db`).
   - Tabla `sync_queue`: encola peticiones offline (`CREATE_LOAN`, `RETURN_LOAN`, `ADD_REVIEW`, `UPDATE_PROFILE`, `PAY_PENALTY`).
   - Switch de **Simulación Fuera de Línea**: permite demostrar la funcionalidad offline a evaluadores sin necesidad de apagar el Wi-Fi.
   - Banner superior dinámico con contador de cambios pendientes y botón de sincronización manual/automática.

---

## 🛠️ Estructura del Proyecto

```
proyecto/
├── backend/                  # API REST con Express y SQLite
│   ├── src/
│   │   ├── config/db.js      # Configuración de SQLite servidor y seeders
│   │   ├── controllers/      # Controladores (auth, books, loans, penalties, reviews, sync)
│   │   ├── middleware/auth.js# Verificación de JWT
│   │   ├── routes/api.js     # Endpoints REST
│   │   └── server.js         # Servidor HTTP en puerto 3000
│   ├── test_api.js           # Pruebas automatizadas de la API
│   └── package.json
│
├── mobile/                   # App móvil React Native con Expo
│   ├── src/
│   │   ├── components/       # SyncBanner, BookCard, LoanCard, StarRating
│   │   ├── config/api.js     # Configuración dinámica de IP/URL del Backend
│   │   ├── context/          # AuthContext y NetworkContext
│   │   ├── database/sqlite.js# SQLite local con expo-sqlite y sync_queue
│   │   ├── navigation/       # AppNavigator (Tabs y Stacks)
│   │   ├── screens/          # Login, Register, Catalog, Detail, Loans, Profile
│   │   └── services/         # syncService (sincronización bidireccional)
│   ├── eas.json              # Configuración para generar el APK instalable
│   ├── app.json              # Metadatos de la app (com.sena.biblioteca)
│   └── package.json
└── README.md
```

---

## 💻 Instrucciones para Ejecutar el Proyecto

### 1. Iniciar el Backend (API REST)

Abre una terminal en la carpeta `backend`:

```bash
cd backend
npm install
npm start
```

El servidor iniciará en `http://localhost:3000` e inicializará automáticamente la base de datos con libros y usuarios de prueba.

Para ejecutar las pruebas automáticas del backend:
```bash
node test_api.js
```

---

### 2. Iniciar la Aplicación Móvil (React Native)

Abre una segunda terminal en la carpeta `mobile`:

```bash
cd mobile
npm install
npm start
```

Desde el menú interactivo de Expo:
- Presiona `a` para abrir en un Emulador de Android.
- O escanea el código QR con la aplicación **Expo Go** desde tu teléfono físico conectado a la misma red Wi-Fi.

> **Nota para teléfonos físicos**: En la pantalla de **Mi Perfil > Diagnóstico y Sincronización**, puedes configurar la dirección IP de tu computador (ejemplo: `http://192.168.1.15:3000`) para que la app se comunique con el backend en red local.

---

## 📱 Cómo Probar la Funcionalidad Offline y Sincronización

1. **Prueba en Línea**:
   - Inicia sesión con la cuenta demo (`aprendiz@sena.edu.co` / `123456`).
   - Observa el banner verde superior: `En Línea (Conectado a la API)`.

2. **Prueba Fuera de Línea**:
   - Toca el botón **"Simular Offline"** en el banner superior (o desconecta el Wi-Fi de tu teléfono/emulador).
   - El banner cambiará a amarillo: `Modo Sin Conexión (Simulado)`.
   - Navega al catálogo: los libros cargan de inmediato desde **SQLite local**.
   - Solicita un préstamo de un libro y escribe una reseña de 5 estrellas.
   - Observa que el préstamo aparece en "Mis Préstamos" y el banner indica: `2 cambios pendientes por sincronizar`.

3. **Reconexión y Sincronización**:
   - Pulsa **"Reconectar"** o **"Sincronizar"**.
   - El servicio procesará la cola `sync_queue` contra el endpoint `/api/sync` del backend.
   - El servidor persistirá los datos y responderá con el estado actualizado.
   - El badge volverá a verde con 0 pendientes.

---

## 📦 Generación del Entregable (Archivo APK para Android)

La aplicación ya está configurada con `eas.json` para generar un archivo `.apk` autónomo (no requiere Google Play Store para instalarse).

### Pasos para compilar el APK con EAS Build:

1. Asegúrate de tener una cuenta gratuita en [Expo](https://expo.dev/signup).
2. En la terminal de la carpeta `mobile`, inicia sesión en tu cuenta de Expo:
   ```bash
   cd mobile
   eas login
   ```
3. Ejecuta el comando de compilación para generar el APK:
   ```bash
   eas build -p android --profile preview
   ```
4. EAS compilará el proyecto en los servidores de Expo y al finalizar te entregará un enlace directo de descarga para el archivo `.apk` y un código QR para descargarlo e instalarlo directamente en tu dispositivo Android.
