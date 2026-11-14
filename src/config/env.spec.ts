import { swaggerHabilitado } from './env.js';

describe('swaggerHabilitado', () => {
  it('sin variable: activo en desarrollo, apagado en producción', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'development' })).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'production' })).toBe(false);
  });

  it('SWAGGER_HABILITADO manda sobre NODE_ENV', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_HABILITADO: 'true' })).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'development', SWAGGER_HABILITADO: 'false' })).toBe(false);
  });
});
