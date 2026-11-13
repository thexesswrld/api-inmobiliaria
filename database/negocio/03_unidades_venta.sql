-- =====================================================================
--  NEGOCIO — UNIDADES SEGÚN EL ESTADO DE LA VENTA
--  * Una unidad no puede estar en dos ventas activas ni venderse BLOQUEADA.
--  * pro_unidad.estado_comercial e id_propietario siguen a la venta:
--      SEPARADA -> SEPARADO | VIGENTE, CANCELADA -> VENDIDO
--      ENTREGADA -> ENTREGADO | ANULADA, RESUELTA -> DISPONIBLE
--      Propietario = cliente solo si CANCELADA o ENTREGADA.
--  * Bloquea filas: dos vendedores sobre la misma unidad se atienden en fila.
-- =====================================================================

-- Deja la unidad DISPONIBLE si ninguna venta activa la ocupa
CREATE OR REPLACE FUNCTION fn_liberar_unidad(p_id_unidad integer)
RETURNS void AS $$
BEGIN
  PERFORM 1 FROM pro_unidad WHERE id = p_id_unidad FOR UPDATE;

  IF NOT EXISTS (
       SELECT 1
       FROM ven_detalle_venta d
       JOIN ven_venta v ON v.id = d.id_venta
       WHERE d.id_unidad = p_id_unidad
         AND d.estado = 1 AND v.estado = 1
         AND fn_venta_ocupa_unidad(fn_codigo_opcion(v.estado_comercial)))
  THEN
    UPDATE pro_unidad
    SET estado_comercial = fn_opcion('ESTADO_UNIDAD', 'DISPONIBLE'),
        id_propietario   = NULL
    WHERE id = p_id_unidad
      AND fn_codigo_opcion(estado_comercial) <> 'BLOQUEADO';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplica el estado de la venta a todas sus unidades
CREATE OR REPLACE FUNCTION fn_sincronizar_unidades_venta(p_id_venta integer)
RETURNS void AS $$
DECLARE
  v        ven_venta%ROWTYPE;
  v_codigo varchar;
  v_ocupa  boolean;
  d        record;
  u        pro_unidad%ROWTYPE;
  v_otra   varchar;
BEGIN
  SELECT * INTO v FROM ven_venta WHERE id = p_id_venta;
  IF NOT FOUND THEN RETURN; END IF;

  v_codigo := fn_codigo_opcion(v.estado_comercial);
  v_ocupa  := v.estado = 1 AND fn_venta_ocupa_unidad(v_codigo);

  -- ORDER BY: las unidades se bloquean siempre en el mismo orden (evita deadlocks)
  FOR d IN
    SELECT DISTINCT id_unidad FROM ven_detalle_venta
    WHERE id_venta = p_id_venta AND estado = 1
    ORDER BY id_unidad
  LOOP
    IF NOT v_ocupa THEN
      PERFORM fn_liberar_unidad(d.id_unidad);
      CONTINUE;
    END IF;

    SELECT * INTO u FROM pro_unidad WHERE id = d.id_unidad FOR UPDATE;

    SELECT v2.codigo INTO v_otra
    FROM ven_detalle_venta d2
    JOIN ven_venta v2 ON v2.id = d2.id_venta
    WHERE d2.id_unidad = d.id_unidad
      AND d2.id_venta <> p_id_venta
      AND d2.estado = 1 AND v2.estado = 1
      AND fn_venta_ocupa_unidad(fn_codigo_opcion(v2.estado_comercial))
    LIMIT 1;

    IF v_otra IS NOT NULL THEN
      RAISE EXCEPTION 'La unidad "%" ya está comprometida en la venta %', u.nombre, v_otra;
    END IF;

    IF fn_codigo_opcion(u.estado_comercial) = 'BLOQUEADO' THEN
      RAISE EXCEPTION 'La unidad "%" está BLOQUEADA y no se puede vender', u.nombre;
    END IF;

    UPDATE pro_unidad
    SET estado_comercial = fn_opcion('ESTADO_UNIDAD',
                             CASE v_codigo
                               WHEN 'SEPARADA'  THEN 'SEPARADO'
                               WHEN 'ENTREGADA' THEN 'ENTREGADO'
                               ELSE 'VENDIDO'
                             END),
        id_propietario   = CASE WHEN v_codigo IN ('CANCELADA', 'ENTREGADA') THEN v.id_cliente END,
        id_usuario_modificacion = COALESCE(v.id_usuario_modificacion, v.id_usuario_creacion)
    WHERE id = d.id_unidad;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION fn_sincronizar_unidades_venta(integer) IS 'Lleva el estado de la venta a pro_unidad.estado_comercial e id_propietario. Impide vender una unidad comprometida.';

-- Cambios en la cabecera de la venta
CREATE OR REPLACE FUNCTION fn_trg_venta_unidades()
RETURNS trigger AS $$
BEGIN
  IF NEW.estado_comercial IS NOT DISTINCT FROM OLD.estado_comercial
     AND NEW.id_cliente   IS NOT DISTINCT FROM OLD.id_cliente
     AND NEW.estado       IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NULL;
  END IF;
  PERFORM fn_sincronizar_unidades_venta(NEW.id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_venta_unidades
AFTER UPDATE OF estado_comercial, id_cliente, estado ON ven_venta
FOR EACH ROW EXECUTE FUNCTION fn_trg_venta_unidades();

-- Cambios en el detalle (agregar, quitar o cambiar unidad)
CREATE OR REPLACE FUNCTION fn_trg_detalle_venta()
RETURNS trigger AS $$
BEGIN
  -- Bloquear primero la venta y luego las unidades (mismo orden que trg_venta_unidades)
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM 1 FROM ven_venta WHERE id = NEW.id_venta FOR UPDATE;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM 1 FROM ven_venta WHERE id = OLD.id_venta FOR UPDATE;
    PERFORM fn_liberar_unidad(OLD.id_unidad);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM fn_sincronizar_unidades_venta(NEW.id_venta);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detalle_venta_sync
AFTER INSERT OR DELETE OR UPDATE OF id_venta, id_unidad, estado
ON ven_detalle_venta
FOR EACH ROW EXECUTE FUNCTION fn_trg_detalle_venta();
