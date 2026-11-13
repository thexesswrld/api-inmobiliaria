-- =====================================================================
--  BASE DE DATOS: INMOBILIARIA — DATOS INICIALES
--  Listas y opciones del sistema, país base y rol administrador.
--  Ejecutar después de 01_esquema.sql.
-- =====================================================================

BEGIN;

INSERT INTO gen_listas (codigo, nombre, descripcion) VALUES
  ('TIPO_PERSONA',        'Tipo de persona',          'Natural o jurídica'),
  ('TIPO_DOCUMENTO',      'Tipo de documento',        'Documento de identidad (catálogo SUNAT 06)'),
  ('TIPO_ROL_TRABAJADOR', 'Rol del trabajador',       'Función comercial del trabajador'),
  ('TIPO_PROYECTO',       'Tipo de proyecto',         'Clasificación del proyecto inmobiliario'),
  ('TIPO_SECTOR',         'Tipo de sector',           'Nivel de la división del proyecto'),
  ('TIPO_UNIDAD',         'Tipo de unidad',           'Clase de bien vendible'),
  ('ESTADO_UNIDAD',       'Estado comercial unidad',  'Disponibilidad de la unidad'),
  ('TIPO_MODELO',         'Tipo de modelo',           'Clase de archivo visual'),
  ('ESTADO_VENTA',        'Estado de la venta',       'Ciclo de vida del contrato'),
  ('TIPO_MONEDA',         'Moneda',                   'Monedas (ISO 4217)'),
  ('TIPO_CUOTA',          'Tipo de cuota',            'Clase de cuota del cronograma'),
  ('ESTADO_CUOTA',        'Estado de la cuota',       'Situación de pago de la cuota'),
  ('MEDIO_PAGO',          'Medio de pago',            'Forma en que se recibió el dinero'),
  ('ESTADO_PAGO',         'Estado del pago',          'Validación del pago'),
  ('APLICA_A',            'Aplicación del pago',      'Concepto al que se aplica el monto'),
  ('TIPO_COMPROBANTE',    'Tipo de comprobante',      'Comprobantes de pago (catálogo SUNAT 01)'),
  ('ESTADO_COMPROBANTE',  'Estado del comprobante',   'Ciclo de vida interno del comprobante'),
  ('ESTADO_SUNAT',        'Estado ante SUNAT',        'Situación del envío del comprobante electrónico');

