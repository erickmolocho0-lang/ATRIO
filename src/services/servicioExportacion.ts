import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Guarda el CSV como archivo temporal y abre el menú de compartir del sistema
// (correo, WhatsApp, Drive, etc.). El BOM del inicio hace que Excel muestre bien
// las tildes y la "ñ".
export async function compartirCsv(nombreArchivo: string, contenido: string): Promise<void> {
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) throw new Error('Este dispositivo no permite compartir archivos.');

  const archivo = new File(Paths.cache, nombreArchivo);
  archivo.create({ overwrite: true });
  archivo.write(`\uFEFF${contenido}`);

  await Sharing.shareAsync(archivo.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Reporte de ventas ATRIO',
    UTI: 'public.comma-separated-values-text',
  });
}
