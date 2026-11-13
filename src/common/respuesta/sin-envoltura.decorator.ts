import { SetMetadata } from '@nestjs/common';

export const SIN_ENVOLTURA_KEY = 'respuesta:sinEnvoltura';

/** La respuesta sale tal cual, sin { ok, data }. Para descargas de archivos (PDF, Excel). */
export const SinEnvoltura = () => SetMetadata(SIN_ENVOLTURA_KEY, true);
