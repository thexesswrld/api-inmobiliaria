-- =====================================================================
--  NEGOCIO — UTILIDADES
--  Funciones de apoyo usadas por el resto de archivos de negocio y vistas.
-- =====================================================================

-- Id de una opción a partir de los códigos de lista y opción.
-- Uso: fn_opcion('ESTADO_VENTA', 'VIGENTE'). Falla si no existe.
CREATE OR REPLACE FUNCTION fn_opcion(p_lista varchar, p_opcion varchar)
RETURNS integer AS $$
DECLARE
  v_id integer;
BEGIN
  SELECT o.id INTO v_id
  FROM gen_listas_de_opciones o
  JOIN gen_listas l ON l.id = o.id_lista
  WHERE l.codigo = p_lista AND o.codigo = p_opcion;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'No existe la opción %.%', p_lista, p_opcion;
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE;
COMMENT ON FUNCTION fn_opcion(varchar, varchar) IS 'Id de una opción por códigos. Evita escribir ids numéricos en el código.';

-- Inverso: id -> código ('VIGENTE', 'PAGADA'...)
CREATE OR REPLACE FUNCTION fn_codigo_opcion(p_id integer)
RETURNS varchar AS $$
  SELECT codigo FROM gen_listas_de_opciones WHERE id = p_id;
$$ LANGUAGE sql STABLE;
COMMENT ON FUNCTION fn_codigo_opcion(integer) IS 'Código de una opción a partir de su id.';

-- Estados de venta que mantienen comprometidas sus unidades
CREATE OR REPLACE FUNCTION fn_venta_ocupa_unidad(p_codigo_estado varchar)
RETURNS boolean AS $$
  SELECT p_codigo_estado IN ('SEPARADA', 'VIGENTE', 'CANCELADA', 'ENTREGADA');
$$ LANGUAGE sql IMMUTABLE;
COMMENT ON FUNCTION fn_venta_ocupa_unidad(varchar) IS 'TRUE si una venta en ese estado mantiene comprometidas sus unidades.';

-- Proyecto al que pertenece una unidad
CREATE OR REPLACE FUNCTION fn_proyecto_de_unidad(p_id_unidad integer)
RETURNS integer AS $$
  SELECT s.id_proyecto
  FROM pro_unidad u JOIN pro_sector s ON s.id = u.id_sector
  WHERE u.id = p_id_unidad;
$$ LANGUAGE sql STABLE;
