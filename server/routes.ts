import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import { qrService } from "./services/qr.service";
import { ocrService } from "./services/ocr.service";
import { gpioService } from "./services/gpio.service";

interface ValidateQrRequest {
  uuid: string;
}

interface ProcessIneRequest {
  imageBase64: string;
}

interface OpenGateRequest {
  curp: string;
  gateId: string;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  /**
   * POST /api/access/validate-qr
   * Valida un código QR escaneado y devuelve datos del visitante
   * 
   * Body: { uuid: string }
   * Response: { success: boolean, message: string, data?: VisitorData }
   */
  app.post('/api/access/validate-qr', async (req: Request, res: Response) => {
    try {
      const { uuid } = req.body as ValidateQrRequest;
      
      if (!uuid) {
        return res.status(400).json({
          success: false,
          message: 'UUID del código QR es requerido',
          errorCode: 'MISSING_UUID'
        });
      }

      const result = await qrService.validateQr(uuid);
      
      const statusCode = result.success ? 200 : 404;
      return res.status(statusCode).json(result);
      
    } catch (error) {
      console.error('[API] Error en validate-qr:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * POST /api/access/process-ine
   * Procesa una imagen de INE/Licencia mediante OCR
   * 
   * Body: { imageBase64: string }
   * Response: { success: boolean, message: string, data?: IneData, confidence?: number }
   */
  app.post('/api/access/process-ine', async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body as ProcessIneRequest;
      
      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          message: 'Imagen en base64 es requerida',
          errorCode: 'MISSING_IMAGE'
        });
      }

      const result = await ocrService.processIne(imageBase64);
      
      const statusCode = result.success ? 200 : 422;
      return res.status(statusCode).json(result);
      
    } catch (error) {
      console.error('[API] Error en process-ine:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * POST /api/access/open-gate
   * Abre una puerta/torniquete específico
   * 
   * Body: { curp: string, gateId: string }
   * Response: { success: boolean, message: string, gateId: string, openedAt?: string, closesAt?: string }
   */
  app.post('/api/access/open-gate', async (req: Request, res: Response) => {
    try {
      const { curp, gateId } = req.body as OpenGateRequest;
      
      if (!curp || !gateId) {
        return res.status(400).json({
          success: false,
          message: 'CURP y gateId son requeridos',
          errorCode: 'MISSING_PARAMS'
        });
      }

      const result = await gpioService.openGate(curp, gateId);
      
      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
      
    } catch (error) {
      console.error('[API] Error en open-gate:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * GET /api/access/log
   * Obtiene el historial de accesos (para panel de administración)
   * 
   * Query: { limit?: number }
   * Response: AccessLogEntry[]
   */
  app.get('/api/access/log', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const log = gpioService.getAccessLog(limit);
      
      return res.status(200).json({
        success: true,
        data: log,
        count: log.length
      });
      
    } catch (error) {
      console.error('[API] Error en access log:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        qr: 'active',
        ocr: 'active (mock)',
        gpio: 'active (mock)'
      }
    });
  });

  return httpServer;
}
