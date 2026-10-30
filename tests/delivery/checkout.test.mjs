import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const db = new PGlite();
const admin = '11111111-1111-4111-8111-111111111111';
const cliente = '22222222-2222-4222-8222-222222222222';
const otro = '33333333-3333-4333-8333-333333333333';
const variante = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let zona, direccion, direccionOtro, carrito, numeroPedido;
let count = 0;
const test = async (name, fn) => { await fn(); console.log(`CHECKOUT ${++count}: ${name}`); };
async function como(uid, fn, role = 'authenticated') {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid ?? '']);
  await db.query("SELECT set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`SET ROLE ${role}`);
  try { return await fn(); }
  finally { await db.exec('RESET ROLE'); await db.exec("SELECT set_config('request.jwt.claim.sub','',false)"); }
}
const quote = (metodo = 'estandar', id = direccion, codigo = null) => db.query('SELECT * FROM cotizar_checkout($1,$2,$3)', [metodo,id,codigo]);
const comprar = (pago = 'contra_entrega', metodo = 'estandar', id = direccion, codigo = null, total = null, tipo = 'envio') => db.query('SELECT * FROM confirmar_compra($1,$2,$3,$4,$5,$6)', [pago,tipo,id,metodo,codigo,total]);
const guardar = (uid, id = null, nombre = 'Receptor Prueba', predeterminada = false, zonaId = zona) => como(uid, () => db.query('SELECT * FROM guardar_direccion_checkout($1,$2,$3,$4,$5,$6,$7,$8)', ['Calle de prueba 123',zonaId,nombre,'999999999','Casa',null,predeterminada,id]));
const llenar = async () => db.query('INSERT INTO items_carrito(carrito_id,variante_id,cantidad) VALUES($1,$2,2) ON CONFLICT(carrito_id,variante_id) DO UPDATE SET cantidad=2', [carrito,variante]);
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
    INSERT INTO auth.users(id) VALUES('${admin}'),('${cliente}'),('${otro}');
    DROP SCHEMA public CASCADE;`);
  await db.exec(await readFile(resolve(root,'supabase/migrations/20260901_esquema_base.sql'),'utf8'));
  await db.exec(`SET search_path=public; SET row_security=on; SET check_function_bodies=true;
    GRANT USAGE ON SCHEMA public TO authenticated,anon,service_role;
    INSERT INTO perfiles(id,nombre,rol) VALUES('${admin}','Admin','administrador'),('${cliente}','Cliente','cliente'),('${otro}','Otro','cliente');
    CREATE SCHEMA cron; CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;`);
  for (const name of [
    '20261029153624_configurar_delivery_por_zona.sql','20261029_estados_pedido.sql',
    '20261030_cambiar_estado_desde_servidor.sql','20261031000000_seguridad_auth_y_eliminacion.sql',
    '20261031000100_confirmar_compra_productos_activos.sql','20261031_cliente_cancela_pedido.sql',
    '20261101_pedido_pendiente_de_pago.sql','20261102000000_checkout_segundo.sql',
  ]) {
    // pg_cron no existe en PGlite: solo se sustituye la extension y su planificador por un stub.
    // Las funciones y transacciones de negocio se ejecutan sin alteraciones.
    let sql = await readFile(resolve(root,'supabase/migrations',name),'utf8');
    sql = sql.replace('CREATE EXTENSION IF NOT EXISTS pg_cron;','');
    await test(`Aplica ${name}`, () => db.exec(sql));
  }
  await db.exec(`GRANT SELECT,UPDATE ON perfiles TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON direcciones TO authenticated;
    GRANT SELECT ON pedidos,pagos,items_pedido,variantes_producto,productos TO authenticated;
    UPDATE metodos_entrega SET activo=true,descripcion='Entrega coordinada',horario='Horario de prueba';
    INSERT INTO categorias(id,nombre) VALUES('prueba','Prueba');
    INSERT INTO colores(id,nombre,hex) VALUES('negro','Negro','#000000');
    INSERT INTO productos(id,sku,nombre,categoria_id,precio,descripcion) VALUES('prenda-test','TEST-1','Prenda','prueba',100,'Prueba');
    INSERT INTO variantes_producto(id,producto_id,talla,color_id,stock) VALUES('${variante}','prenda-test','M','negro',100);
    INSERT INTO cupones(codigo,porcentaje,activo,minimo_compra) VALUES('PRUEBA10',10,true,150),('INACTIVO',20,false,0),('CADUCADO',20,true,0);
    UPDATE cupones SET vigente_hasta=now()-interval '1 day' WHERE codigo='CADUCADO';`);
  zona = (await como(admin, () => db.query(`SELECT guardar_zona_entrega('Zona test','Chirinos','San Ignacio','Cajamarca','',true,'[{"metodo_id":"estandar","costo":12.50},{"metodo_id":"express","costo":25}]') AS id`))).rows[0].id;
  carrito = (await db.query('INSERT INTO carritos(usuario_id) VALUES($1) RETURNING id',[cliente])).rows[0].id;
  await llenar();
  await test('La primera direccion se hace predeterminada y guarda zona, destinatario y celular', async () => {
    const d = (await guardar(cliente)).rows[0]; direccion = d.id;
    assert.equal(d.predeterminada,true); assert.equal(d.zona_id,zona); assert.equal(d.destinatario,'Receptor Prueba');
  });
  direccionOtro = (await guardar(otro)).rows[0].id;
  await test('No permite modificar la direccion de otro usuario', () => assert.rejects(guardar(cliente,direccionOtro), /no te pertenece/));
  await test('Un fallo revierte el cambio de predeterminada', async () => {
    await assert.rejects(guardar(cliente,null,'X',true), /Revisa la direccion/);
    assert.equal((await db.query('SELECT predeterminada FROM direcciones WHERE id=$1',[direccion])).rows[0].predeterminada,true);
  });
  await test('Cambiar la predeterminada afecta solo al usuario y deja una sola', async () => {
    const otra = (await guardar(cliente,null,'Otro receptor',true)).rows[0].id;
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM direcciones WHERE usuario_id=$1 AND predeterminada',[cliente])).rows[0].n),1);
    assert.equal((await db.query('SELECT predeterminada FROM direcciones WHERE id=$1',[direccionOtro])).rows[0].predeterminada,true);
    await guardar(cliente,direccion,'Receptor Prueba',true);
    assert.equal((await db.query('SELECT predeterminada FROM direcciones WHERE id=$1',[otra])).rows[0].predeterminada,false);
  });
  await test('Cliente y anon no administran cupones', async () => {
    await como(cliente, async () => {
      assert.equal((await db.query('SELECT * FROM cupones')).rows.length,0);
      await assert.rejects(db.exec("INSERT INTO cupones(codigo,porcentaje) VALUES('ILEGAL',10)"), {code:'42501'});
    });
    await como(null, () => assert.rejects(db.query("SELECT * FROM validar_cupon('PRUEBA10')"),{code:'42501'}),'anon');
  });
  await test('Cupon se normaliza y valida minimo, vigencia y activacion en servidor', async () => {
    await como(cliente, async () => {
      assert.equal((await db.query("SELECT * FROM validar_cupon(' prueba10 ')")).rows[0].descuento,'20.00');
      for (const c of ['INACTIVO','CADUCADO','NOEXISTE']) await assert.rejects(db.query('SELECT * FROM validar_cupon($1)',[c]), /cupon/);
    });
  });
  await test('Cotiza exactamente productos menos descuento mas delivery por zona', async () => {
    const q = (await como(cliente,()=>quote('estandar',direccion,'PRUEBA10'))).rows[0];
    assert.equal(Number(q.subtotal),200); assert.equal(Number(q.descuento),20); assert.equal(Number(q.costo_envio),12.5); assert.equal(Number(q.total),192.5);
    assert.equal(q.datos_entrega.metodo.id,'estandar'); assert.equal(q.datos_entrega.direccion.destinatario,'Receptor Prueba');
  });
  await test('Express usa su tarifa y retiro no requiere direccion ni cobra envio', async () => {
    assert.equal(Number((await como(cliente,()=>quote('express'))).rows[0].total),225);
    assert.equal(Number((await como(cliente,()=>quote('retiro',null))).rows[0].total),200);
  });
  await test('Direccion ajena, zona inactiva y modalidad inactiva se rechazan', async () => {
    await como(cliente,()=>assert.rejects(quote('estandar',direccionOtro),/no te pertenece/));
    await db.query('UPDATE zonas_entrega SET activo=false WHERE id=$1',[zona]);
    await como(cliente,()=>assert.rejects(quote(),/No hay envio/));
    await db.query('UPDATE zonas_entrega SET activo=true WHERE id=$1',[zona]);
    await db.exec("UPDATE metodos_entrega SET activo=false WHERE id='express'");
    await como(cliente,()=>assert.rejects(quote('express'),/metodo/));
    await db.exec("UPDATE metodos_entrega SET activo=true WHERE id='express'");
  });
  await test('Metodo omitido y total manipulado no crean pedido ni consumen stock/carrito', async () => {
    const stock = (await db.query('SELECT stock FROM variantes_producto WHERE id=$1',[variante])).rows[0].stock;
    await como(cliente,()=>assert.rejects(comprar('contra_entrega',null),/metodo exacto/));
    await como(cliente,()=>assert.rejects(comprar('contra_entrega','estandar',direccion,null,0),/total cambio/));
    assert.equal((await db.query('SELECT stock FROM variantes_producto WHERE id=$1',[variante])).rows[0].stock,stock);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM items_carrito WHERE carrito_id=$1',[carrito])).rows[0].n),1);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM pedidos')).rows[0].n),0);
  });
  await test('Tarifa cambiada tras cotizar exige revisar el total', async () => {
    await db.query("UPDATE tarifas_entrega SET costo=15 WHERE zona_id=$1 AND metodo_id='estandar'",[zona]);
    await como(cliente,()=>assert.rejects(comprar('contra_entrega','estandar',direccion,'PRUEBA10',192.5),/total cambio/));
    await db.query("UPDATE tarifas_entrega SET costo=12.5 WHERE zona_id=$1 AND metodo_id='estandar'",[zona]);
  });
  await test('Producto inactivo y stock insuficiente no se compran', async () => {
    await db.exec("UPDATE productos SET activo=false WHERE id='prenda-test'");
    await como(cliente,()=>assert.rejects(comprar(),/no est[aá] disponible/));
    await db.exec("UPDATE productos SET activo=true WHERE id='prenda-test'");
    await db.query('UPDATE variantes_producto SET stock=1 WHERE id=$1',[variante]);
    await como(cliente,()=>assert.rejects(comprar(),/stock suficiente/));
    await db.query('UPDATE variantes_producto SET stock=100 WHERE id=$1',[variante]);
  });
  await test('Compra atomica guarda modalidad, cupon, costo, instantanea y pago pendiente', async () => {
    const r = (await como(cliente,()=>comprar('tarjeta','express',direccion,'PRUEBA10',205))).rows[0]; numeroPedido=r.numero;
    const p = (await db.query('SELECT * FROM pedidos WHERE numero=$1',[numeroPedido])).rows[0];
    assert.equal(p.estado,'pendiente_pago'); assert.equal(p.metodo_entrega_id,'express'); assert.equal(Number(p.costo_envio),25); assert.equal(p.cupon_codigo,'PRUEBA10');
    assert.equal(p.datos_entrega.metodo.nombre,'Envío express');
    assert.equal(Number((await db.query('SELECT monto FROM pagos WHERE pedido_id=$1',[p.id])).rows[0].monto),205);
    assert.equal((await db.query('SELECT estado FROM pagos WHERE pedido_id=$1',[p.id])).rows[0].estado,'pendiente');
    assert.equal((await db.query('SELECT stock FROM variantes_producto WHERE id=$1',[variante])).rows[0].stock,98);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM items_carrito WHERE carrito_id=$1',[carrito])).rows[0].n),0);
  });
  await test('Repetir confirmacion con carrito vacio no duplica el pedido',()=>como(cliente,()=>assert.rejects(comprar(),/carrito est[aá] vac[ií]o/)));
  await test('Editar direccion/metodo no cambia la instantanea del pedido', async () => {
    await guardar(cliente,direccion,'Nombre cambiado',true);
    await db.exec("UPDATE metodos_entrega SET nombre='Express cambiado' WHERE id='express'");
    const p=(await db.query('SELECT datos_entrega FROM pedidos WHERE numero=$1',[numeroPedido])).rows[0];
    assert.equal(p.datos_entrega.direccion.destinatario,'Receptor Prueba'); assert.equal(p.datos_entrega.metodo.nombre,'Envío express');
  });
  await test('Cancelacion de Hans conserva historial y devuelve stock una sola vez', async () => {
    await como(cliente,()=>db.query("SELECT cambiar_estado_pedido($1,'cancelado')",[numeroPedido]));
    assert.equal((await db.query('SELECT stock FROM variantes_producto WHERE id=$1',[variante])).rows[0].stock,100);
    await como(cliente,()=>assert.rejects(db.query("SELECT cambiar_estado_pedido($1,'cancelado')",[numeroPedido]),/No tienes permiso|no puede pasar/));
    assert.equal((await db.query('SELECT stock FROM variantes_producto WHERE id=$1',[variante])).rows[0].stock,100);
  });
  await test('Un error despues de desmarcar la anterior revierte toda la operacion', async () => {
    await db.exec(`CREATE FUNCTION fallo_direccion_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.etiqueta='FALLO' THEN RAISE EXCEPTION 'Fallo inducido despues del cambio'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fallo_direccion_test BEFORE INSERT ON direcciones FOR EACH ROW EXECUTE FUNCTION fallo_direccion_test();`);
    await como(cliente, () => assert.rejects(db.query('SELECT * FROM guardar_direccion_checkout($1,$2,$3,$4,$5,$6,$7,$8)',
      ['Calle de prueba 456',zona,'Receptor','999999999','FALLO',null,true,null]), /Fallo inducido/));
    assert.equal((await db.query('SELECT predeterminada FROM direcciones WHERE id=$1',[direccion])).rows[0].predeterminada,true);
    await db.exec('DROP TRIGGER fallo_direccion_test ON direcciones; DROP FUNCTION fallo_direccion_test();');
  });
  await test('Zona sin tarifa no se ofrece y cero permite envio gratuito', async () => {
    await llenar();
    await db.query("DELETE FROM tarifas_entrega WHERE zona_id=$1 AND metodo_id='estandar'",[zona]);
    await como(cliente,()=>assert.rejects(quote(),/No hay envio/));
    await db.query("INSERT INTO tarifas_entrega(zona_id,metodo_id,costo) VALUES($1,'estandar',0)",[zona]);
    assert.equal(Number((await como(cliente,()=>quote())).rows[0].costo_envio),0);
  });
  await test('Cupon revocado tras cotizar no puede confirmarse', async () => {
    await db.exec("UPDATE cupones SET activo=false WHERE codigo='PRUEBA10'");
    await como(cliente,()=>assert.rejects(comprar('contra_entrega','estandar',direccion,'PRUEBA10',180),/cupon/));
    await db.exec("UPDATE cupones SET activo=true,minimo_compra=300 WHERE codigo='PRUEBA10'");
    await como(cliente,()=>assert.rejects(quote('estandar',direccion,'PRUEBA10'),/minimo/));
    await db.exec("UPDATE cupones SET minimo_compra=150 WHERE codigo='PRUEBA10'");
  });
  await test('Contra entrega conserva preparado y retiro registra envio cero', async () => {
    await llenar();
    const r = (await como(cliente,()=>comprar('contra_entrega','retiro',null,null,200,'retiro'))).rows[0];
    const p = (await db.query('SELECT * FROM pedidos WHERE numero=$1',[r.numero])).rows[0];
    assert.equal(p.estado,'preparado'); assert.equal(p.metodo_entrega_id,'retiro'); assert.equal(p.direccion_id,null); assert.equal(p.datos_entrega.direccion,null);
  });
  await test('Anonimizar cuenta retira destinatario y celular del pedido conservado', async () => {
    await db.query('UPDATE pedidos SET usuario_id=NULL WHERE numero=$1',[numeroPedido]);
    assert.equal((await db.query('SELECT datos_entrega FROM pedidos WHERE numero=$1',[numeroPedido])).rows[0].datos_entrega.direccion,null);
  });
  console.log(`PASS: ${count} comprobaciones de checkout. Cron simulado; no se invoco Mercado Pago ni Supabase remoto.`);
} finally { await db.close(); }
