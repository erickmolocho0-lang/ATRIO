import { useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ESPACIO, MEDIDAS } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import type { CampanaInicio } from '@/types';
import { HeroCampana } from './HeroCampana';

interface PropiedadesCarruselCampana {
  campanas: CampanaInicio[];
  alPresionarBoton: (categoriaDestino: string) => void;
}

// Ancho del slide = ancho disponible dentro del contenedor con padding
// lateral (MEDIDAS.margenLateral a cada lado) donde se monta este
// carrusel en Inicio — así cada slide ocupa exactamente el mismo espacio
// que ocupaba el HeroCampana original de un solo banner. Se recalcula si
// cambia el ancho (girar el celular o redimensionar la ventana en web).
export function CarruselCampana({ campanas, alPresionarBoton }: PropiedadesCarruselCampana) {
  const { width: anchoPantalla } = useWindowDimensions();
  const ANCHO_SLIDE = anchoPantalla - MEDIDAS.margenLateral * 2;
  const { colores } = useTema();
  const [indiceActivo, setIndiceActivo] = useState(0);
  const listaRef = useRef<FlatList<CampanaInicio>>(null);

  const alTerminarDesplazar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    const indice = Math.round(evento.nativeEvent.contentOffset.x / ANCHO_SLIDE);
    setIndiceActivo(indice);
  };

  return (
    <View>
      <FlatList
        ref={listaRef}
        data={campanas}
        keyExtractor={(item, indice) => `${item.titulo}-${indice}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={alTerminarDesplazar}
        getItemLayout={(_, indice) => ({ length: ANCHO_SLIDE, offset: ANCHO_SLIDE * indice, index: indice })}
        renderItem={({ item }) => (
          <View style={{ width: ANCHO_SLIDE }}>
            <HeroCampana campana={item} alPresionarBoton={() => alPresionarBoton(item.categoriaDestino)} />
          </View>
        )}
      />
      {campanas.length > 1 ? (
        <View style={styles.puntos}>
          {campanas.map((item, indice) => (
            <View
              key={`${item.titulo}-${indice}`}
              style={[
                styles.punto,
                { backgroundColor: indice === indiceActivo ? colores.tinta : colores.tinta20 },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ESPACIO.xs,
    marginTop: ESPACIO.sm,
  },
  punto: { width: 6, height: 6, borderRadius: 3 },
});
