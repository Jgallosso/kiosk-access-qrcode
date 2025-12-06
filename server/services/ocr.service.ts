/**
 * OCR Service para procesamiento de identificaciones (INE/Licencia)
 * 
 * Este servicio usa OCR.space API cuando está configurada la API key,
 * de lo contrario usa datos mock para desarrollo.
 * 
 * Variables de entorno requeridas para producción:
 * - OCR_SPACE_API_KEY: API key de ocr.space
 */

import { processWithOcrSpace } from './api.ocr.service';

export interface IneData {
  nombreCompleto: string;
  fechaNacimiento: string;
  direccion: string;
  sexo: 'M' | 'F';
  curp: string;
  claveElector?: string;
  vigencia?: string;
  seccion?: string;
}

export interface OcrProcessResult {
  success: boolean;
  message: string;
  data?: IneData;
  confidence?: number;
  errorCode?: string;
  processingTimeMs?: number;
}

const mockIneData: IneData[] = [
  {
    nombreCompleto: 'Erick Demo Pérez',
    fechaNacimiento: '15/08/1990',
    direccion: 'Calle Ficticia 123, Colonia Centro, Ciudad Demo',
    sexo: 'M',
    curp: 'DEPE900815HDFRRL09',
    claveElector: 'DMPRER90081509H100',
    vigencia: '2029',
    seccion: '1234'
  },
  {
    nombreCompleto: 'María García López',
    fechaNacimiento: '22/03/1985',
    direccion: 'Av. Principal 456, Col. Las Flores, CDMX',
    sexo: 'F',
    curp: 'GALM850322MDFRPR01',
    claveElector: 'GRLPMR85032209M200',
    vigencia: '2028',
    seccion: '5678'
  }
];

export class OcrService {
  /**
   * Procesa una imagen de INE/Licencia y extrae los datos mediante OCR
   * 
   * Si OCR_SPACE_API_KEY está configurada, usa la API real.
   * De lo contrario, retorna datos mock para desarrollo.
   */
  async processIne(imageBase64: string): Promise<OcrProcessResult> {
    const startTime = Date.now();

    if (!imageBase64) {
      return {
        success: false,
        message: 'Imagen inválida o vacía',
        errorCode: 'OCR_INVALID_IMAGE',
        processingTimeMs: Date.now() - startTime
      };
    }

    // Usar API real si está configurada
    if (process.env.OCR_SPACE_API_KEY) {
      console.log('[OCR] Usando OCR.space API');
      const result = await processWithOcrSpace(imageBase64);
      
      if (result.success && result.data) {
        const ineData: IneData = {
          nombreCompleto: `${result.data.nombre} ${result.data.apellidos}`.trim(),
          fechaNacimiento: result.data.fechaNacimiento,
          direccion: result.data.domicilio,
          sexo: result.data.sexo === 'Masculino' ? 'M' : 'F',
          curp: result.data.curp,
        };

        return {
          success: true,
          message: 'Identificación procesada correctamente',
          data: ineData,
          confidence: 0.92,
          processingTimeMs: Date.now() - startTime
        };
      }

      return {
        success: false,
        message: result.message,
        errorCode: 'OCR_API_ERROR',
        processingTimeMs: Date.now() - startTime
      };
    }

    // Modo desarrollo: usar datos mock
    console.log('[OCR] Usando datos mock (OCR_SPACE_API_KEY no configurada)');
    await this.simulateOcrProcessing();

    const randomIndex = Math.floor(Math.random() * mockIneData.length);
    const extractedData = mockIneData[randomIndex];

    const confidence = 0.85 + Math.random() * 0.14;

    return {
      success: true,
      message: 'Identificación procesada correctamente (modo desarrollo)',
      data: extractedData,
      confidence: Math.round(confidence * 100) / 100,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Valida que el CURP tenga formato correcto
   * 
   * @param curp - CURP a validar
   * @returns true si el formato es válido
   */
  validateCurpFormat(curp: string): boolean {
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
    return curpRegex.test(curp);
  }

  /**
   * Simula el tiempo de procesamiento OCR
   * En producción, el tiempo real dependerá del proveedor
   */
  private async simulateOcrProcessing(): Promise<void> {
    const delay = Math.random() * 1500 + 1500;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const ocrService = new OcrService();
