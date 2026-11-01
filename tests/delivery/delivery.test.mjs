import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(pathToFileURL(resolve(root, 'package.json')))('typescript');
const db = new PGlite();
const admin = '11111111-1111-4111-8111-111111111111';
const cliente = '22222222-2222-4222-8222-222222222222';
let zonaId;
let count = 0;
async function test(name, fn) { await fn(); console.log(`OK ${++count}: ${name}`); }
async function como(role, uid, fn) {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid ?? '']);
  await db.exec(`SET ROLE ${role}`);
  try { return await fn(); }
  finally { await db.exec('RESET ROLE'); await db.exec("SELECT set_config('request.jwt.claim.sub', '', false)"); }
}
async function cobertura() { return (await db.query('SELECT * FROM public.obtener_cobertura_entrega()')).rows; }
async function guardar(overrides = {}) {
  const p = { nombre: 'Zona de prueba', distrito: 'Distrito de prueba', provincia: 'Provincia de prueba',
    departamento: 'Departamento de prueba', mapsUrl: 'https://maps.app.goo.gl/prueba', activo: true,
    tarifas: [{ metodo_id: 'estandar', costo: 12.5 }, { metodo_id: 'express', costo: 20 }], id: null, ...overrides };
  const result = await db.query('SELECT public.guardar_zona_entrega($1,$2,$3,$4,$5,$6,$7::jsonb,$8::uuid) AS id',
    [p.nombre,p.distrito,p.provincia,p.departamento,p.mapsUrl,p.activo,JSON.stringify(p.tarifas),p.id]);
  return result.rows[0].id;
}

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    INSERT INTO auth.users(id) VALUES ('${admin}'), ('${cliente}');
    DROP SCHEMA public CASCADE;
  `);
  const baseline = await readFile(resolve(root, 'supabase/migrations/20260901_esquema_base.sql'), 'utf8');
  await test('El esquema base real de Alexander se aplica en PostgreSQL local', () => db.exec(baseline));
  await db.exec(`
    SET search_path = public;
    SET row_security = on;
    SET check_function_bodies = true;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    INSERT INTO public.perfiles(id, nombre, rol) VALUES
      ('${admin}', 'Administracion de prueba', 'administrador'),
      ('${cliente}', 'Cliente de prueba', 'cliente');
    GRANT SELECT, UPDATE ON public.perfiles TO authenticated;
  `);
  const folder = resolve(root, 'supabase/migrations');
  const name = (await readdir(folder)).find((f) => f.endsWith('_configurar_delivery_por_zona.sql'));
  assert.ok(name, 'Debe existir la migracion por zona creada con la CLI.');
  const sql = await readFile(resolve(folder, name), 'utf8');
  await test('La migración se aplica completa en PostgreSQL local', () => db.exec(sql));
  await test('Carga nueve destinos inactivos, sin precios ni horarios inventados', async () => {
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM zonas_entrega')).rows[0].n), 9);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM zonas_entrega WHERE activo')).rows[0].n), 0);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM tarifas_entrega')).rows[0].n), 0);
    assert.equal(Number((await db.query("SELECT count(*) AS n FROM metodos_entrega WHERE activo OR horario <> ''")).rows[0].n), 0);
    const names = (await db.query('SELECT nombre FROM zonas_entrega')).rows.map((r) => r.nombre).sort();
    assert.deepEqual(names, ['La Palma','El Corazón','Indoamérica','Los Cuyes','La Primavera','La Tranca','Lambayeque','Los Rayos','Los Álamos'].sort());
  });
  await test('La cuenta administradora ve las modalidades y zonas inactivas', async () => {
    await como('authenticated', admin, async () => {
      assert.equal((await db.query('SELECT * FROM zonas_entrega')).rows.length, 9);
      assert.equal((await db.query('SELECT * FROM metodos_entrega')).rows.length, 3);
    });
  });
  await test('Público y clientes no ven configuración inactiva', async () => {
    for (const [role, uid] of [['anon', null], ['authenticated', cliente]]) {
      await como(role, uid, async () => {
        assert.deepEqual(await cobertura(), []);
        assert.equal((await db.query('SELECT * FROM zonas_entrega')).rows.length, 0);
        assert.equal((await db.query('SELECT * FROM metodos_entrega')).rows.length, 0);
      });
    }
  });
  await test('Sin sesión o con cuenta cliente no se puede usar el guardado administrativo', async () => {
    for (const [role, uid] of [['anon', null], ['authenticated', cliente], ['authenticated', null]]) {
      await como(role, uid, () => assert.rejects(guardar(), { code: '42501' }));
    }
  });
  await test('La administradora guarda borradores con ubicación pendiente', async () => {
    await como('authenticated', admin, () => guardar({ nombre: 'Borrador de prueba', activo: false,
      distrito: '', provincia: '', departamento: '', tarifas: [] }));
  });
  await test('No permite activar una zona sin ubicación o sin tarifas', async () => {
    await como('authenticated', admin, async () => {
      await assert.rejects(guardar({ distrito: '' }), { code: '23514' });
      await assert.rejects(guardar({ tarifas: [] }), { code: '22023' });
    });
  });
  await test('Rechaza JSON inválido, modalidades repetidas o importes con tipo incorrecto', async () => {
    await como('authenticated', admin, async () => {
      for (const tarifas of [null, {}, [null], [{ metodo_id: 'retiro', costo: 2 }],
        [{ metodo_id: 'estandar', costo: '12' }], [{ costo: 2 }],
        [{ metodo_id: 'estandar', costo: 2 }, { metodo_id: 'estandar', costo: 3 }]]) {
        await assert.rejects(guardar({ tarifas }), { code: '22023' });
      }
    });
  });
  await test('Solo acepta enlaces https de Google Maps', async () => {
    await como('authenticated', admin, async () => {
      for (const mapsUrl of ['javascript:alert(1)', 'https://maps.app.goo.gl.ejemplo.com/x', 'http://maps.app.goo.gl/x']) {
        await assert.rejects(guardar({ mapsUrl }), { code: '23514' });
      }
    });
  });
  await test('La administradora guarda una zona y sus dos tarifas en una operación', async () => {
    zonaId = await como('authenticated', admin, () => guardar());
    assert.ok(zonaId);
    const tarifas = (await db.query('SELECT * FROM tarifas_entrega WHERE zona_id = $1', [zonaId])).rows;
    assert.equal(tarifas.length, 2);
  });
  await test('Se exige plazo y horario para activar una modalidad', async () => {
    await como('authenticated', admin, async () => {
      await assert.rejects(db.exec("UPDATE metodos_entrega SET activo = true WHERE id = 'estandar'"), { code: '23514' });
      await db.exec("UPDATE metodos_entrega SET activo = true, descripcion = 'Plazo de prueba', horario = 'Horario de prueba' WHERE tipo = 'envio'");
    });
  });
  await test('Los clientes leen solo las combinaciones ofrecidas, con precio y horario', async () => {
    for (const [role, uid] of [['anon', null], ['authenticated', cliente]]) {
      await como(role, uid, async () => {
        const rows = await cobertura();
        assert.equal(rows.length, 2);
        assert.equal(rows[0].zona_id, zonaId);
        assert.equal(rows[0].zona, 'Zona de prueba');
        assert.equal(rows[0].horario, 'Horario de prueba');
        assert.deepEqual(rows.map((r) => Number(r.costo)).sort((a,b) => a-b), [12.5,20]);
      });
    }
  });
  await test('Un cliente no puede cambiar tarifas mediante las tablas directas', async () => {
    await como('authenticated', cliente, async () => {
      assert.equal((await db.query("UPDATE metodos_entrega SET nombre = 'Alterado' WHERE id = 'estandar' RETURNING id")).rows.length, 0);
      assert.equal((await db.query('UPDATE tarifas_entrega SET costo = 0 RETURNING zona_id')).rows.length, 0);
      assert.equal((await db.query('DELETE FROM tarifas_entrega RETURNING zona_id')).rows.length, 0);
      await assert.rejects(db.query("INSERT INTO tarifas_entrega(zona_id, metodo_id, costo) VALUES ($1,'estandar',0)", [zonaId]), { code: '42501' });
    });
    assert.equal(Number((await db.query("SELECT costo FROM tarifas_entrega WHERE zona_id=$1 AND metodo_id='estandar'", [zonaId])).rows[0].costo), 12.5);
  });
  await test('Editar la zona reemplaza sus tarifas sin dejar modalidades sobrantes', async () => {
    await como('authenticated', admin, () => guardar({ id: zonaId, tarifas: [{ metodo_id: 'estandar', costo: 3.5 }] }));
    assert.equal((await cobertura()).length, 1);
    assert.equal(Number((await cobertura())[0].costo), 3.5);
  });
  await test('Un fallo al guardar una tarifa revierte también el cambio de zona', async () => {
    await como('authenticated', admin, () => assert.rejects(guardar({ id: zonaId, nombre: 'Nombre no guardado',
      tarifas: [{ metodo_id: 'estandar', costo: -1 }] }), { code: '23514' }));
    assert.equal((await cobertura())[0].zona, 'Zona de prueba');
    assert.equal(Number((await cobertura())[0].costo), 3.5);
  });
  await test('Rechaza importes negativos, fuera de rango, no finitos o con más de dos decimales', async () => {
    for (const costo of ['-1','1.001','NaN','Infinity','100000000']) {
      await assert.rejects(db.query('UPDATE tarifas_entrega SET costo=$1::numeric WHERE zona_id=$2', [costo,zonaId]), { code: '23514' });
    }
  });
  await test('Cero representa envío gratuito y un campo vacío elimina la modalidad', async () => {
    await como('authenticated', admin, () => guardar({ id: zonaId, tarifas: [{ metodo_id: 'estandar', costo: 0 }] }));
    await como('authenticated', cliente, async () => assert.equal(Number((await cobertura())[0].costo), 0));
    await como('authenticated', admin, () => guardar({ id: zonaId, activo: false, tarifas: [] }));
    assert.equal((await db.query('SELECT * FROM tarifas_entrega WHERE zona_id=$1', [zonaId])).rows.length, 0);
    await como('authenticated', admin, () => guardar({ id: zonaId }));
  });
  await test('Evita duplicados por nombre y ubicación y permite varias localidades del mismo distrito', async () => {
    await como('authenticated', admin, async () => {
      await assert.rejects(guardar({ nombre: ' ZONA DE PRUEBA ' }), { code: '23505' });
      await guardar({ nombre: 'Otra localidad', activo: false, tarifas: [] });
    });
  });
  await test('No permite editar una zona inexistente', async () => {
    await como('authenticated', admin, () => assert.rejects(guardar({ id: '99999999-9999-4999-8999-999999999999' }), { code: 'P0002' }));
  });
  await test('Desactivar una zona o modalidad oculta las tarifas al público', async () => {
    await como('authenticated', admin, () => guardar({ id: zonaId, activo: false }));
    await como('anon', null, async () => {
      assert.deepEqual(await cobertura(), []);
      assert.equal((await db.query('SELECT * FROM tarifas_entrega')).rows.length, 0);
    });
    await como('authenticated', admin, () => guardar({ id: zonaId }));
    await como('authenticated', admin, () => db.exec("UPDATE metodos_entrega SET activo = false WHERE tipo='envio'"));
    await como('authenticated', cliente, async () => assert.deepEqual(await cobertura(), []));
  });
  await test('Las funciones respetan RLS y tienen search_path fijo', async () => {
    const rows = (await db.query("SELECT prosecdef, proconfig FROM pg_proc WHERE proname IN ('guardar_zona_entrega','obtener_cobertura_entrega')")).rows;
    assert.equal(rows.length, 2);
    for (const row of rows) { assert.equal(row.prosecdef, false); assert.ok(row.proconfig.some((v) => v.startsWith('search_path='))); }
  });
  await test('La migración puede aplicarse sobre la base existente sin duplicar ni sobrescribir configuración', async () => {
    const before = (await db.query('SELECT * FROM zonas_entrega ORDER BY id')).rows;
    const prices = (await db.query('SELECT * FROM tarifas_entrega ORDER BY zona_id,metodo_id')).rows;
    const methods = (await db.query('SELECT * FROM metodos_entrega ORDER BY id')).rows;
    await db.exec(sql);
    assert.deepEqual((await db.query('SELECT * FROM zonas_entrega ORDER BY id')).rows, before);
    assert.deepEqual((await db.query('SELECT * FROM tarifas_entrega ORDER BY zona_id,metodo_id')).rows, prices);
    assert.deepEqual((await db.query('SELECT * FROM metodos_entrega ORDER BY id')).rows, methods);
  });
  await test('El trigger del esquema base impide que un cliente se convierta en administrador', async () => {
    await como('authenticated', cliente, async () => {
      await db.query("UPDATE public.perfiles SET rol='administrador' WHERE id=$1", [cliente]);
      const row = (await db.query('SELECT rol FROM public.perfiles WHERE id=$1', [cliente])).rows[0];
      assert.equal(row.rol, 'cliente');
      await assert.rejects(guardar(), { code: '42501' });
    });
  });

  const source = await readFile(resolve(root, 'src/utils/entregas.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const utils = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  await test('La entrada de precios distingue vacío, envío gratuito y decimales con coma', async () => {
    assert.equal(utils.interpretarTarifa(''), null);
    assert.equal(utils.interpretarTarifa(' 0 '), 0);
    assert.equal(utils.interpretarTarifa('12,50'), 12.5);
    assert.equal(utils.interpretarTarifa('99999999.99'), 99999999.99);
    for (const value of ['-1','NaN','Infinity','1e3','1.001','S/ 12','100000000']) assert.throws(() => utils.interpretarTarifa(value));
  });
  await test('El formulario valida horarios, ubicación, cobertura y enlaces', async () => {
    const zona = { nombre: 'Zona', distrito: '', provincia: '', departamento: '', mapsUrl: '', activo: false, tarifas: [] };
    utils.validarZonaEntrega(zona);
    assert.throws(() => utils.validarZonaEntrega({ ...zona, activo: true }));
    assert.throws(() => utils.validarZonaEntrega({ ...zona, mapsUrl: 'javascript:alert(1)' }));
    assert.throws(() => utils.validarZonaEntrega({ ...zona, tarifas: [{ metodoId: 'estandar', costo: -1 }] }));
    utils.validarZonaEntrega({ ...zona, distrito: 'D', provincia: 'P', departamento: 'R', activo: true, tarifas: [{ metodoId: 'estandar', costo: 0 }] });
    const modalidad = { id: 'estandar', nombre: 'Estándar', tipo: 'envio', descripcion: '', horario: '', activo: false };
    utils.validarModalidadEntrega(modalidad);
    assert.throws(() => utils.validarModalidadEntrega({ ...modalidad, activo: true }));
    assert.equal(utils.esEnlaceMaps('https://maps.app.goo.gl/ejemplo'), true);
    assert.equal(utils.esEnlaceMaps('https://maps.app.goo.gl.evil.com/x'), false);
  });
  console.log(`PASS: ${count} comprobaciones locales. No se ha conectado a Supabase real.`);
} catch (error) {
  console.error('FAIL:', error.code ?? error.name, error.message);
  process.exitCode = 1;
} finally { await db.close(); }
