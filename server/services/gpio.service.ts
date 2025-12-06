/**
 * GPIO Service para control de hardware (Raspberry Pi)
 * 
 * Este servicio maneja la apertura de puertas/torniquetes mediante GPIO.
 * Actualmente es un mock, pero está estructurado para funcionar en Raspberry Pi.
 * 
 * INTEGRACIÓN FUTURA (Raspberry Pi):
 * - Instalar: npm install onoff (librería GPIO para Node.js)
 * - Configurar pines GPIO según hardware instalado
 * - Implementar watchdog para evitar puertas abiertas indefinidamente
 * - Agregar sensores de estado (puerta abierta/cerrada)
 * - Conectar con sistema de alarma
 * 
 * PINES TÍPICOS:
 * - GPIO17: Relé puerta principal
 * - GPIO27: Relé puerta vehicular
 * - GPIO22: Sensor magnético puerta
 * - GPIO23: LED indicador
 */

export interface GateConfig {
  id: string;
  name: string;
  gpioPin: number;
  openDurationMs: number;
  type: 'pedestrian' | 'vehicular' | 'emergency';
}

export interface GateOpenResult {
  success: boolean;
  message: string;
  gateId: string;
  gateName?: string;
  openedAt?: string;
  closesAt?: string;
  errorCode?: string;
}

export interface AccessLogEntry {
  id: string;
  curp: string;
  gateId: string;
  timestamp: string;
  action: 'open' | 'close' | 'denied';
  reason?: string;
}

const gateConfigs: Record<string, GateConfig> = {
  'GATE-MAIN': {
    id: 'GATE-MAIN',
    name: 'Puerta Principal Peatonal',
    gpioPin: 17,
    openDurationMs: 5000,
    type: 'pedestrian'
  },
  'GATE-VEHICLE': {
    id: 'GATE-VEHICLE',
    name: 'Acceso Vehicular',
    gpioPin: 27,
    openDurationMs: 15000,
    type: 'vehicular'
  },
  'GATE-EMERGENCY': {
    id: 'GATE-EMERGENCY',
    name: 'Salida de Emergencia',
    gpioPin: 22,
    openDurationMs: 10000,
    type: 'emergency'
  }
};

const accessLog: AccessLogEntry[] = [];

export class GpioService {
  private isRaspberryPi: boolean;
  
  constructor() {
    this.isRaspberryPi = this.detectRaspberryPi();
    if (this.isRaspberryPi) {
      console.log('[GPIO] Raspberry Pi detectada - Modo GPIO real');
      this.initializeGpio();
    } else {
      console.log('[GPIO] Entorno de desarrollo - Modo simulado');
    }
  }

  /**
   * Abre una puerta/torniquete específico
   * 
   * @param curp - CURP del visitante (para log de auditoría)
   * @param gateId - ID de la puerta a abrir
   * @returns Resultado de la operación
   * 
   * TODO PRODUCCIÓN:
   * - Usar librería 'onoff' para control GPIO real
   * - Implementar mutex para evitar operaciones concurrentes
   * - Agregar timeout de seguridad
   */
  async openGate(curp: string, gateId: string): Promise<GateOpenResult> {
    const gate = gateConfigs[gateId];

    if (!gate) {
      this.logAccess(curp, gateId, 'denied', 'Puerta no encontrada');
      return {
        success: false,
        message: `Puerta ${gateId} no configurada en el sistema`,
        gateId,
        errorCode: 'GATE_NOT_FOUND'
      };
    }

    if (!curp || curp.length !== 18) {
      this.logAccess(curp, gateId, 'denied', 'CURP inválido');
      return {
        success: false,
        message: 'CURP inválido para autorización',
        gateId,
        errorCode: 'INVALID_CURP'
      };
    }

    try {
      await this.activateGpio(gate);
      
      const openedAt = new Date();
      const closesAt = new Date(openedAt.getTime() + gate.openDurationMs);
      
      this.logAccess(curp, gateId, 'open');

      return {
        success: true,
        message: `${gate.name} abierta correctamente`,
        gateId: gate.id,
        gateName: gate.name,
        openedAt: openedAt.toISOString(),
        closesAt: closesAt.toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logAccess(curp, gateId, 'denied', errorMessage);
      return {
        success: false,
        message: `Error al abrir puerta: ${errorMessage}`,
        gateId,
        errorCode: 'GPIO_ERROR'
      };
    }
  }

  /**
   * Obtiene el log de accesos
   */
  getAccessLog(limit: number = 100): AccessLogEntry[] {
    return accessLog.slice(-limit);
  }

  /**
   * Detecta si estamos corriendo en Raspberry Pi
   */
  private detectRaspberryPi(): boolean {
    try {
      const fs = require('fs');
      const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      return cpuInfo.includes('Raspberry') || cpuInfo.includes('BCM');
    } catch {
      return false;
    }
  }

  /**
   * Inicializa los pines GPIO (solo en Raspberry Pi)
   * 
   * TODO: Descomentar en producción con Raspberry Pi
   */
  private initializeGpio(): void {
    /*
    // Ejemplo de inicialización con 'onoff':
    const Gpio = require('onoff').Gpio;
    
    Object.values(gateConfigs).forEach(gate => {
      const pin = new Gpio(gate.gpioPin, 'out');
      pin.writeSync(0); // Estado inicial: cerrado
    });
    */
  }

  /**
   * Activa el GPIO para abrir la puerta
   * 
   * @param gate - Configuración de la puerta
   */
  private async activateGpio(gate: GateConfig): Promise<void> {
    if (this.isRaspberryPi) {
      /*
      // Código real para Raspberry Pi:
      const Gpio = require('onoff').Gpio;
      const pin = new Gpio(gate.gpioPin, 'out');
      
      // Activar relé (abrir puerta)
      pin.writeSync(1);
      
      // Esperar duración configurada
      await new Promise(r => setTimeout(r, gate.openDurationMs));
      
      // Desactivar relé (cerrar puerta)
      pin.writeSync(0);
      */
    } else {
      console.log(`[GPIO MOCK] Abriendo ${gate.name} (Pin ${gate.gpioPin}) por ${gate.openDurationMs}ms`);
      await new Promise(r => setTimeout(r, 500));
      console.log(`[GPIO MOCK] ${gate.name} señal enviada`);
    }
  }

  /**
   * Registra un evento de acceso en el log
   */
  private logAccess(curp: string, gateId: string, action: AccessLogEntry['action'], reason?: string): void {
    const entry: AccessLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      curp,
      gateId,
      timestamp: new Date().toISOString(),
      action,
      reason
    };
    
    accessLog.push(entry);
    
    console.log(`[ACCESS LOG] ${action.toUpperCase()} - CURP: ${curp.substring(0, 4)}**** Gate: ${gateId}${reason ? ` Reason: ${reason}` : ''}`);
  }
}

export const gpioService = new GpioService();