-- Inserta opciones usando el código de la lista (sin depender de ids)
INSERT INTO gen_listas_de_opciones (id_lista, codigo, nombre, codigo_externo, orden)
SELECT l.id, o.codigo, o.nombre, o.codigo_externo, o.orden
FROM (VALUES
  -- lista                  codigo             nombre                              externo  orden
  ('TIPO_PERSONA',        'NATURAL',          'Persona natural',                  NULL,    1),
  ('TIPO_PERSONA',        'JURIDICA',         'Persona jurídica',                 NULL,    2),

  ('TIPO_DOCUMENTO',      'DNI',              'DNI',                              '1',     1),
  ('TIPO_DOCUMENTO',      'RUC',              'RUC',                              '6',     2),
  ('TIPO_DOCUMENTO',      'CE',               'Carné de extranjería',             '4',     3),
  ('TIPO_DOCUMENTO',      'PASAPORTE',        'Pasaporte',                        '7',     4),

  ('TIPO_ROL_TRABAJADOR', 'ASESOR_VENTAS',    'Asesor de ventas',                 NULL,    1),
  ('TIPO_ROL_TRABAJADOR', 'JEFE_VENTAS',      'Jefe de ventas',                   NULL,    2),
  ('TIPO_ROL_TRABAJADOR', 'COBRANZAS',        'Cobranzas',                        NULL,    3),
  ('TIPO_ROL_TRABAJADOR', 'ADMINISTRATIVO',   'Administrativo',                   NULL,    4),
  ('TIPO_ROL_TRABAJADOR', 'GERENCIA',         'Gerencia',                         NULL,    5),

  ('TIPO_PROYECTO',       'LOTIZACION',       'Lotización / habilitación urbana', NULL,    1),
  ('TIPO_PROYECTO',       'MULTIFAMILIAR',    'Edificio multifamiliar',           NULL,    2),
  ('TIPO_PROYECTO',       'CONDOMINIO',       'Condominio',                       NULL,    3),
  ('TIPO_PROYECTO',       'OFICINAS',         'Oficinas',                         NULL,    4),
  ('TIPO_PROYECTO',       'COMERCIAL',        'Comercial',                        NULL,    5),

  ('TIPO_SECTOR',         'ETAPA',            'Etapa',                            NULL,    1),
  ('TIPO_SECTOR',         'MANZANA',          'Manzana',                          NULL,    2),
  ('TIPO_SECTOR',         'TORRE',            'Torre',                            NULL,    3),
  ('TIPO_SECTOR',         'BLOQUE',           'Bloque',                           NULL,    4),
  ('TIPO_SECTOR',         'PISO',             'Piso',                             NULL,    5),
  ('TIPO_SECTOR',         'ZONA',             'Zona',                             NULL,    6),

  ('TIPO_UNIDAD',         'LOTE',             'Lote',                             NULL,    1),
  ('TIPO_UNIDAD',         'DEPARTAMENTO',     'Departamento',                     NULL,    2),
  ('TIPO_UNIDAD',         'CASA',             'Casa',                             NULL,    3),
  ('TIPO_UNIDAD',         'ESTACIONAMIENTO',  'Estacionamiento',                  NULL,    4),
  ('TIPO_UNIDAD',         'DEPOSITO',         'Depósito',                         NULL,    5),
  ('TIPO_UNIDAD',         'LOCAL_COMERCIAL',  'Local comercial',                  NULL,    6),
  ('TIPO_UNIDAD',         'OFICINA',          'Oficina',                          NULL,    7),

  ('ESTADO_UNIDAD',       'DISPONIBLE',       'Disponible',                       NULL,    1),
  ('ESTADO_UNIDAD',       'SEPARADO',         'Separado',                         NULL,    2),
  ('ESTADO_UNIDAD',       'VENDIDO',          'Vendido',                          NULL,    3),
  ('ESTADO_UNIDAD',       'ENTREGADO',        'Entregado',                        NULL,    4),
  ('ESTADO_UNIDAD',       'BLOQUEADO',        'Bloqueado',                        NULL,    5),

  ('TIPO_MODELO',         'IMAGEN',           'Imagen / foto',                    NULL,    1),
  ('TIPO_MODELO',         'PLANO',            'Plano',                            NULL,    2),
  ('TIPO_MODELO',         'RENDER',           'Render',                           NULL,    3),
  ('TIPO_MODELO',         'MODELO_3D',        'Modelo 3D',                        NULL,    4),
  ('TIPO_MODELO',         'VIDEO',            'Video',                            NULL,    5),
  ('TIPO_MODELO',         'TOUR_360',         'Tour 360°',                        NULL,    6),

  ('ESTADO_VENTA',        'SEPARADA',         'Separada',                         NULL,    1),
  ('ESTADO_VENTA',        'VIGENTE',          'Vigente (pagando)',                NULL,    2),
  ('ESTADO_VENTA',        'CANCELADA',        'Cancelada (pagada al 100%)',       NULL,    3),
  ('ESTADO_VENTA',        'ENTREGADA',        'Entregada',                        NULL,    4),
  ('ESTADO_VENTA',        'ANULADA',          'Anulada',                          NULL,    5),
  ('ESTADO_VENTA',        'RESUELTA',         'Resuelta (contrato resuelto)',     NULL,    6),

  ('TIPO_MONEDA',         'PEN',              'Soles',                            'PEN',   1),
  ('TIPO_MONEDA',         'USD',              'Dólares',                          'USD',   2),

  ('TIPO_CUOTA',          'SEPARACION',       'Separación',                       NULL,    1),
  ('TIPO_CUOTA',          'INICIAL',          'Cuota inicial',                    NULL,    2),
  ('TIPO_CUOTA',          'MENSUAL',          'Cuota mensual',                    NULL,    3),
  ('TIPO_CUOTA',          'EXTRAORDINARIA',   'Cuota extraordinaria',             NULL,    4),

  ('ESTADO_CUOTA',        'PENDIENTE',        'Pendiente',                        NULL,    1),
  ('ESTADO_CUOTA',        'PAGO_PARCIAL',     'Pago parcial',                     NULL,    2),
  ('ESTADO_CUOTA',        'PAGADA',           'Pagada',                           NULL,    3),
  ('ESTADO_CUOTA',        'VENCIDA',          'Vencida',                          NULL,    4),
  ('ESTADO_CUOTA',        'ANULADA',          'Anulada',                          NULL,    5),

  ('MEDIO_PAGO',          'EFECTIVO',         'Efectivo',                         NULL,    1),
  ('MEDIO_PAGO',          'TRANSFERENCIA',    'Transferencia bancaria',           NULL,    2),
  ('MEDIO_PAGO',          'DEPOSITO',         'Depósito en cuenta',               NULL,    3),
  ('MEDIO_PAGO',          'TARJETA',          'Tarjeta débito/crédito',           NULL,    4),
  ('MEDIO_PAGO',          'BILLETERA',        'Yape / Plin',                      NULL,    5),
  ('MEDIO_PAGO',          'CHEQUE',           'Cheque',                           NULL,    6),

  ('ESTADO_PAGO',         'REGISTRADO',       'Registrado (por validar)',         NULL,    1),
  ('ESTADO_PAGO',         'VALIDADO',         'Validado',                         NULL,    2),
  ('ESTADO_PAGO',         'RECHAZADO',        'Rechazado',                        NULL,    3),
  ('ESTADO_PAGO',         'ANULADO',          'Anulado',                          NULL,    4),

  ('APLICA_A',            'CAPITAL',          'Capital',                          NULL,    1),
  ('APLICA_A',            'MORA',             'Mora',                             NULL,    2),

  ('TIPO_COMPROBANTE',    'FACTURA',          'Factura',                          '01',    1),
  ('TIPO_COMPROBANTE',    'BOLETA',           'Boleta de venta',                  '03',    2),
  ('TIPO_COMPROBANTE',    'NOTA_CREDITO',     'Nota de crédito',                  '07',    3),
  ('TIPO_COMPROBANTE',    'NOTA_DEBITO',      'Nota de débito',                   '08',    4),

  ('ESTADO_COMPROBANTE',  'EMITIDO',          'Emitido',                          NULL,    1),
  ('ESTADO_COMPROBANTE',  'ANULADO',          'Anulado',                          NULL,    2),

  ('ESTADO_SUNAT',        'NO_APLICA',        'No aplica (no electrónico)',       NULL,    1),
  ('ESTADO_SUNAT',        'PENDIENTE',        'Pendiente de envío',               NULL,    2),
  ('ESTADO_SUNAT',        'ENVIADO',          'Enviado',                          NULL,    3),
  ('ESTADO_SUNAT',        'ACEPTADO',         'Aceptado',                         NULL,    4),
  ('ESTADO_SUNAT',        'OBSERVADO',        'Aceptado con observaciones',       NULL,    5),
  ('ESTADO_SUNAT',        'RECHAZADO',        'Rechazado',                        NULL,    6),
  ('ESTADO_SUNAT',        'BAJA',             'Comunicado de baja',               NULL,    7)
) AS o(lista, codigo, nombre, codigo_externo, orden)
JOIN gen_listas l ON l.codigo = o.lista;

