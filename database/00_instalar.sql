-- =====================================================================
--  INSTALADOR — BASE DE DATOS INMOBILIARIA
--
--  Ejecutar desde psql sobre una BD vacía:
--    psql -d <base> -v ON_ERROR_STOP=1 -f bd/00_instalar.sql
--
--  ESTRUCTURA
--    esquema/   Estructura: tablas, llaves, CHECK, índices, comentarios.
--               Datos iniciales (listas, país, rol ADMIN).
--    negocio/   Reglas de negocio en triggers/funciones. Cada archivo es
--               independiente salvo 00_utilidades.sql, que todos usan.
--               Si una regla pasa al backend, quite su línea abajo.
--    vistas/    Consultas de apoyo (requiere negocio/00_utilidades.sql).
--    pruebas/   Pruebas automáticas (solo en una BD de prueba).
-- =====================================================================
\set ON_ERROR_STOP 1

\echo '== Esquema'
\ir esquema/01_esquema.sql
\ir esquema/02_datos_iniciales.sql

\echo '== Negocio'
\ir negocio/00_utilidades.sql
\ir negocio/01_validar_listas.sql
\ir negocio/02_proyectos.sql
\ir negocio/03_unidades_venta.sql
\ir negocio/04_pagos.sql
\ir negocio/05_comprobantes.sql

\echo '== Vistas'
\ir vistas/vistas.sql

\echo '== Instalación completa'
