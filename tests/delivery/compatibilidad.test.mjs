import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(resolve(root, 'package.json'))('typescript');
const pedido = { id: 'pedido', usuario_id: 'cliente', numero: 'ATR-TEST', estado: 'preparado', tipo_entrega: 'envio', direccion_id: 'direccion',
  subtotal: 100, descuento: 0, igv: 16.78, total: 110, creado_en: '2026-10-30T12:00:00Z', metodo_entrega_id: 'express', costo_envio: 10, items_pedido: [], pagos: [{metodo:'contra_entrega',estado:'pendiente'}] };
const direccion = { id: 'direccion', usuario_id: 'cliente', etiqueta: 'Casa', direccion: 'Calle de prueba', distrito: 'Chirinos', predeterminada: true, referencia: null, zona_id: 'zona' };

function escenario({ actualizado = false, falta = 'cupon_codigo', errorPedidos = null, errorDirecciones = null } = {}) {
  const llamadas = [];
  const mock = {
    auth: { getUser: async () => ({data:{user:{id:'cliente'}},error:null}) },
    from(tabla) {
      const q = { tabla, columnas: '', filtros: [], singular: false,
        select(columnas) { this.columnas=columnas; return this; },
        eq(c,v) { this.filtros.push(['eq',c,v]); return this; },
        in(c,v) { this.filtros.push(['in',c,v]); return this; },
        order(c,o) { this.orden=[c,o]; return this; },
        maybeSingle() { this.singular=true; return this; },
        then(ok,fail) {
          llamadas.push({tabla:this.tabla,columnas:this.columnas,filtros:[...this.filtros],singular:this.singular,orden:this.orden});
          let result;
          if (tabla === 'pedidos') {
            if (errorPedidos) result={data:null,error:errorPedidos};
            else if (!actualizado && this.columnas.includes(falta)) result={data:null,error:{code:'42703',message:`column pedidos.${falta} does not exist`}};
            else {
              const p=actualizado ? {...pedido,cupon_codigo:'TEST10',datos_entrega:{metodo:{id:'express',nombre:'Express historico',tipo:'envio',descripcion:'Al comprar',costo:10},direccion:{...direccion,destinatario:'Receptor historico',telefono:'999999999'}}} : pedido;
              result={data:this.singular ? p : [p],error:null};
            }
          } else if (tabla === 'direcciones') {
            if (errorDirecciones) result={data:null,error:errorDirecciones};
            else if (!actualizado && this.columnas.includes('destinatario')) result={data:null,error:{code:'42703',message:'column direcciones.destinatario does not exist'}};
            else result={data:[actualizado ? {...direccion,destinatario:'Receptor actual',telefono:'999999999'} : direccion],error:null};
          } else if (tabla === 'perfiles') result={data:[{id:'cliente',nombre:'Cliente de prueba'}],error:null};
          else result={data:null,error:{code:'PGRST205',message:'missing table'}};
          return Promise.resolve(result).then(ok,fail);
        },
      };
      return q;
    },
    rpc(nombre, parametros) {
      llamadas.push({rpc:nombre,parametros});
      const result={data:null,error:{code:'PGRST202',message:'missing function'}};
      return {single:async()=>result,then:(ok,fail)=>Promise.resolve(result).then(ok,fail)};
    },
  };
  const cache=new Map();
  function cargar(nombre) {
    if (cache.has(nombre)) return cache.get(nombre);
    const source=readFileSync(resolve(root,nombre),'utf8');
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const exports={}; cache.set(nombre,exports);
    const req=(id)=> {
      if (id==='@/lib/supabase') return {supabase:mock};
      if (id==='@/utils/compatibilidadLectura') return cargar('src/utils/compatibilidadLectura.ts');
      if (id==='./servicioDirecciones') return cargar('src/services/servicioDirecciones.ts');
      throw new Error(`Dependencia inesperada: ${id}`);
    };
    new Function('require','exports',code)(req,exports);
    return exports;
  }
  return { llamadas, pedidos:cargar('src/services/servicioPedidos.ts').servicioPedidos,
    direcciones:cargar('src/services/servicioDirecciones.ts').servicioDirecciones,
    cupones:cargar('src/services/servicioCupones.ts').servicioCupones,
    compatible:cargar('src/utils/compatibilidadLectura.ts').consultarLecturaCompatible };
}
let count=0;
async function test(name,fn){await fn();console.log(`COMPATIBILIDAD ${++count}: ${name}`);}

