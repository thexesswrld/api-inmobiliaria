-- =====================================================================
--  NEGOCIO — COMPROBANTES
--  * Correlativo seguro ante concurrencia.
--  * Un comprobante emitido no se modifica ni se elimina: solo cambian
--    su estado, datos SUNAT, archivos y observaciones.
-- =====================================================================

-- Siguiente número de una serie. Llamar DENTRO de la misma transacción
-- que inserta el comprobante:
--   BEGIN;
--   SELECT fn_siguiente_numero_comprobante(:id_serie);  -- ej. 124
--   INSERT INTO ven_comprobante (..., numero) VALUES (..., 124);
--   COMMIT;
-- El UPDATE bloquea la fila de la serie: dos usuarios nunca obtienen el mismo número.
CREATE OR REPLACE FUNCTION fn_siguiente_numero_comprobante(p_id_serie integer)
RETURNS integer AS $$
DECLARE
  v_numero integer;
BEGIN
  UPDATE ven_serie
  SET ultimo_numero = ultimo_numero + 1
  WHERE id = p_id_serie AND estado = 1
  RETURNING ultimo_numero INTO v_numero;

  IF v_numero IS NULL THEN
    RAISE EXCEPTION 'La serie % no existe o está inactiva', p_id_serie;
  END IF;

  RETURN v_numero;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION fn_comprobante_inmutable()
RETURNS trigger AS $$
DECLARE
  -- Lo único que puede cambiar después de emitir
  k_editables text[] := ARRAY[
    'estado_comprobante', 'motivo_anulacion',
    'estado_sunat', 'hash_cpe', 'url_pdf', 'url_xml', 'url_cdr',
    'fecha_envio_sunat', 'mensaje_sunat', 'observaciones',
    'id_usuario_modificacion', 'fecha_modificacion'];
  v_numero text := OLD.serie || '-' || lpad(OLD.numero::text, 8, '0');
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'El comprobante % no se elimina: anúlelo o emita una nota de crédito', v_numero;
  END IF;

  IF (to_jsonb(NEW) - k_editables) IS DISTINCT FROM (to_jsonb(OLD) - k_editables) THEN
    RAISE EXCEPTION 'El comprobante % ya fue emitido: solo se puede cambiar su estado, datos SUNAT, archivos y observaciones', v_numero;
  END IF;

  IF fn_codigo_opcion(OLD.estado_comprobante) = 'ANULADO'
     AND NEW.estado_comprobante <> OLD.estado_comprobante THEN
    RAISE EXCEPTION 'El comprobante % está ANULADO y no se puede reactivar', v_numero;
  END IF;

  IF fn_codigo_opcion(NEW.estado_comprobante) = 'ANULADO'
     AND NULLIF(btrim(NEW.motivo_anulacion), '') IS NULL THEN
    RAISE EXCEPTION 'Indique motivo_anulacion para anular el comprobante %', v_numero;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comprobante_inmutable
BEFORE UPDATE OR DELETE ON ven_comprobante
FOR EACH ROW EXECUTE FUNCTION fn_comprobante_inmutable();
