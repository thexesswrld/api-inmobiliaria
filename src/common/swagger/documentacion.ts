import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, type SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';

type EsquemaJson = Record<string, unknown>;

/**
 * Convierte un esquema zod al JSON Schema que entiende Swagger.
 * Usa `io: 'input'` para documentar lo que el cliente envía (coerción incluida)
 * y `unrepresentable: 'any'` para no romper con transformaciones o refinamientos.
 */
function aEsquemaJson(schema: z.ZodType): EsquemaJson {
  const { $schema: _omitido, ...resto } = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  }) as EsquemaJson;
  return resto;
}

/**
 * Documenta el body con el MISMO esquema zod que valida `@Body({ schema })`.
 * Así Swagger muestra campos, tipos, valores por defecto y descripciones.
 */
export function ApiBodyZod(schema: z.ZodType, descripcion?: string) {
  return ApiBody({
    ...(descripcion ? { description: descripcion } : {}),
    schema: aEsquemaJson(schema) as SchemaObject,
  });
}

/** Documenta cada propiedad del esquema zod como un query param. */
export function ApiQueryZod(schema: z.ZodType) {
  const json = aEsquemaJson(schema);
  const propiedades = (json.properties ?? {}) as Record<string, EsquemaJson>;
  const requeridos = new Set((json.required as string[] | undefined) ?? []);

  return applyDecorators(
    ...Object.entries(propiedades).map(([nombre, propiedad]) => {
      const { description, ...resto } = propiedad;
      return ApiQuery({
        name: nombre,
        required: requeridos.has(nombre),
        ...(typeof description === 'string' ? { description } : {}),
        schema: resto as SchemaObject,
      });
    }),
  );
}

/** Describe un parámetro de ruta `:id`. */
export function ApiIdParam(descripcion: string, ejemplo = 1) {
  return ApiParam({ name: 'id', type: Number, description: descripcion, example: ejemplo });
}
