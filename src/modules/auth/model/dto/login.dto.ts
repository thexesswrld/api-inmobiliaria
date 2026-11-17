import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario es obligatorio').max(50).describe('Usuario de acceso'),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200).describe('Contraseña del usuario'),
});

export type LoginDto = z.infer<typeof LoginSchema>;
