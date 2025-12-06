import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CaptureResult {
  success: boolean;
  imageBase64?: string;
  message: string;
  capturedAt?: string;
}

interface StreamProcess {
  process: ChildProcess;
  startedAt: Date;
}

class CameraAnprService {
  private streamProcess: StreamProcess | null = null;
  private readonly tempDir = '/tmp/anpr';

  constructor() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private getRtspUrl(): string {
    return process.env.CAMERA_ANPR_RTSP_URL || '';
  }

  async captureFrame(): Promise<CaptureResult> {
    const rtspUrl = this.getRtspUrl();
    
    if (!rtspUrl) {
      return {
        success: false,
        message: 'CAMERA_ANPR_RTSP_URL no configurada'
      };
    }

    const timestamp = Date.now();
    const outputPath = path.join(this.tempDir, `capture_${timestamp}.jpg`);

    return new Promise((resolve) => {
      const ffmpegArgs = [
        '-rtsp_transport', 'tcp',
        '-y',
        '-i', rtspUrl,
        '-frames:v', '1',
        '-q:v', '2',
        outputPath
      ];

      console.log('[ANPR Camera] Capturando frame...');
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          try {
            const imageBuffer = fs.readFileSync(outputPath);
            const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
            
            fs.unlinkSync(outputPath);
            
            console.log('[ANPR Camera] Frame capturado exitosamente');
            resolve({
              success: true,
              imageBase64,
              message: 'Frame capturado correctamente',
              capturedAt: new Date().toISOString()
            });
          } catch (err) {
            console.error('[ANPR Camera] Error leyendo imagen:', err);
            resolve({
              success: false,
              message: 'Error al leer imagen capturada'
            });
          }
        } else {
          console.error('[ANPR Camera] Error ffmpeg:', stderr);
          resolve({
            success: false,
            message: `Error al capturar frame: código ${code}`
          });
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('[ANPR Camera] Error spawn ffmpeg:', err);
        resolve({
          success: false,
          message: 'Error al ejecutar ffmpeg'
        });
      });

      setTimeout(() => {
        ffmpeg.kill('SIGTERM');
        resolve({
          success: false,
          message: 'Timeout al capturar frame'
        });
      }, 10000);
    });
  }

  startMjpegStream(res: any): { success: boolean; error?: string } {
    const rtspUrl = this.getRtspUrl();
    
    if (!rtspUrl) {
      return { success: false, error: 'CAMERA_ANPR_RTSP_URL no configurada' };
    }

    if (this.streamProcess) {
      this.stopMjpegStream();
    }

    const boundary = 'ffmpegframe';
    
    res.setHeader('Content-Type', `multipart/x-mixed-replace; boundary=${boundary}`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', '5',
      '-r', '10',
      '-an',
      'pipe:1'
    ];

    console.log('[ANPR Camera] Iniciando stream MJPEG...');
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    let buffer = Buffer.alloc(0);
    const jpegStart = Buffer.from([0xFF, 0xD8]);
    const jpegEnd = Buffer.from([0xFF, 0xD9]);

    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      
      let startIdx = buffer.indexOf(jpegStart);
      while (startIdx !== -1) {
        const endIdx = buffer.indexOf(jpegEnd, startIdx);
        if (endIdx !== -1) {
          const frame = buffer.slice(startIdx, endIdx + 2);
          buffer = buffer.slice(endIdx + 2);
          
          try {
            res.write(`--${boundary}\r\n`);
            res.write('Content-Type: image/jpeg\r\n');
            res.write(`Content-Length: ${frame.length}\r\n\r\n`);
            res.write(frame);
            res.write('\r\n');
          } catch (e) {
            console.log('[ANPR Camera] Cliente desconectado');
            ffmpeg.kill('SIGTERM');
            return;
          }
          
          startIdx = buffer.indexOf(jpegStart);
        } else {
          break;
        }
      }
    });
    
    ffmpeg.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('error') || msg.includes('Error')) {
        console.error('[ANPR Camera Stream]', msg);
      }
    });

    ffmpeg.on('close', (code) => {
      console.log('[ANPR Camera] Stream cerrado, código:', code);
      this.streamProcess = null;
      try {
        res.end();
      } catch (e) {}
    });

    this.streamProcess = {
      process: ffmpeg,
      startedAt: new Date()
    };

    return { success: true };
  }

  stopMjpegStream(): void {
    if (this.streamProcess) {
      console.log('[ANPR Camera] Deteniendo stream...');
      this.streamProcess.process.kill('SIGTERM');
      this.streamProcess = null;
    }
  }

  isStreaming(): boolean {
    return this.streamProcess !== null;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const rtspUrl = this.getRtspUrl();
    
    if (!rtspUrl) {
      return {
        success: false,
        message: 'CAMERA_ANPR_RTSP_URL no configurada'
      };
    }

    return new Promise((resolve) => {
      const ffmpegArgs = [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-t', '1',
        '-f', 'null',
        '-'
      ];

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let hasResolved = false;
      
      ffmpeg.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('Stream #0') && !hasResolved) {
          hasResolved = true;
          ffmpeg.kill('SIGTERM');
          resolve({
            success: true,
            message: 'Conexión exitosa con la cámara'
          });
        }
      });

      ffmpeg.on('close', (code) => {
        if (!hasResolved) {
          resolve({
            success: code === 0,
            message: code === 0 ? 'Conexión exitosa' : 'Error de conexión con la cámara'
          });
        }
      });

      setTimeout(() => {
        if (!hasResolved) {
          ffmpeg.kill('SIGTERM');
          resolve({
            success: false,
            message: 'Timeout de conexión con la cámara'
          });
        }
      }, 5000);
    });
  }
}

export const cameraAnprService = new CameraAnprService();
