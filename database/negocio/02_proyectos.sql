-- =====================================================================
--  NEGOCIO — PROYECTOS
--  * Los sectores no forman ciclos (A padre de B y B padre de A).
--  * Modelos y zonas clicables no apuntan a unidades/sectores de otro proyecto.
--  (Que el sector padre y el sector del modelo sean del mismo proyecto
--   ya lo garantizan las FKs compuestas del esquema.)
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_sector_sin_ciclos()
RETURNS trigger AS $$
BEGIN
  IF NEW.id_sector_padre IS NOT NULL AND EXISTS (
       WITH RECURSIVE ancestros(id, padre) AS (
         SELECT id, id_sector_padre FROM pro_sector WHERE id = NEW.id_sector_padre
         UNION
         SELECT s.id, s.id_sector_padre FROM pro_sector s JOIN ancestros a ON s.id = a.padre
       )
       SELECT 1 FROM ancestros WHERE id = NEW.id)
  THEN
    RAISE EXCEPTION 'El sector "%" no puede tener como padre a uno de sus descendientes', NEW.nombre;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sector_sin_ciclos
BEFORE INSERT OR UPDATE OF id_sector_padre ON pro_sector
FOR EACH ROW EXECUTE FUNCTION fn_sector_sin_ciclos();


CREATE OR REPLACE FUNCTION fn_validar_modelo_proyecto()
RETURNS trigger AS $$
DECLARE
  v_proyecto integer;
BEGIN
  IF TG_TABLE_NAME = 'pro_modelo' THEN
    v_proyecto := NEW.id_proyecto;
  ELSE
    SELECT id_proyecto INTO v_proyecto FROM pro_modelo WHERE id = NEW.id_modelo;
    IF NEW.id_sector IS NOT NULL
       AND (SELECT id_proyecto FROM pro_sector WHERE id = NEW.id_sector) IS DISTINCT FROM v_proyecto THEN
      RAISE EXCEPTION 'La zona apunta a un sector de otro proyecto';
    END IF;
  END IF;

  IF NEW.id_unidad IS NOT NULL AND fn_proyecto_de_unidad(NEW.id_unidad) IS DISTINCT FROM v_proyecto THEN
    RAISE EXCEPTION '%: la unidad % es de otro proyecto', TG_TABLE_NAME, NEW.id_unidad;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_modelo_mismo_proyecto
BEFORE INSERT OR UPDATE OF id_proyecto, id_unidad ON pro_modelo
FOR EACH ROW EXECUTE FUNCTION fn_validar_modelo_proyecto();

CREATE TRIGGER trg_modelo_ref_mismo_proyecto
BEFORE INSERT OR UPDATE OF id_modelo, id_sector, id_unidad ON pro_modelo_referencia
FOR EACH ROW EXECUTE FUNCTION fn_validar_modelo_proyecto();
