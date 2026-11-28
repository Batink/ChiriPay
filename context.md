# ChiriPay — Contexto del Proyecto

> Estado al 28-nov-2026. Describe lo que hay **en el código** (fases 1 a 5), no solo lo planeado.
> Donde algo está pendiente o no se pudo verificar, se dice explícitamente.

## Resumen
Sistema de pago digital con QR (Mercado Pago) para buses interurbanos/periurbanos sin efectivo. Cada bus tiene su propio dispositivo (genera los QR) y su propia pantalla (los muestra). Tres interfaces:

| Interfaz | Ruta | Qué hace |
|---|---|---|
| **Conductor** | `/?bus=PATENTE` | Genera órdenes de pago (pasaje escolar / adulto) y ve los pagos recientes |
| **Pasajero** | `/qr?bus=PATENTE` | Ve el QR, el monto y el estado del pago (esperando, pagado, expirado) |
| **Admin** | `/admin` | Resumen y reportes, boletos (con filtros y CSV), buses, choferes, vinculación bus↔chofer y división de ingresos |

El bus se identifica por su **patente en la URL**. Cada bus activo del panel (Ajustes → Buses) trae los enlaces de su dispositivo y su pantalla.

## Alcance de esta entrega
- **Sin hardware.** No se contempla Raspberry Pi 4 en modo kiosco ni lector NFC. La lectura/validación de credencial (TNE/TAM) queda fuera: se descarta la lectura física y la vista del Pasajero se limita a QR y estado de pago.
- **Todo local.** No se publica (sin Cloudflare ni dominio): backend, base de datos y frontend corren en la misma máquina.
- **Webhooks por ngrok.** Mercado Pago no puede llamar a un servidor local, así que los webhooks llegan por un **túnel ngrok** que apunta al backend (`/webhook`). Ver *Desarrollo local* y el riesgo 1: el túnel deja el backend accesible desde internet.

## Stack y Arquitectura
- **Arquitectura:** cliente-servidor, API REST, monolito modular; backend en patrón MVC (`modelos/`, `controladores/`, `rutas/`).
- **Backend:** Node.js, Express 5, prefijo `/api`, CORS abierto, JSON y urlencoded, `validator.js`, `dotenv`.
- **Base de datos:** MongoDB con Mongoose 9.
- **Pagos:** Mercado Pago por **API REST** (Orders API para el QR dinámico y POS por bus), con `fetch`. El paquete `mercadopago` figura en `package.json` pero **no se usa**.
- **Frontend:** React 19 (hooks), React Router DOM 7, Context API (solo en el panel), CSS propio. Creado con Create React App (`react-scripts` 5).
- **Dev:** `nodemon` (`npm start` en `backend/`) y `ngrok` para recibir los webhooks. No hay pruebas automatizadas en el repositorio (ver *Pruebas*).

## Estructura del repositorio
```
backend/
  index.js                 arranque, CORS, /webhook y montaje de rutas bajo /api
  basedatos/conexion.js    conexión a Mongo (MONGO_URI o 127.0.0.1/TestMPChiripay)
  modelos/                 Bus, Chofer, Asignacion, Orden, OrdenActual, Pago, Reparto
  controladores/           bus, chofer, asignacion, pago, reparto, boleto
  rutas/                   bus, chofer, pago, reparto, boleto
  util/                    validar.js (validaciones), asignaciones.js, reparto.js
frontend/src/
  my_routes/Rutas.js       /, /qr, /admin/*
  components/              pantallas públicas: SeleccionPasaje (Conductor), QR (Pasajero),
                           TablaBoletos, MarcoPublico (cabecera/tema/aviso compartidos)
  styles/publico.css       estilos propios de las pantallas públicas
  admin/                   panel: pages/, components/, components/settings/, context/,
                           services/ (api.js + mock.js), styles/admin.css, utils.js
```

## Modelos de datos (Mongo)
| Modelo (colección) | Para qué | Campos clave |
|---|---|---|
| `Bus` (`buses`) | Un bus = un POS de Mercado Pago | `patente` (única, 6 alfanuméricos), `nombre`, `external_id` (único), `mp_pos_id`, `choferId` (chofer vigente o null), `activo`, `fecha_baja` |
| `Chofer` (`choferes`) | Conductor | `nombre`, `rut` (único, `12345678-5`), `correo`, `cuenta` (ID cuenta Mercado Pago, para transferirle), `activo`, `baja`, `fecha_baja` |
| `Asignacion` (`asignaciones`) | Historial bus↔chofer | `busId`, `choferId`, `desde`, `hasta`, `vigente` (índice único parcial: una vigente por bus) |
| `Orden` (`ordenes`) | Una por QR generado; **fija** bus, chofer y porcentaje de esa venta | `externalReference` (único), `busId`, `choferId`, `porcentaje_chofer`, `titulo`, `monto` |
| `OrdenActual` (`orden_actual`) | Última orden de cada bus, para su pantalla `/qr` | `busId` (único), `externalReference`, `qrData`, `titulo`, `monto` |
| `Pago` (`pagos`) | Espejo de cada webhook de Mercado Pago (una fila por notificación) | campos de MP + `busId`, `choferId`, `porcentaje_chofer`, `monto_chofer`, `monto_empresa` (los pone el backend) |
| `Reparto` (`reparto`) | Configuración de la división de ingresos (documento único) | `porcentajeChofer` (entero 0–100, por defecto 20) |

