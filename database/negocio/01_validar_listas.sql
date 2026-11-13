-- =====================================================================
--  NEGOCIO — VALIDACIÓN DE LISTAS
--  Cada columna tipo_x / estado_x solo acepta opciones de SU lista
--  (ej. no se puede guardar 'VENDIDO' en tipo_documento).
--
--  Si no se instala este archivo, la validación debe hacerla el backend.
-- =====================================================================

CREATE TABLE gen_lista_columna (
  tabla         varchar(63) NOT NULL,
  columna       varchar(63) NOT NULL,
  codigo_lista  varchar(50) NOT NULL REFERENCES gen_listas(codigo),
  PRIMARY KEY (tabla, columna)
);
COMMENT ON TABLE gen_lista_columna IS 'Configuración: qué lista corresponde a cada columna. Al agregar una columna de lista, regístrela aquí y cree el trigger trg_<tabla>_listas si la tabla aún no lo tiene.';

INSERT INTO gen_lista_columna (tabla, columna, codigo_lista) VALUES
  ('per_persona',          'tipo_persona',       'TIPO_PERSONA'),
  ('per_persona',          'tipo_documento',     'TIPO_DOCUMENTO'),
  ('per_trabajador',       'rol_negocio',        'TIPO_ROL_TRABAJADOR'),
  ('pro_proyecto',         'tipo_proyecto',      'TIPO_PROYECTO'),
  ('pro_sector',           'tipo_sector',        'TIPO_SECTOR'),
  ('pro_unidad',           'tipo_unidad',        'TIPO_UNIDAD'),
  ('pro_unidad',           'estado_comercial',   'ESTADO_UNIDAD'),
  ('pro_modelo',           'tipo_modelo',        'TIPO_MODELO'),
  ('gen_cuenta_bancaria',  'tipo_moneda',        'TIPO_MONEDA'),
  ('ven_venta',            'tipo_moneda',        'TIPO_MONEDA'),
  ('ven_venta',            'estado_comercial',   'ESTADO_VENTA'),
  ('ven_cuota',            'tipo_cuota',         'TIPO_CUOTA'),
  ('ven_cuota',            'estado_cuota',       'ESTADO_CUOTA'),
  ('ven_pago',             'tipo_moneda',        'TIPO_MONEDA'),
  ('ven_pago',             'medio_pago',         'MEDIO_PAGO'),
  ('ven_pago',             'estado_pago',        'ESTADO_PAGO'),
  ('ven_pago_aplicacion',  'aplica_a',           'APLICA_A'),
  ('ven_serie',            'tipo_comprobante',   'TIPO_COMPROBANTE'),
  ('ven_comprobante',      'tipo_comprobante',   'TIPO_COMPROBANTE'),
  ('ven_comprobante',      'tipo_moneda',        'TIPO_MONEDA'),
  ('ven_comprobante',      'estado_comprobante', 'ESTADO_COMPROBANTE'),
  ('ven_comprobante',      'estado_sunat',       'ESTADO_SUNAT');

CREATE OR REPLACE FUNCTION fn_validar_listas()
RETURNS trigger AS $$
DECLARE
  r      record;
  v_fila jsonb := to_jsonb(NEW);
  v_id   integer;
BEGIN
  FOR r IN
    SELECT columna, codigo_lista FROM gen_lista_columna WHERE tabla = TG_TABLE_NAME
  LOOP
    v_id := (v_fila ->> r.columna)::integer;
    IF v_id IS NOT NULL AND NOT EXISTS (
         SELECT 1
         FROM gen_listas_de_opciones o
         JOIN gen_listas l ON l.id = o.id_lista
         WHERE o.id = v_id AND l.codigo = r.codigo_lista)
    THEN
      RAISE EXCEPTION '%.%: la opción % (%) no pertenece a la lista %',
                      TG_TABLE_NAME, r.columna, v_id, COALESCE(fn_codigo_opcion(v_id), 'inexistente'), r.codigo_lista;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT DISTINCT tabla FROM gen_lista_columna LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_validar_listas()',
                   'trg_' || t || '_listas', t);
  END LOOP;
END;
$$;
