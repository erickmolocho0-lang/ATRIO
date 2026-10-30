import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { servicioProductos } from '@/services/servicioProductos';
import { servicioPedidos } from '@/services/servicioPedidos';
import type { DatosPago, ProblemaCheckout, Producto, ResumenCheckout } from '@/types';
import { detectarProblemasCantidad, detectarProblemasInactivos, detectarProblemasSeleccion, detectarProblemasStock } from '@/utils/checkout';
import { calcularResumenCheckout } from '@/utils/precio';
import { useCarrito } from './useCarrito';
import { useDirecciones } from './useDirecciones';
import { useSeleccionCheckout } from './useSeleccionCheckout';
import { useCoberturaEntrega } from './useCoberturaEntrega';

export function useCheckout() {
  const { items, resumen: resumenCarrito, codigoCupon, cargando: cargandoCarrito, error: errorCarrito, sincronizarCarrito } = useCarrito();
  const { usuario } = useAuth();
  const { metodoEntregaId, seleccionarMetodoEntrega, reiniciarCheckout } = useSeleccionCheckout();
  const { direccionSeleccionada, cargando: cargandoDirecciones, error: errorDirecciones } = useDirecciones();
  const cobertura = useCoberturaEntrega();
  const [problemasStock, setProblemasStock] = useState<ProblemaCheckout[]>([]);
  const [estado, setEstado] = useState<{ clave: string; resumen?: ResumenCheckout; error?: string; cargando: boolean } | null>(null);
  const solicitud = useRef(0);
  const metodosEntrega = useMemo(() => cobertura.modalidades.filter((m) => m.activo).flatMap((m) => {
    const tarifa = cobertura.zonas.find((z) => z.id === direccionSeleccionada?.zonaId)?.tarifas.find((t) => t.metodoId === m.id);
    if (m.tipo === 'envio' && tarifa == null) return [];
    return [{ id: m.id, nombre: m.nombre, tipo: m.tipo, descripcion: [m.descripcion, m.horario].filter(Boolean).join(' · '), costo: m.tipo === 'retiro' ? 0 : tarifa!.costo }];
  }), [cobertura.modalidades, cobertura.zonas, direccionSeleccionada?.zonaId]);
  const metodoEntrega = metodosEntrega.find((m) => m.id === metodoEntregaId) ?? null;
  const problemasLocales = useMemo(() => [
    ...detectarProblemasSeleccion(items, metodoEntrega, direccionSeleccionada),
    ...detectarProblemasCantidad(items),
  ], [items, metodoEntrega, direccionSeleccionada]);
  const clave = JSON.stringify([items.map((i) => [i.varianteId, i.cantidad, i.producto.precio]), codigoCupon,
    metodoEntrega, direccionSeleccionada, cargandoCarrito, cargandoDirecciones, cobertura.cargando]);
  const listo = !cargandoCarrito && !cargandoDirecciones && !cobertura.cargando && !errorCarrito && !errorDirecciones && !cobertura.error && problemasLocales.length === 0;

  const validar = useCallback(async () => {
    const numero = ++solicitud.current;
    setEstado({ clave, cargando: true });
    try {
      if (!listo || !metodoEntrega) return false;
      const encontrados = await Promise.all([...new Set(items.map((i) => i.producto.id))].map((id) => servicioProductos.obtenerProductoPorId(id)));
      const actuales = new Map<string, Producto>();
      for (const p of encontrados) if (p) actuales.set(p.id, p);
      const problemas = [...detectarProblemasInactivos(items, actuales), ...detectarProblemasStock(items, actuales)];
      if (numero !== solicitud.current) return false;
      setProblemasStock(problemas);
      if (problemas.length) { setEstado({ clave, cargando: false }); return false; }
      const resumen = await servicioPedidos.cotizar({ metodoEntregaId: metodoEntrega.id,
        direccionId: metodoEntrega.tipo === 'envio' ? direccionSeleccionada?.id ?? null : null, codigoCupon });
      if (numero !== solicitud.current) return false;
      setEstado({ clave, resumen, cargando: false });
      return true;
    } catch (err) {
      if (numero === solicitud.current) setEstado({ clave, cargando: false, error: err instanceof Error ? err.message : 'No se pudo verificar el total.' });
      return false;
    } finally {
      if (!listo && numero === solicitud.current) setEstado({ clave, cargando: false });
    }
  // La clave incluye todos los valores que se cotizan; evita invalidar el callback por objetos recreados en cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, listo]);

  useFocusEffect(useCallback(() => {
    void validar();
    return () => { solicitud.current += 1; };
  }, [validar]));

  const validando = cargandoCarrito || cargandoDirecciones || cobertura.cargando || (listo && (estado?.clave !== clave || estado.cargando));
  const error = errorCarrito ?? errorDirecciones ?? cobertura.error ?? (estado?.clave === clave ? estado.error ?? null : null);
  const resumen = estado?.clave === clave && estado.resumen ? estado.resumen : calcularResumenCheckout(resumenCarrito, metodoEntrega?.costo ?? 0);
  const problemas = [...problemasLocales, ...problemasStock];
  const puedeContinuar = listo && !validando && !error && problemas.length === 0 && !!estado?.resumen && estado.clave === clave;
  const datosPago: DatosPago | null = puedeContinuar && metodoEntrega ? { items, direccion: metodoEntrega.tipo === 'envio' ? direccionSeleccionada : null, metodoEntrega, resumen, codigoCupon } : null;
  const continuarAPago = async () => { if (!usuario) { router.push('/(auth)/login'); return; } if (listo && !validando && await validar()) router.push('/pago'); };

  return { items, resumen, metodosEntrega, metodoEntrega, seleccionarMetodoEntrega, direccion: direccionSeleccionada,
    problemas, puedeContinuar, validando, error, datosPago, continuarAPago, reintentarValidacion: async () => { if (errorCarrito) await sincronizarCarrito(); else await validar(); }, requiereSesion: !usuario, reiniciarCheckout };
}
