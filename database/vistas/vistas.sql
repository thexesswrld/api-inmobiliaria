-- =====================================================================
--  VISTAS
--  Requiere negocio/00_utilidades.sql (fn_codigo_opcion).
-- =====================================================================

-- Número de contratos y monto contratado por cliente
CREATE OR REPLACE VIEW v_cliente_resumen AS
SELECT
  c.id                                   AS id_cliente,
  p.nombre,
  p.apellido_paterno,
  p.documento,
  COUNT(v.id) FILTER (WHERE v.estado = 1) AS contratos,
  COALESCE(SUM(v.monto_final) FILTER (WHERE v.estado = 1), 0) AS monto_total_contratado
FROM per_cliente c
JOIN per_persona p ON p.id = c.id_persona
LEFT JOIN ven_venta v ON v.id_cliente = c.id
GROUP BY c.id, p.nombre, p.apellido_paterno, p.documento;
COMMENT ON VIEW v_cliente_resumen IS 'Número de contratos y monto contratado por cliente.';

-- Comprobante con número formateado (F001-00000123) y estados legibles
CREATE OR REPLACE VIEW v_comprobante AS
SELECT
  cp.*,
  cp.serie || '-' || lpad(cp.numero::text, 8, '0') AS numero_completo,
  fn_codigo_opcion(cp.estado_comprobante)          AS estado_comprobante_codigo,
  fn_codigo_opcion(cp.estado_sunat)                AS estado_sunat_codigo
FROM ven_comprobante cp;
COMMENT ON VIEW v_comprobante IS 'Comprobantes con el número completo formateado (F001-00000123) y estados legibles.';

-- Estado real de cada cuota al día de hoy (no depende del job diario)
CREATE OR REPLACE VIEW v_cuota_estado AS
SELECT
  c.id,
  c.id_venta,
  c.numero,
  fn_codigo_opcion(c.tipo_cuota)                 AS tipo_cuota,
  c.fecha_vencimiento,
  c.monto,
  c.monto_pagado,
  c.monto - c.monto_pagado                       AS saldo_capital,
  c.monto_mora,
  c.monto_mora_pagado,
  c.monto_mora - c.monto_mora_pagado             AS saldo_mora,
  CASE WHEN c.monto_pagado < c.monto AND c.fecha_vencimiento < current_date
       THEN current_date - c.fecha_vencimiento ELSE 0 END AS dias_atraso,
  CASE
    WHEN fn_codigo_opcion(c.estado_cuota) = 'ANULADA'  THEN 'ANULADA'
    WHEN c.monto_pagado >= c.monto                     THEN 'PAGADA'
    WHEN c.fecha_vencimiento < current_date            THEN 'VENCIDA'
    WHEN c.monto_pagado > 0                            THEN 'PAGO_PARCIAL'
    ELSE 'PENDIENTE'
  END                                            AS estado_real
FROM ven_cuota c
WHERE c.estado = 1;
COMMENT ON VIEW v_cuota_estado IS 'Saldo, días de atraso y estado real de cada cuota calculados a la fecha.';

-- Resumen financiero de cada venta
CREATE OR REPLACE VIEW v_venta_resumen AS
SELECT
  v.id,
  v.codigo,
  v.id_cliente,
  fn_codigo_opcion(v.estado_comercial)                         AS estado_venta,
  v.monto_final,
  v.monto_inicial,
  v.monto_financiado,
  COALESCE(SUM(c.monto) FILTER (WHERE c.estado_real <> 'ANULADA'
                                  AND c.tipo_cuota IN ('SEPARACION', 'INICIAL')), 0) AS inicial_cronograma,
  v.monto_inicial
    - COALESCE(SUM(c.monto) FILTER (WHERE c.estado_real <> 'ANULADA'
                                      AND c.tipo_cuota IN ('SEPARACION', 'INICIAL')), 0) AS diferencia_inicial,
  COALESCE(SUM(c.monto)        FILTER (WHERE c.estado_real <> 'ANULADA'), 0) AS total_cronograma,
  v.monto_final
    - COALESCE(SUM(c.monto)    FILTER (WHERE c.estado_real <> 'ANULADA'), 0) AS diferencia_cronograma,
  COALESCE(SUM(c.monto_pagado), 0)                             AS total_pagado,
  v.monto_final - COALESCE(SUM(c.monto_pagado), 0)             AS saldo,
  COALESCE(SUM(c.saldo_mora)   FILTER (WHERE c.estado_real <> 'ANULADA'), 0) AS mora_pendiente,
  COUNT(c.id)                  FILTER (WHERE c.estado_real = 'VENCIDA')      AS cuotas_vencidas,
  MAX(c.dias_atraso)                                           AS max_dias_atraso
FROM ven_venta v
LEFT JOIN v_cuota_estado c ON c.id_venta = v.id
WHERE v.estado = 1
GROUP BY v.id;
COMMENT ON VIEW v_venta_resumen IS 'Por venta: total, inicial y financiado; cuadre del cronograma (diferencia_inicial y diferencia_cronograma deben ser 0); pagado, saldo y morosidad.';
