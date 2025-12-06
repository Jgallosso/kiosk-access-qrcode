/**
 * QR Code Validation Service
 * 
 * Este servicio maneja la validación de códigos QR para control de acceso.
 * Actualmente usa datos mock, pero está estructurado para conectarse
 * a una base de datos real o API externa en producción.
 * 
 * INTEGRACIÓN FUTURA:
 * - Conectar a base de datos PostgreSQL para validar UUIDs reales
 * - Implementar caché Redis para validaciones frecuentes
 * - Agregar logs de auditoría para cada validación
 */

export interface VisitorData {
  uuid: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  tipoAcceso: 'unico' | 'multiple' | 'permanente';
  unidadDestino: string;
  residenteAutoriza: string;
}

export interface QrValidationResult {
  success: boolean;
  message: string;
  data?: VisitorData;
  errorCode?: string;
}

const mockVisitors: Record<string, VisitorData> = {
  'DEMO_QR_CODE': {
    uuid: 'DEMO_QR_CODE',
    nombre: 'Erick',
    fechaInicio: '2025-12-05',
    fechaFin: '2025-12-31',
    tipoAcceso: 'unico',
    unidadDestino: 'Casa 42',
    residenteAutoriza: 'María García'
  },
  'VIS-2025-001': {
    uuid: 'VIS-2025-001',
    nombre: 'Carlos Mendoza',
    fechaInicio: '2025-12-01',
    fechaFin: '2025-12-31',
    tipoAcceso: 'multiple',
    unidadDestino: 'Casa 15',
    residenteAutoriza: 'Juan Pérez'
  },
  'VIS-2025-002': {
    uuid: 'VIS-2025-002',
    nombre: 'Ana López',
    fechaInicio: '2025-12-05',
    fechaFin: '2025-12-10',
    tipoAcceso: 'unico',
    unidadDestino: 'Casa 28',
    residenteAutoriza: 'Roberto Sánchez'
  }
};

export class QrService {
  /**
   * Valida un código QR y devuelve los datos del visitante
   * 
   * @param uuid - El UUID escaneado del código QR
   * @returns Resultado de la validación con datos del visitante si es válido
   * 
   * TODO PRODUCCIÓN:
   * - Reemplazar mockVisitors por consulta a base de datos
   * - Agregar validación de fechas en tiempo real
   * - Implementar rate limiting por UUID
   */
  async validateQr(uuid: string): Promise<QrValidationResult> {
    await this.simulateNetworkDelay();

    if (!uuid || uuid.trim() === '') {
      return {
        success: false,
        message: 'Código QR inválido o vacío',
        errorCode: 'QR_EMPTY'
      };
    }

    const visitor = mockVisitors[uuid];

    if (!visitor) {
      return {
        success: false,
        message: 'Código QR no registrado en el sistema',
        errorCode: 'QR_NOT_FOUND'
      };
    }

    const now = new Date();
    const fechaInicio = new Date(visitor.fechaInicio);
    const fechaFin = new Date(visitor.fechaFin);
    fechaFin.setHours(23, 59, 59, 999);

    if (now < fechaInicio) {
      return {
        success: false,
        message: `El acceso aún no está activo. Válido desde ${visitor.fechaInicio}`,
        errorCode: 'QR_NOT_ACTIVE'
      };
    }

    if (now > fechaFin) {
      return {
        success: false,
        message: `El código QR ha expirado. Válido hasta ${visitor.fechaFin}`,
        errorCode: 'QR_EXPIRED'
      };
    }

    return {
      success: true,
      message: 'Código QR validado correctamente',
      data: visitor
    };
  }

  /**
   * Simula latencia de red para desarrollo
   * En producción, eliminar esta función
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.random() * 500 + 500;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const qrService = new QrService();
