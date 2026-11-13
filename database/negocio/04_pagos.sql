-- =====================================================================
--  NEGOCIO — PAGOS Y CUOTAS
--  * monto_pagado / monto_mora_pagado / estado_cuota se mantienen solos.
--  * Un pago no reparte más que su monto; una cuota no recibe más de lo
--    que vale (capital y mora).
--  * Seguro ante pagos simultáneos: se bloquea el pago y la cuota.
--  * Reglas del pago: tipo de cambio, motivo de anulación, no editar un
--    pago ya procesado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Recalcular una cuota
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalcular_monto_pagado(p_id_cuota integer)
RETURNS void AS $$
DECLARE
  c          ven_cuota%ROWTYPE;
  v_capital  numeric(14,2);
  v_mora     numeric(14,2);
  v_estado   varchar;
BEGIN
  -- 1) Bloqueo. Si otro pago sobre esta cuota está en curso, se espera aquí.
  SELECT * INTO c FROM ven_cuota WHERE id = p_id_cuota FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- 2) Sumar en una sentencia nueva: ya ve lo que confirmó la otra transacción.
  SELECT COALESCE(SUM(a.monto_aplicado) FILTER (WHERE fn_codigo_opcion(a.aplica_a) = 'CAPITAL'), 0),
         COALESCE(SUM(a.monto_aplicado) FILTER (WHERE fn_codigo_opcion(a.aplica_a) = 'MORA'),    0)
  INTO v_capital, v_mora
  FROM ven_pago_aplicacion a
  JOIN ven_pago p ON p.id = a.id_pago
  WHERE a.id_cuota = p_id_cuota
    AND a.estado = 1
    AND p.estado = 1
    AND fn_codigo_opcion(p.estado_pago) NOT IN ('RECHAZADO', 'ANULADO');

  v_estado := fn_codigo_opcion(c.estado_cuota);

  IF v_estado = 'ANULADA' THEN
    IF v_capital + v_mora > 0 THEN
      RAISE EXCEPTION 'La cuota % de la venta % está ANULADA y no puede recibir pagos', c.numero, c.id_venta;
    END IF;
  ELSE
    IF v_capital > c.monto THEN
      RAISE EXCEPTION 'La cuota % de la venta % vale % y se le estaría aplicando % a capital',
                      c.numero, c.id_venta, c.monto, v_capital;
    END IF;
    IF v_mora > c.monto_mora THEN
      RAISE EXCEPTION 'La cuota % de la venta % tiene mora de % y se le estaría aplicando %',
                      c.numero, c.id_venta, c.monto_mora, v_mora;
    END IF;

    v_estado := CASE
                  WHEN v_capital >= c.monto                 THEN 'PAGADA'
                  WHEN c.fecha_vencimiento < current_date   THEN 'VENCIDA'
                  WHEN v_capital > 0                        THEN 'PAGO_PARCIAL'
                  ELSE 'PENDIENTE'
                END;
  END IF;

  UPDATE ven_cuota
  SET monto_pagado      = v_capital,
      monto_mora_pagado = v_mora,
      estado_cuota      = fn_opcion('ESTADO_CUOTA', v_estado)
  WHERE id = p_id_cuota
    AND (monto_pagado, monto_mora_pagado, estado_cuota)
        IS DISTINCT FROM (v_capital, v_mora, fn_opcion('ESTADO_CUOTA', v_estado));
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION fn_recalcular_monto_pagado(integer) IS
  'Recalcula monto_pagado, monto_mora_pagado y estado_cuota. Cuenta pagos REGISTRADOS y VALIDADOS (no RECHAZADOS ni ANULADOS).';

-- ---------------------------------------------------------------------
-- Aplicaciones de pago
-- ---------------------------------------------------------------------

-- Llena id_venta desde el pago si el backend no lo envía
CREATE OR REPLACE FUNCTION fn_aplicacion_llenar_venta()
RETURNS trigger AS $$
BEGIN
  IF NEW.id_venta IS NULL THEN
    SELECT id_venta INTO NEW.id_venta FROM ven_pago WHERE id = NEW.id_pago;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aplicacion_llenar_venta
BEFORE INSERT ON ven_pago_aplicacion
FOR EACH ROW EXECUTE FUNCTION fn_aplicacion_llenar_venta();