-- País base (departamentos/provincias/distritos se cargan desde el padrón UBIGEO del INEI)
INSERT INTO gen_pais (nombre) VALUES ('Perú');

-- Rol administrador
INSERT INTO auth_rol (codigo, nombre, descripcion)
VALUES ('ADMIN', 'Administrador', 'Acceso total al sistema');

-- Permisos. Cada código debe coincidir con src/common/auth/permisos-banderas.ts
-- (la API avisa al arrancar si falta alguno). Formato: modulo.entidad.accion
INSERT INTO auth_permiso (codigo, nombre, modulo) VALUES
  ('auth.usuario.listar', 'Listar usuarios',      'auth'),
  ('auth.usuario.ver',    'Ver detalle de usuario', 'auth');

-- ADMIN recibe todos los permisos (se puede volver a ejecutar sin duplicar)
INSERT INTO auth_rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id
FROM auth_rol r CROSS JOIN auth_permiso p
WHERE r.codigo = 'ADMIN'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

COMMIT;

-- Primer usuario: crear su per_persona, luego auth_usuario con el hash
-- de la contraseña y asignarle el rol ADMIN en auth_usuario_rol.
-- La API usa bcrypt; desde SQL se puede generar con pgcrypto (en Supabase
-- viene instalado en el esquema "extensions"):
--   extensions.crypt('la-contraseña', extensions.gen_salt('bf', 10))