await test('El panel carga pedidos y direcciones cuando falta la migracion nueva',async()=>{
  const s=escenario(); const [p]=await s.pedidos.obtenerPedidos();
  assert.equal(p.numero,'ATR-TEST'); assert.equal(p.cliente,'Cliente de prueba'); assert.equal(p.direccion.direccion,'Calle de prueba');
  assert.equal(p.metodoEntrega.id,'express'); assert.equal(p.resumen.envio,10);
  assert.equal(s.llamadas.filter((c)=>c.tabla==='pedidos').length,2);
  assert.equal(s.llamadas.filter((c)=>c.tabla==='direcciones').length,2);
});
await test('El reintento conserva el filtro del usuario y el orden del listado',async()=>{
  const s=escenario(); await s.pedidos.obtenerPedidosDeUsuario('cliente');
  for(const c of s.llamadas.filter((c)=>c.tabla==='pedidos')) {
    assert.deepEqual(c.filtros,[['eq','usuario_id','cliente']]); assert.deepEqual(c.orden,['creado_en',{ascending:false}]);
  }
});
await test('El detalle conserva el numero y maybeSingle al reintentar',async()=>{
  const s=escenario(); const p=await s.pedidos.obtenerPedido('ATR-TEST'); assert.equal(p.numero,'ATR-TEST');
  for(const c of s.llamadas.filter((c)=>c.tabla==='pedidos')) {assert.deepEqual(c.filtros,[['eq','numero','ATR-TEST']]); assert.equal(c.singular,true);}
});
await test('Una base actualizada usa la instantanea y el cupon sin reintentar',async()=>{
  const s=escenario({actualizado:true}); const [p]=await s.pedidos.obtenerPedidos();
  assert.equal(p.codigoCupon,'TEST10'); assert.equal(p.metodoEntrega.nombre,'Express historico'); assert.equal(p.direccion.destinatario,'Receptor historico');
  assert.equal(s.llamadas.filter((c)=>c.tabla==='pedidos').length,1);
});
await test('Tambien tolera que la columna ausente sea datos_entrega',async()=>{
  const s=escenario({falta:'datos_entrega'}); assert.equal((await s.pedidos.obtenerPedidos()).length,1);
});
await test('No esconde errores de permisos, red ni otras columnas',async()=>{
  for(const e of [{code:'42501',message:'permission denied'},{code:'FETCH_ERROR',message:'network failure'},{code:'42703',message:'column pedidos.otra_columna does not exist'}]) {
    const s=escenario({errorPedidos:e}); await assert.rejects(s.pedidos.obtenerPedidos(),new RegExp(e.message));
    assert.equal(s.llamadas.filter((c)=>c.tabla==='pedidos').length,1);
  }
});
await test('Las direcciones anteriores se leen con propiedad de usuario conservada',async()=>{
  const s=escenario(); const [d]=await s.direcciones.obtenerDirecciones(); assert.equal(d.id,'direccion'); assert.equal(d.zonaId,'zona'); assert.equal(d.destinatario,undefined);
  const calls=s.llamadas.filter((c)=>c.tabla==='direcciones'); assert.equal(calls.length,2);
  for(const c of calls) assert.deepEqual(c.filtros,[['eq','usuario_id','cliente']]);
});
await test('Un permiso denegado en direcciones no activa el reintento antiguo',async()=>{
  const s=escenario({errorDirecciones:{code:'42501',message:'permission denied'}});
  await assert.rejects(s.direcciones.obtenerDirecciones(),/permission denied/); assert.equal(s.llamadas.length,1);
});
await test('Admite el error PGRST204 de cache y solo reintenta una vez',async()=>{
  const s=escenario(); const intentos=[];
  const r=await s.compatible(async(anterior)=>{intentos.push(anterior);return {error:{code:'PGRST204',message:"Could not find the 'destinatario' column"}};},['destinatario']);
  assert.deepEqual(intentos,[false,true]); assert.equal(r.error.code,'PGRST204');
});
await test('Cotizar o confirmar sin la migracion falla sin recurrir al cobro anterior',async()=>{
  const s=escenario(); await assert.rejects(s.pedidos.cotizar({metodoEntregaId:'estandar',direccionId:'direccion',codigoCupon:null}),/habilitar/);
  await assert.rejects(s.pedidos.confirmarCompra({metodoPago:'contra_entrega',tipoEntrega:'envio',direccionId:'direccion',metodoEntregaId:'estandar',codigoCupon:null,totalEsperado:110}));
  assert.deepEqual(s.llamadas.map((c)=>c.rpc),['cotizar_checkout','confirmar_compra']);
  assert.equal(s.llamadas[1].parametros.p_total_esperado,110);
});
await test('Cupones informa que falta habilitarlos en vez de mostrar el error SQL',async()=>{
  const s=escenario(); await assert.rejects(s.cupones.listar(),/aún no están habilitados/);
});
console.log(`PASS: ${count} pruebas de compatibilidad de lectura. Supabase simulado.`);
