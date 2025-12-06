import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface VisitorData {
  uuid: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  tipoAcceso: 'unico' | 'multiple' | 'permanente';
  unidadDestino: string;
  residenteAutoriza: string;
}

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

export interface QrValidationResponse {
  success: boolean;
  message: string;
  data?: VisitorData;
  errorCode?: string;
}

export interface IneProcessResponse {
  success: boolean;
  message: string;
  data?: IneData;
  confidence?: number;
  processingTimeMs?: number;
  errorCode?: string;
}

export interface GateOpenResponse {
  success: boolean;
  message: string;
  gateId: string;
  gateName?: string;
  openedAt?: string;
  closesAt?: string;
  errorCode?: string;
}

export interface CameraConfig {
  qrCamera: string;
  ineCamera: string;
}

export interface CameraConfigResponse {
  success: boolean;
  data: CameraConfig;
}

export interface PlateData {
  plate: string;
  confidence: number;
  region?: string;
  vehicleType?: string;
  color?: string;
}

export interface AnprCaptureResponse {
  success: boolean;
  message: string;
  data?: PlateData;
  imageBase64?: string;
  processingTimeMs?: number;
  errorCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccessService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/access';

  /**
   * Valida un código QR escaneado
   * @param uuid - UUID del código QR
   */
  validateQr(uuid: string): Observable<QrValidationResponse> {
    return this.http.post<QrValidationResponse>(`${this.apiUrl}/validate-qr`, { uuid })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Procesa una imagen de INE/Licencia
   * @param imageBase64 - Imagen codificada en base64
   */
  processIne(imageBase64: string): Observable<IneProcessResponse> {
    return this.http.post<IneProcessResponse>(`${this.apiUrl}/process-ine`, { imageBase64 })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Abre una puerta/torniquete
   * @param curp - CURP del visitante
   * @param gateId - ID de la puerta (default: GATE-MAIN)
   */
  openGate(curp: string, gateId: string = 'GATE-MAIN'): Observable<GateOpenResponse> {
    return this.http.post<GateOpenResponse>(`${this.apiUrl}/open-gate`, { curp, gateId })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene la configuración de cámaras
   */
  getCameraConfig(): Observable<CameraConfig> {
    return this.http.get<CameraConfigResponse>('/api/config/cameras')
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Captura y procesa placa vehicular desde cámara ANPR
   */
  captureAnpr(): Observable<AnprCaptureResponse> {
    return this.http.post<AnprCaptureResponse>('/api/anpr/capture', {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * URL del stream ANPR
   */
  getAnprStreamUrl(): string {
    return '/api/anpr/stream';
  }

  /**
   * Manejo centralizado de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error de conexión con el servidor';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado';
    } else if (error.status >= 500) {
      errorMessage = 'Error interno del servidor';
    }
    
    console.error('[AccessService] Error:', errorMessage, error);
    return throwError(() => ({ message: errorMessage, originalError: error }));
  }
}