-- Valida topes del pago y recalcula las cuotas afectadas
CREATE OR REPLACE FUNCTION fn_trg_aplicacion_cuota()
RETURNS trigger AS $$
DECLARE
  p        ven_pago%ROWTYPE;
  v_total  numeric(14,2);
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.estado = 1 THEN
    -- Bloquear el pago: dos aplicaciones simultáneas del mismo pago se atienden en fila
    SELECT * INTO p FROM ven_pago WHERE id = NEW.id_pago FOR UPDATE;

    IF p.estado = 0 OR fn_codigo_opcion(p.estado_pago) IN ('RECHAZADO', 'ANULADO') THEN
      RAISE EXCEPTION 'El pago % está % y no se puede aplicar', p.id, fn_codigo_opcion(p.estado_pago);
    END IF;

    SELECT COALESCE(SUM(monto_aplicado), 0) INTO v_total
    FROM ven_pago_aplicacion
    WHERE id_pago = NEW.id_pago AND estado = 1;

    IF v_total > p.monto THEN
      RAISE EXCEPTION 'El pago % es de % y se estarían aplicando %', p.id, p.monto, v_total;
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM fn_recalcular_monto_pagado(OLD.id_cuota);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM fn_recalcular_monto_pagado(NEW.id_cuota);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pago_aplicacion_cuota
AFTER INSERT OR UPDATE OR DELETE ON ven_pago_aplicacion
FOR EACH ROW EXECUTE FUNCTION fn_trg_aplicacion_cuota();

-- ---------------------------------------------------------------------
-- Pagos
-- ---------------------------------------------------------------------

-- Reglas del pago
CREATE OR REPLACE FUNCTION fn_validar_pago()
RETURNS trigger AS $$
DECLARE
  v_moneda_venta integer;
  v_estado       varchar;
  v_estado_old   varchar;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF fn_codigo_opcion(OLD.estado_pago) <> 'REGISTRADO' THEN
      RAISE EXCEPTION 'El pago % ya fue procesado: no se elimina, se anula con motivo', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  v_estado := fn_codigo_opcion(NEW.estado_pago);

  SELECT tipo_moneda INTO v_moneda_venta FROM ven_venta WHERE id = NEW.id_venta;
  IF NEW.tipo_moneda <> v_moneda_venta AND NEW.tipo_cambio IS NULL THEN
    RAISE EXCEPTION 'El pago está en otra moneda que la venta: tipo_cambio es obligatorio';
  END IF;

  IF v_estado IN ('ANULADO', 'RECHAZADO') AND NULLIF(btrim(NEW.motivo_anulacion), '') IS NULL THEN
    RAISE EXCEPTION 'Indique motivo_anulacion para marcar el pago como %', v_estado;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_estado_old := fn_codigo_opcion(OLD.estado_pago);

    IF v_estado_old = 'ANULADO' AND v_estado <> 'ANULADO' THEN
      RAISE EXCEPTION 'El pago % está ANULADO y no se puede reactivar: registre un pago nuevo', OLD.id;
    END IF;

    IF v_estado_old <> 'REGISTRADO'
       AND (NEW.monto, NEW.id_venta, NEW.tipo_moneda, NEW.tipo_cambio, NEW.fecha_pago)
           IS DISTINCT FROM (OLD.monto, OLD.id_venta, OLD.tipo_moneda, OLD.tipo_cambio, OLD.fecha_pago)
    THEN
      RAISE EXCEPTION 'El pago % ya está %: no se cambia monto, venta, moneda ni fecha. Anúlelo y registre otro.',
                      OLD.id, v_estado_old;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pago_validar
BEFORE INSERT OR UPDATE OR DELETE ON ven_pago
FOR EACH ROW EXECUTE FUNCTION fn_validar_pago();

-- Si un pago cambia de estado (ej. se ANULA), recalcula sus cuotas
CREATE OR REPLACE FUNCTION fn_trg_pago_estado()
RETURNS trigger AS $$
DECLARE
  r record;
BEGIN
  IF NEW.estado_pago IS DISTINCT FROM OLD.estado_pago OR NEW.estado IS DISTINCT FROM OLD.estado THEN
    FOR r IN SELECT DISTINCT id_cuota FROM ven_pago_aplicacion WHERE id_pago = NEW.id ORDER BY id_cuota LOOP
      PERFORM fn_recalcular_monto_pagado(r.id_cuota);
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pago_estado
AFTER UPDATE OF estado_pago, estado ON ven_pago
FOR EACH ROW EXECUTE FUNCTION fn_trg_pago_estado();

-- ---------------------------------------------------------------------
-- Job diario: marca VENCIDA las cuotas impagas con fecha pasada.
-- Programar con pg_cron o con el scheduler del backend:
--   SELECT fn_marcar_cuotas_vencidas();
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_marcar_cuotas_vencidas()
RETURNS integer AS $$
DECLARE
  n integer;
BEGIN
  UPDATE ven_cuota
  SET estado_cuota = fn_opcion('ESTADO_CUOTA', 'VENCIDA')
  WHERE estado = 1
    AND fecha_vencimiento < current_date
    AND monto_pagado < monto
    AND estado_cuota IN (fn_opcion('ESTADO_CUOTA', 'PENDIENTE'),
                         fn_opcion('ESTADO_CUOTA', 'PAGO_PARCIAL'));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION fn_marcar_cuotas_vencidas() IS 'Ejecutar una vez al día. Devuelve cuántas cuotas pasaron a VENCIDA.';
