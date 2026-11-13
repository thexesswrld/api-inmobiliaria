// Borrado lógico: todas las tablas usan estado = 1 (activo) / 0 (eliminado).
export const ESTADO_ACTIVO = 1;
export const ESTADO_ELIMINADO = 0;

// Para usar en los `where` de Prisma: where: { ...ACTIVO, username }
export const ACTIVO = { estado: ESTADO_ACTIVO } as const;