**Tarifas:** no tienen modelo. Los precios están fijos en `controladores/pago.js` (escolar $500, adulto $1.500) y los tipos de pasaje del panel salen de `admin/services/mock.js` (`LIVE.types = false`).

## API REST (`/api`)
Formato de respuesta del repo: `{ status: "éxito" | "error", mensaje, <clave> }`. Códigos: 400 validación, 404 no existe, 409 conflicto, 500 error interno.

| Recurso | Endpoints |
|---|---|
| Buses | `POST /buses` · `GET /buses` · `GET/PUT/DELETE /buses/:id` (DELETE = baja lógica; `PUT {activo:true}` reactiva) |
| Vinculación | `PUT /buses/:id/chofer {choferId}` (reemplaza al anterior) · `DELETE /buses/:id/chofer` · `GET /buses/:id/asignaciones` |
| Choferes | `POST /choferes` · `GET /choferes` · `GET/PUT/DELETE /choferes/:id` (DELETE = baja lógica + desvincula sus buses; `PUT {baja:false}` reactiva) |
| Reparto | `GET /reparto` · `PUT /reparto {porcentajeChofer}` |
| Boletos (dashboard) | `GET /boletos?desde&hasta&busId&choferId` — una fila por orden cobrada, filtrada en el servidor |
| Ventas | `POST /pasaje-escolar` · `POST /pasaje-adulto` (body `{patente}`) · `GET /orden-actual?patente=` · `GET /pago-estado/:referencia` |
| Pagos (crudo) | `GET /pagos` (todas las notificaciones, de todos los buses) · `POST /guardar-pago` |
| Otros | `POST /webhook` (en la raíz, reenvía a `/api/guardar-pago`) · `GET /ver-pos` (diagnóstico del POS) |

## Flujos principales
1. **Venta:** el Conductor toca un tipo de pasaje → `POST /pasaje-*` con la patente → el backend busca el bus, **guarda la `Orden`** (bus, chofer vigente, porcentaje vigente) y recién entonces pide el QR a Mercado Pago usando el POS del bus → guarda la `OrdenActual` del bus. Si no se puede guardar la orden, no se pide el QR.
2. **Pantalla del Pasajero:** consulta cada 2,5 s `/orden-actual` y `/pago-estado`, así funciona aunque esté en otro dispositivo.
3. **Pago:** Mercado Pago notifica el webhook → `guardarPago` busca la `Orden` por `external_reference` y estampa el bus, el chofer y el reparto (`monto_chofer` + `monto_empresa` = monto cobrado). Ignora cualquier bus/chofer/reparto que venga en el body.
4. **Dashboard:** `GET /boletos` se queda con el último webhook de cada orden, solo las cobradas (`processed`), y aplica los filtros. Un reembolso posterior la excluye. Los pagos anteriores a la Fase 3B (cuando se empezó a guardar el bus en cada venta) quedan **sin atribuir** (sin bus ni chofer, todo el monto para la empresa).

## Frontend: pantallas y diseño
- **Sistema de diseño = el del panel** (`admin/styles/admin.css`): tipografía Bricolage Grotesque, neutros cálidos, amarillo de marca `#ffd60a`, tarjetas, botones, píldoras y tablas. Todo bajo `.cp-admin`; las pantallas públicas usan `cp-admin cp-public` y comparten los tokens.
- **Tema:** claro/oscuro con `data-theme`, guardado en `localStorage` con la clave `cp-theme` (oscuro por defecto), compartido entre el panel y las pantallas públicas.
- **QR:** siempre negro sobre blanco con zona de silencio, en cualquier tema.
- **Panel:** Resumen, Boletos (filtros por fecha, bus y chofer; exportar CSV en el cliente) y Ajustes (buses, choferes, división de ingresos, tarifas simuladas). **Sin autenticación.**

