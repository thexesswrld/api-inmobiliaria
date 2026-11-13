import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario es obligatorio').max(50),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
});

export type LoginDto = z.infer<typeof LoginSchema>;
