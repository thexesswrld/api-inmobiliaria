import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ ok: true, data: 'Hello World!' });
  });

  it('/usuarios (GET) sin token → 401', () => {
    return request(app.getHttpServer())
      .get('/usuarios')
      .expect(401)
      .expect((res) => expect(res.body).toMatchObject({ ok: false, error: { codigo: 'NO_AUTENTICADO' } }));
  });

  afterEach(async () => {
    await app.close();
  });
});
