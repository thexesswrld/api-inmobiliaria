# Arquitectura de la API Inmobiliaria

Guía para crear módulos nuevos y usar bien cada capa, la autenticación, las respuestas estándar, Prisma y Swagger.

> **Idea central:** las reglas de negocio importantes viven en **PostgreSQL** (`database/negocio/`: triggers y funciones). La API **no las repite**: recibe la petición, valida la forma de los datos, llama a la base y devuelve una respuesta ordenada.

---

## Índice

1. [Primeros pasos](#1-primeros-pasos)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Las 4 capas de un módulo](#3-las-4-capas-de-un-módulo)
4. [Seguridad: `@IsPublic` y `@Permisos`](#4-seguridad-ispublic-y-permisos)
5. [Respuestas estándar](#5-respuestas-estándar)
6. [Prisma](#6-prisma)
7. [Swagger](#7-swagger)
8. [Checklist: crear un módulo nuevo](#8-checklist-crear-un-módulo-nuevo)
9. [Errores comunes](#9-errores-comunes)

---

## 1. Primeros pasos

### Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

| Variable | Para qué | De dónde sale |
|---|---|---|
| `DATABASE_URL` | La app en ejecución | Supabase → Connection string → pooler, **puerto 6543** |
| `DIRECT_URL` | El CLI de Prisma (`db pull`) | Supabase → conexión directa o pooler de sesión, **puerto 5432** |
| `JWT_SECRET` | Firmar los tokens (mínimo 32 caracteres) | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRA_EN` | Duración del token (`8h`, `30m`, `1d`) | Opcional, por defecto `8h` |
| `PORT` | Puerto HTTP | Opcional, por defecto `3000` |

Si falta una variable o no es válida, la app **no arranca** y dice cuál es (`src/config/env.ts`).

### Comandos

```bash
npm install
npx prisma generate      # genera el cliente de Prisma (obligatorio tras clonar)
npm run start:dev        # desarrollo con recarga
npm test                 # tests unitarios
npm run test:e2e         # tests e2e
npm run lint
npm run build
```

Documentación interactiva: `http://localhost:3000/docs`

---

## 2. Estructura de carpetas

```
prisma/
└── schema.prisma               ← modelos (se sincroniza con la BD, no crea tablas)
prisma.config.ts                ← configuración del CLI de Prisma
database/                       ← FUENTE DE VERDAD: tablas, triggers, funciones, seed
src/
├── main.ts                     ← arranque + Swagger
├── app.module.ts               ← registra pipe, interceptor y filtro globales
├── config/
│   ├── env.ts                  ← validación de variables de entorno
│   └── swagger.ts
├── prisma/                     ← PrismaService (global)
├── generated/prisma/           ← cliente generado (NO editar, NO se sube a git)
├── common/                     ← piezas compartidas por todos los módulos
│   ├── estado.ts               ← ACTIVO, ESTADO_ACTIVO, ESTADO_ELIMINADO
│   ├── auth/                   ← permisos-banderas.ts, @IsPublic, @Permisos, @UsuarioActual
│   ├── respuesta/              ← interceptor { ok, data }, Paginado, @SinEnvoltura
│   ├── errores/                ← filtro global y traducción de errores
│   └── paginacion/             ← PaginacionSchema, rango(), paginado()
└── modules/
    ├── auth/                   ← módulo de referencia: cópialo para los demás
    ├── proyectos/
    ├── ventas/
    └── ...
```

### `common/` frente a `modules/`

| | `common/` | `modules/<nombre>/` |
|---|---|---|
| Qué es | Herramientas compartidas | Una funcionalidad de la app |
| Tiene endpoints | No | Sí |
| Puede importar de… | Solo de `common/`, `config/` y `generated/` | De `common/` y de sí mismo |

**Regla:** `common/` **nunca** importa nada de `modules/`. Así se evitan las dependencias circulares.

---

## 3. Las 4 capas de un módulo

```
src/modules/ventas/
├── ventas.module.ts
├── controllers/     ← HTTP
├── service/         ← casos de uso + Prisma
├── logic/           ← reglas puras (sin BD)
└── model/           ← DTOs, select de Prisma, mappers, tipos de respuesta
```

Las dependencias van **en un solo sentido**:

```
controllers  →  service  →  logic  →  model
```

Una capa **nunca** importa una capa que está a su izquierda.

### Qué va en cada capa

| Capa | Hace | Puede usar | **No** debe tener |
|---|---|---|---|
| `controllers/` | Rutas, params, body, decoradores de seguridad y Swagger | service, model | Lógica, Prisma, `if` de negocio |
| `service/` | Coordina: consulta, guarda, abre transacciones, lanza `NotFoundException` | logic, model, `PrismaService` | `req`/`res` de Express |
| `logic/` | Cálculos y decisiones **puras** | model | Nest, Prisma, base de datos |
| `model/` | Forma de los datos: lo que entra, lo que sale y lo que se lee de la BD | tipos de Prisma | Lógica |

### Un ejemplo completo: `GET /usuarios/5`

**1. Controller:** solo HTTP. Recibe, protege y delega.

```ts
@Get(':id')
@Permisos(PERMISOS.VER_USUARIO)
@ApiOperation({ summary: 'Ver usuario' })
obtener(@Param('id', ParseIntPipe) id: number) {
  return this.usuarios.obtener(id);
}
```

**2. Service:** consulta con Prisma y decide qué pasa si no existe.

```ts
async obtener(id: number): Promise<UsuarioRespuesta> {
  const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: usuarioDetalleSelect });
  if (!usuario) throw new NotFoundException('Usuario no encontrado');
  return toUsuarioRespuesta(usuario);
}
```

**3. Model:** el `select` dice qué se lee y el mapper dice qué se devuelve.

```ts
// model/usuario.select.ts
export const usuarioDetalleSelect = { id: true, username: true, estado: true, persona: {...} } satisfies Prisma.UsuarioSelect;
export type UsuarioDetalle = Prisma.UsuarioGetPayload<{ select: typeof usuarioDetalleSelect }>;

// model/usuario.mapper.ts
export function toUsuarioRespuesta(u: UsuarioDetalle): UsuarioRespuesta {
  return { id: u.id, username: u.username, activo: u.estado === ESTADO_ACTIVO, ... };
}
```

**4. El interceptor la envuelve:** esto es automático, no escribes nada.

```json
{ "ok": true, "data": { "id": 5, "username": "jperez", "activo": true } }
```

### Cuándo usar `logic/`

Usa `logic/` para lo que la base de datos **no** hace:

- ✅ Generar el cronograma de cuotas, calcular un total para mostrarlo, armar un nombre completo, decidir si un usuario tiene ciertos permisos.
- ❌ "Un pago no reparte más que su monto" o "la unidad está bloqueada": eso ya lo hacen los triggers de `database/negocio/`. **No lo dupliques.**

Si un módulo no tiene lógica pura, la carpeta `logic/` puede quedar vacía. Es normal.

Las funciones de `logic/` son fáciles de testear: van con su `*.spec.ts` al lado y no necesitan base de datos.

### Reglas del `model/`

- **DTOs de entrada con zod.** Se validan solos con `@Body({ schema })`, `@Query({ schema })` y `@Param('x', { schema })`.
  ```ts
  export const CrearVentaSchema = z.object({ idCliente: z.number().int().positive(), ... });
  export type CrearVentaDto = z.infer<typeof CrearVentaSchema>;
  ```
- **El `select` de Prisma va en un archivo del model.** No lo repitas en varios services, y el tipo del resultado sale de ahí.
- **Mappers:** **nunca** devuelvas directo lo que trae Prisma.
  - Dinero (`numeric(14,2)`, que llega como `Decimal`) → `string` con `.toFixed(2)`. Nunca `number`: pierde precisión.
  - Fechas → `toISOString()`.
  - `estado` → `activo: boolean`.
  - Opciones de lista (`tipo_x`, `estado_x`) → `{ codigo, nombre }`, no el id numérico.
  - Columnas de auditoría y `password_hash` → no salen.
- **Tipos de respuesta** como interfaces en `model/respuestas.ts`.

---

## 4. Seguridad: `@IsPublic` y `@Permisos`

### Regla de oro

**Todo endpoint pide sesión por defecto.** Si olvidas un decorador, el endpoint queda **cerrado**, no abierto.

| Decorador | Efecto |
|---|---|
| *(ninguno)* | Pide un token válido (401 si no lo hay) |
| `@IsPublic()` | No pide token |
| `@Permisos(PERMISOS.X, PERMISOS.Y)` | Pide token **y** todos los permisos indicados (403 si falta uno) |
| `@UsuarioActual()` | Parámetro: el usuario de la sesión (`id`, `username`, `roles`, `permisos`, `idSesion`) |

```ts
@Controller('ventas')
export class VentasController {
  @Get()
  @Permisos(PERMISOS.LISTAR_VENTAS)
  listar() { ... }

  @Post()
  @Permisos(PERMISOS.CREAR_VENTA)
  crear(@Body({ schema: CrearVentaSchema }) dto: CrearVentaDto, @UsuarioActual() u: UsuarioAutenticado) {
    return this.ventas.crear(dto, u.id); // u.id → id_usuario_creacion
  }
}
```

`@Permisos` también se puede poner en la clase. Si un método tiene el suyo, ese reemplaza al de la clase.

### Agregar un permiso nuevo (2 lugares)

**1.** `src/common/auth/permisos-banderas.ts`:

```ts
export const PERMISOS = {
  LISTAR_USUARIOS: 'auth.usuario.listar',
  VER_USUARIO: 'auth.usuario.ver',
  // ventas
  LISTAR_VENTAS: 'ven.venta.listar',
  CREAR_VENTA: 'ven.venta.crear',
} as const;
```

**2.** El seed `database/esquema/02_datos_iniciales.sql` (y ejecútalo en la BD):

```sql
INSERT INTO auth_permiso (codigo, nombre, modulo) VALUES
  ('ven.venta.listar', 'Listar ventas', 'ven'),
  ('ven.venta.crear',  'Crear venta',   'ven');
```

El bloque del seed que da todos los permisos a ADMIN se puede volver a ejecutar sin duplicar nada.

Formato de los códigos: `modulo.entidad.accion`, con el prefijo de las tablas (`auth`, `gen`, `per`, `pro`, `ven`).

Si un código está en `permisos-banderas.ts` pero no en la base, **al arrancar** aparece un aviso en la consola:

```
WARN [Permisos] Permisos sin registrar en auth_permiso (agrégalos al seed): ven.venta.crear
```

### Cómo funciona la sesión (JWT + `auth_sesiones`)

1. **Login:** se verifica la contraseña con bcrypt, se firma un JWT y se guarda su **SHA-256** en `auth_sesiones.token_hash`.
2. **En cada petición:**
   1. El guard valida la firma y el vencimiento del JWT.
   2. Busca la sesión por el hash y confirma que siga abierta y que el usuario esté activo.
   3. Carga los roles y permisos **actuales**.
3. **Logout:** la sesión se cierra (`fecha_fin`, `estado = 0`) y el token deja de servir **al instante**.

Si le quitas un rol a alguien, el cambio aplica en su siguiente petición, sin esperar a que venza el token.

---

## 5. Respuestas estándar

Toda respuesta tiene una de estas dos formas. El controller **solo devuelve los datos**: el formato lo ponen piezas globales.

```jsonc
// Éxito (RespuestaInterceptor)
{ "ok": true, "data": { ... } }
{ "ok": true, "data": [ ... ], "meta": { "total": 134, "pagina": 2, "porPagina": 20, "totalPaginas": 7 } }

// Error (ErroresFilter)
{ "ok": false, "error": { "codigo": "REGLA_NEGOCIO", "mensaje": "La unidad \"A-1\" está BLOQUEADA y no se puede vender" } }
```

### Códigos de error

| Origen | HTTP | `codigo` |
|---|---|---|
| Validación zod (`@Body({ schema })`) | 400 | `VALIDACION` (la lista va en `detalles`) |
| Sin token o sesión inválida | 401 | `NO_AUTENTICADO` |
| Falta un permiso | 403 | `SIN_PERMISO` |
| `NotFoundException` / Prisma `P2025` | 404 | `NO_ENCONTRADO` |
| Registro duplicado (`P2002`, `23505`) | 409 | `DUPLICADO` |
| Registro relacionado (`P2003`, `23503`) | 409 | `REFERENCIA` |
| **`RAISE EXCEPTION` de un trigger** (`P0001`) | 422 | `REGLA_NEGOCIO` (con el mensaje del trigger) |
| Violación de un `CHECK` (`23514`) | 422 | `REGLA_NEGOCIO` |
| Cualquier otro error | 500 | `INTERNO` (el detalle va al log, nunca al cliente) |

**Para los triggers:** escribe el mensaje de `RAISE EXCEPTION` pensando en el usuario final, porque llega tal cual al frontend.

```sql
RAISE EXCEPTION 'La cuota % de la venta % está ANULADA y no puede recibir pagos', c.numero, c.id_venta;
```

**En los services**, lanza las excepciones de Nest con un mensaje claro:

```ts
throw new NotFoundException('Venta no encontrada');
throw new ConflictException('La venta ya fue anulada');
```

### Paginación

```ts
// model/dto/ventas-query.dto.ts
export const VentasQuerySchema = PaginacionSchema.extend({ buscar: z.string().trim().optional() });

// service
async listar(q: VentasQuery) {
  const where = { ...ACTIVO };
  const [items, total] = await Promise.all([
    this.prisma.venta.findMany({ where, select: ventaSelect, ...rango(q) }),
    this.prisma.venta.count({ where }),
  ]);
  return paginado(items.map(toVentaRespuesta), total, q);
}
```

`?pagina=1&porPagina=20` (máximo 100). El interceptor convierte el `Paginado` en `{ data, meta }`.

### Descargas (PDF, Excel)

Usa `@SinEnvoltura()` en el endpoint para que la respuesta salga tal cual, sin `{ ok, data }`.

---

## 6. Prisma

### La regla más importante

**La base de datos manda.** Las tablas, triggers y funciones se crean con los scripts de `database/`. Prisma **solo lee** ese esquema.

```
database/*.sql  ──(psql)──►  Supabase  ──(prisma db pull)──►  schema.prisma  ──(prisma generate)──►  src/generated/prisma
```

| Comando | Cuándo |
|---|---|
| `npx prisma db pull` | Después de cambiar tablas en `database/` y aplicarlas en Supabase |
| `npx prisma generate` | Después de `db pull`, después de editar `schema.prisma` y después de clonar el repo |
| `npx prisma studio` | Para ver los datos en el navegador |
| ~~`npx prisma migrate dev`~~ | **No usar.** No conoce los triggers ni las funciones, y puede intentar resetear la base |

### Nombres: `@map` y `@@map`

Las tablas usan `snake_case` con prefijo. En el código usamos nombres limpios:

```prisma
model Usuario {
  passwordHash String @map("password_hash")
  @@map("auth_usuario")
}
```

Después de un `db pull`, renombra los modelos y campos nuevos de la misma forma (`ven_cuota` → `Cuota`, `id_venta` → `idVenta`). Los siguientes `db pull` **conservan** esos nombres.

### Conexión con Supabase

- La **app** usa `DATABASE_URL` (pooler, puerto 6543) mediante `@prisma/adapter-pg`, dentro de `src/prisma/prisma.service.ts`.
- El **CLI** usa `DIRECT_URL` (puerto 5432), configurado en `prisma.config.ts`.

### Usar Prisma en un service

Inyecta `PrismaService`. Es global, así que no hace falta importarlo en el módulo:

```ts
constructor(private readonly prisma: PrismaService) {}
```

**Borrado lógico:** filtra siempre los registros activos.

```ts
this.prisma.venta.findMany({ where: { ...ACTIVO, idCliente } });
```

Para "eliminar", actualiza el estado en vez de borrar:

```ts
this.prisma.venta.update({ where: { id }, data: { estado: ESTADO_ELIMINADO, idUsuarioModificacion: u.id } });
```

**Auditoría:** llena las columnas con el usuario de la sesión.

```ts
data: { ..., idUsuarioCreacion: u.id }        // create
data: { ..., idUsuarioModificacion: u.id }    // update
```

`fecha_creacion` y `fecha_modificacion` se llenan solas (default y trigger).

**Usa siempre `select`.** Trae solo lo que el mapper necesita y define el `select` en `model/`.

**Transacciones:** cuando una operación toca varias tablas, usa `$transaction`.

```ts
await this.prisma.$transaction(async (tx) => {
  const venta = await tx.venta.create({ data: {...} });
  await tx.cuota.createMany({ data: plan.map((c) => ({ ...c, idVenta: venta.id })) });
  return venta; // los triggers corren dentro de la misma transacción
});
```

Si un trigger lanza `RAISE EXCEPTION`, la transacción completa se revierte y el filtro responde 422.

**Funciones de PostgreSQL:** llámalas con `$queryRaw`. Los parámetros van con `${}`, que es seguro contra inyección SQL.

```ts
await this.prisma.$queryRaw`SELECT fn_liberar_unidad(${idUnidad})`;
```

**Nunca** uses `$queryRawUnsafe` con datos que vengan del usuario.

**Vistas** (`database/vistas/`): `db pull` las trae como `view` y se consultan igual que un modelo.

**Contraseña:** `PrismaService` **omite `passwordHash` en todas las consultas**. El único lugar donde se pide de forma explícita es `AuthService.login`.

---

## 7. Swagger

Disponible en `/docs` (y el JSON en `/docs-json`) cuando `NODE_ENV` no es `production`.

### Lo que se documenta solo

- El body y el query que tienen `{ schema }` de zod.
- `@IsPublic()` → el endpoint aparece sin candado.
- `@Permisos(...)` → la respuesta 403 muestra los permisos requeridos (y la extensión `x-permisos`).

### Lo que agregas en cada controller

```ts
@ApiTags('Ventas')                      // agrupa los endpoints
@Controller('ventas')
export class VentasController {
  @Post()
  @Permisos(PERMISOS.CREAR_VENTA)
  @ApiOperation({ summary: 'Crear venta', description: 'Genera el cronograma de cuotas.' })
  crear(...) {}
}
```

### Probar endpoints protegidos

1. Ejecuta **POST /auth/login**.
2. Copia `data.token`.
3. Pulsa **Authorize** y pega el token. Se mantiene aunque recargues la página.

---

## 8. Checklist: crear un módulo nuevo

Usa `src/modules/auth/` como plantilla.

- [ ] **Base de datos:** si hubo cambios en las tablas, aplica el SQL de `database/` en Supabase.
- [ ] Ejecuta `npx prisma db pull` y renombra los modelos y campos nuevos con `@@map` y `@map`.
- [ ] Ejecuta `npx prisma generate`.
- [ ] **Permisos:** agrega los códigos en `permisos-banderas.ts` **y** en el seed.
- [ ] Crea las carpetas `controllers/`, `service/`, `logic/` y `model/`.
- [ ] **model:** DTOs con zod, `select` de Prisma con su tipo, tipos de respuesta y mapper.
- [ ] **logic:** funciones puras con su `*.spec.ts` (solo si hay lógica que la base no hace).
- [ ] **service:** usa Prisma, filtra con `ACTIVO`, llena la auditoría, usa transacciones si toca varias tablas y devuelve los datos ya mapeados.
- [ ] **controllers:** `@ApiTags`, `@ApiOperation`, `@Permisos` o `@IsPublic`, y validación con `{ schema }`.
- [ ] Crea `<nombre>.module.ts` e impórtalo en `app.module.ts`.
- [ ] Ejecuta `npm run lint`, `npm test` y `npm run build`.
- [ ] Revisa `/docs` y prueba el módulo con un token.

---

## 9. Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `Cannot find module '../generated/prisma/client.js'` | No se generó el cliente | `npx prisma generate` |
| Error de import al compilar | Falta `.js` en un import relativo (el proyecto es ESM) | `import { X } from './x.js'` |
| Un endpoint responde 401 aunque debería ser público | Falta `@IsPublic()` | Agrégalo |
| Todos reciben 403 en un endpoint | El código de permiso no está en la BD o no está asignado al rol | Revisa el aviso `[Permisos]` al arrancar y el seed |
| El frontend recibe un 500 con un mensaje de un trigger | El trigger usa un `ERRCODE` que el filtro no conoce | Usa el código por defecto (`P0001`) o agrega el caso en `common/errores/traducir-error.ts` |
| Montos con decimales raros (`1500.4999999`) | Se convirtió un `Decimal` a `number` | En el mapper usa `.toFixed(2)` y devuélvelo como `string` |
| `db pull` borró nombres de modelos | Se editaron nombres sin usar `@@map` | Siempre renombra con `@@map` y `@map` |
| `db pull` falla por los motores de Prisma | npm no ejecutó los scripts de instalación | `npm install-scripts approve prisma @prisma/engines` |