## Reglas de Negocio y Seguridad
| Regla | Estado |
|---|---|
| No almacenar datos de tarjetas/medios de pago | **Cumple.** Solo se guarda lo que Mercado Pago notifica por webhook (`modelos/Pago.js`) |
| La división conductor/empresa suma 100 % y usa la configuración vigente | **Cumple.** Empresa = monto − parte del chofer; el porcentaje se fija al crear el QR, así que cambiarlo solo afecta ventas futuras |
| Rechazar webhooks con firma inválida (401) sin alterar órdenes | **Pendiente, y más urgente por el túnel ngrok.** `/webhook` y `/api/guardar-pago` aceptan cualquier POST y `/webhook` siempre responde 200 |
| Fallos de red: alertas claras y respaldo sin perder trazabilidad | **Parcial.** Hay mensajes de error en pantalla; no hay cola ni reintentos |
| Datos personales de choferes (RUT, correo, cuenta MP) | Se almacenan en claro; el panel no tiene autenticación |

**Reglas implementadas**
- Baja lógica en buses y choferes (el historial se conserva; patente, `external_id` y RUT quedan reservados). Reactivar no devuelve las asignaciones.
- Un chofer puede manejar varios buses; cada bus tiene un solo chofer vigente (el historial queda en `asignaciones`).
- Asignar un chofer inactivo lo activa; uno dado de baja no se puede asignar. Dar de baja un bus o un chofer cierra sus asignaciones.
- El POS de Mercado Pago de un bus **no se borra** al darlo de baja.
- Un bus sin chofer puede vender: 0 % para el chofer, todo para la empresa.

## Fuera de Alcance (no implementar por defecto)
- App móvil nativa iOS/Android propia (el usuario paga desde la app de Mercado Pago).
- Pasarelas distintas a Mercado Pago o emisión de tarjeta física propia.
- Gestión GPS/flotas avanzada o integración ERP/contable externa.
- **Para esta entrega:** hardware (Raspberry Pi, kiosco, lector NFC), lectura/validación TNE/TAM y despliegue público (Cloudflare u otro); el único acceso desde internet es el túnel ngrok de los webhooks.

## Estado Actual
**Hecho**
- Buses: CRUD con baja lógica, sincronizado con el POS de Mercado Pago.
- Choferes: CRUD con RUT validado (dígito verificador), cuenta de Mercado Pago y baja lógica.
- Vinculación bus↔chofer con historial (`asignaciones`) y reemplazo automático.
- Ventas por bus: dispositivo y pantalla de QR por patente; POS propio por bus.
- Reparto automático guardado en cada venta (`monto_chofer` / `monto_empresa`).
- Dashboard con filtros resueltos en el servidor (`/boletos`), pagos antiguos "sin atribuir" y exportación CSV.
- Pantallas del Conductor y del Pasajero con el diseño del panel, en tema claro y oscuro y en móvil.

**Pendiente**
- Validación de firma del webhook (401).
- Autenticación del panel admin.
- Tarifas persistidas (modelo y endpoint; hoy fijas en código y simuladas en el panel).
- Resiliencia de red (reintentos/cola) y trazabilidad ante cortes.
- Pruebas automatizadas dentro del repositorio.
- Transferencias a los choferes (la cuenta de Mercado Pago ya se guarda; falta el proceso).

**Fuera de esta entrega:** lectura NFC (TNE/TAM), kiosco en Raspberry Pi, despliegue público.

## Desarrollo local
**Arranque**
```
backend/   npm install && npm start      # nodemon, puerto 3600 (PORT)
frontend/  npm install && npm start      # puerto 3000
```
Abrir `http://localhost:3000/admin`, registrar un bus y usar los enlaces "Dispositivo" y "Pantalla QR" de su fila.

**Variables de entorno (`backend/.env`)**
| Variable | Uso |
|---|---|
| `MONGO_URI` | Opcional. Por defecto `mongodb://127.0.0.1:27017/TestMPChiripay` |
| `PORT` | Opcional. Por defecto 3600 |
| `MP_ACCESS_TOKEN` | Obligatoria para crear buses (POS) y generar QR |
| `MP_STORE_ID` o `MP_EXTERNAL_STORE_ID` | Obligatoria para crear buses (la sucursal donde se crean los POS) |
| `MP_POS_ID` | Solo para `GET /ver-pos` |

Frontend: `REACT_APP_API_URL` (opcional, solo lo usa el panel; por defecto `http://localhost:3600/api`). Las pantallas públicas tienen `http://localhost:3600/api` escrito en el código.

**Webhooks con ngrok**
1. Con el backend corriendo: `ngrok http 3600` (o el puerto de `PORT`).
2. En el panel de Mercado Pago, configurar como URL de notificaciones `https://<tu-url-ngrok>/webhook` (el código no envía `notification_url` en cada orden: se usa la URL configurada en la aplicación).
3. Comprobar en la consola del backend que aparece `=== WEBHOOK RECIBIDO ===` al pagar un QR.
4. Si no se usa un dominio fijo de ngrok, la URL cambia al reiniciar el túnel y hay que actualizarla en Mercado Pago.
5. Con el túnel abierto, `http://<tu-url-ngrok>/api/...` queda accesible desde internet (ver riesgo 1): apagarlo cuando no se use.

**Simular un pago sin túnel** (útil para probar sin Mercado Pago pagando de verdad)
```bash
# 1) Crear el QR (llama a la API real de Mercado Pago; requiere token y bus con POS)
curl -X POST http://localhost:3600/api/pasaje-escolar -H "Content-Type: application/json" -d '{"patente":"AB1234"}'
#    de la respuesta, copiar "id" y "external_reference"

# 2) Simular que Mercado Pago avisa que se cobró
curl -X POST http://localhost:3600/api/guardar-pago -H "Content-Type: application/json" -d '{
  "action":"order.processed","api_version":"v1","date_created":"2026-11-28T12:00:00.000Z","type":"order","user_id":1,
  "data":{"id":"<id>","external_reference":"<external_reference>","status":"processed","status_detail":"accredited",
          "total_paid_amount":500,"type":"qr",
          "transactions":{"payments":[{"amount":500,"paid_amount":500,"status":"processed"}]}}}'
```
La pantalla `/qr` pasa a "Pago recibido" y el boleto aparece en el panel con su reparto.

## Convenciones del código
- Backend en español (carpetas, funciones, campos), CommonJS, 4 espacios, comillas dobles. Frontend con 2 espacios y comillas simples en el panel.
- Validación en `util/validar.js` (funciones que lanzan `Error` con el detalle y el controlador responde 400).
- Sin transacciones de Mongo: los pasos de escritura van en un orden que permite repetir la petición si algo falla a la mitad.
- El panel tiene `services/api.js` con flags `LIVE` por recurso; `mock.js` replica la misma forma de datos.

## Riesgos conocidos
1. **Backend expuesto por ngrok, sin autenticación ni firma de webhook.** Si el túnel apunta al puerto del backend (lo habitual), todo `/api/*` es accesible desde internet con CORS abierto: crear o dar de baja buses y choferes, cambiar la división de ingresos, leer los boletos y los datos de los choferes (RUT, correo, cuenta), y registrar pagos falsos en `/api/guardar-pago`. Prioridad: validar la firma del webhook (401) y no dejar el túnel abierto cuando no se necesita. Resolver antes de transferir dinero a choferes.
2. **La URL de ngrok cambia** al reiniciar el túnel si no hay un dominio fijo: hay que actualizarla en Mercado Pago o los pagos dejan de actualizarse.
3. **Token de Mercado Pago comentado en `backend/PrimerasPruebas.js`** (queda en el historial de git): conviene revocarlo y generar uno nuevo.
4. **URLs fijas a `localhost:3600`:** en las tres pantallas públicas y en el reenvío interno de `/webhook` (ignora `PORT`).
5. **`/api/pagos` devuelve los pagos de todos los buses**, y la tabla del Conductor los muestra sin filtrar por bus.
6. **`node-fetch`** lo importa `controladores/pago.js` pero no está declarado en `package.json` (llega como dependencia transitiva; no verificado).
7. **Código muerto:** `controladores/sucursal.js`, `controladores/pago_old.js`, `rutas/pago_old.js`, `PrimerasPruebas.js` y las rutas de ejemplo `/` y `/probando`. Están sin montar o sin uso real.
8. **`App.css` centra todo el texto de la app:** en el panel las celdas de las tablas quedan centradas bajo encabezados alineados a la izquierda. No es lo que define `admin.css`.
9. **Escala del dashboard:** `GET /boletos` elimina duplicados en memoria; para decenas de miles de pagos conviene una agregación en Mongo con índice.
10. **Índices nuevos y consultas** no se verificaron contra una instancia real de MongoDB ni contra Mercado Pago.

## Pruebas
- Durante el desarrollo se usaron scripts externos al repositorio (Mongo y Mercado Pago simulados, DOM simulado y capturas con Chromium). **No forman parte del repo.**
- `backend`: `npm test` no ejecuta nada. `frontend`: `react-scripts test` está disponible, pero `App.test.js` es el de ejemplo y está desactualizado.
- Pendiente: suite Jest con Mongo en memoria para el backend y pruebas de componentes para el frontend.
