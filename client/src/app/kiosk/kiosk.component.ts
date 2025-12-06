import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsQR from 'jsqr';
import { AccessService, VisitorData, IneData } from '../services/access.service';

type KioskState = 'qrIdle' | 'qrValidando' | 'qrValidado' | 'esperandoIdentificacion' | 'capturandoIdentificacion' | 'leyendoIdentificacion' | 'identificacionMostrada' | 'accesoAutorizado' | 'error';

@Component({
  selector: 'app-kiosk',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- PANTALLA 1: BIENVENIDA + QR -->
    <section id="screen-1" class="container fade-in" *ngIf="currentState === 'qrIdle' || currentState === 'qrValidando' || currentState === 'qrValidado'">
        
        <!-- Estado Inicial (Idle) -->
        <div id="s1-initial" class="container" *ngIf="currentState === 'qrIdle'">
            <h1>Coloca tu código QR en el lector</h1>
            <h2>El sistema lo detectará automáticamente.</h2>
            
            <div class="camera-preview" style="width: 280px; height: 280px; border-radius: 1rem; overflow: hidden; margin-bottom: 1rem; border: 2px solid #48b8e9; position: relative;">
                 <video #videoElement [style.display]="'block'" style="width: 100%; height: 100%; object-fit: cover;"></video>
                 <div class="scan-overlay" style="position: absolute; inset: 0; border: 2px solid rgba(255,255,255,0.5);"></div>
            </div>
            <canvas #canvasElement hidden></canvas>

            <button class="btn" (click)="simulateQrScan()" style="margin-top: 0.5rem; opacity: 0.5; font-size: 0.9rem;" data-testid="button-simulate-qr">
                Simular Scan (Dev)
            </button>
        </div>

        <!-- Estado Validando -->
        <div id="s1-validating" class="container" *ngIf="currentState === 'qrValidando'">
            <div class="spinner-container">
                <div class="spinner"></div>
                <h2>Validando en el sistema...</h2>
            </div>
        </div>

        <!-- Estado Éxito QR -->
        <div id="s1-success" class="container" *ngIf="currentState === 'qrValidado'">
            <div class="welcome-card fade-in">
                <div style="display: flex; justify-content: center;">
                    <div class="success-icon" style="width: 60px; height: 60px; font-size: 2rem; margin-bottom: 0.75rem;">✓</div>
                </div>
                <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">¡Qué tal, {{ visitorData?.nombre }}!</h1>
                <p style="font-size: 1rem;">Tu código QR es de acceso {{ visitorData?.tipoAcceso }}.</p>
                <p class="highlight-text" style="font-size: 1rem;">Válido del {{ formatDate(visitorData?.fechaInicio) }} al {{ formatDate(visitorData?.fechaFin) }}.</p>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155;">
                    <p style="font-size: 0.9rem; color: #e2e8f0;">Ahora vamos a validar tu identificación (INE o licencia).</p>
                </div>
            </div>
        </div>
    </section>

    <!-- PANTALLA 2: CAPTURA INE -->
    <section id="screen-2" class="container" *ngIf="currentState === 'esperandoIdentificacion' || currentState === 'capturandoIdentificacion' || currentState === 'leyendoIdentificacion' || currentState === 'identificacionMostrada'">
        <!-- Estado Inicial -->
        <div id="s2-initial" class="container fade-in" *ngIf="currentState === 'esperandoIdentificacion'">
            <h1>Coloca tu identificación en el módulo correspondiente</h1>
            <h2>Asegúrate de que la INE o licencia esté bien alineada.</h2>
            <button class="btn" (click)="startIdCapture()" data-testid="button-capture-id">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="6" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/></svg>
                Capturar identificación
            </button>
        </div>

        <!-- Estado Capturando con Cámara -->
        <div id="s2-capturing" class="container fade-in" *ngIf="currentState === 'capturandoIdentificacion'">
            <h1 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Enfoca tu INE o licencia en el recuadro</h1>
            <h2 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Asegúrate de que esté bien iluminada y legible.</h2>
            
            <div class="id-camera-container" style="position: relative; width: 480px; height: 300px; border-radius: 1rem; overflow: hidden; margin: 0 auto 1rem; border: 3px solid #48b8e9; background: #000;">
                <video #ineVideoElement style="width: 100%; height: 100%; object-fit: cover;"></video>
                
                <!-- Recuadro de enfoque -->
                <div class="id-focus-frame" style="position: absolute; inset: 20px; border: 2px dashed rgba(72, 184, 233, 0.8); border-radius: 8px; pointer-events: none;"></div>
                
                <!-- Esquinas del recuadro -->
                <div style="position: absolute; top: 15px; left: 15px; width: 25px; height: 25px; border-top: 3px solid #48b8e9; border-left: 3px solid #48b8e9;"></div>
                <div style="position: absolute; top: 15px; right: 15px; width: 25px; height: 25px; border-top: 3px solid #48b8e9; border-right: 3px solid #48b8e9;"></div>
                <div style="position: absolute; bottom: 15px; left: 15px; width: 25px; height: 25px; border-bottom: 3px solid #48b8e9; border-left: 3px solid #48b8e9;"></div>
                <div style="position: absolute; bottom: 15px; right: 15px; width: 25px; height: 25px; border-bottom: 3px solid #48b8e9; border-right: 3px solid #48b8e9;"></div>
            </div>
            <canvas #ineCanvasElement hidden></canvas>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn" style="background: #334155;" (click)="cancelIdCapture()" data-testid="button-cancel-capture">
                    Cancelar
                </button>
                <button class="btn" (click)="captureIdPhoto()" data-testid="button-take-photo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="4"/><path d="M5 7h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2"/></svg>
                    Capturar
                </button>
            </div>
        </div>

        <!-- Estado Procesando -->
        <div id="s2-processing" class="container" *ngIf="currentState === 'leyendoIdentificacion'">
            <div class="spinner-container">
                <div class="spinner"></div>
                <h2>Leyendo y validando identificación...</h2>
            </div>
        </div>
    </section>

    <!-- MODAL DE CONFIRMACIÓN DE DATOS -->
    <div id="modal-id-data" class="modal-overlay" [class.visible]="currentState === 'identificacionMostrada'">
        <div class="modal-content">
            <h2 class="modal-title">Datos de identificación detectados</h2>
            
            <div class="modal-body">
                <div class="id-data-grid">
                    <div class="data-field">
                        <span class="data-label">Nombre completo</span>
                        <span class="data-value" data-testid="text-nombre">{{ ineData?.nombreCompleto }}</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label">Fecha de nacimiento</span>
                        <span class="data-value" data-testid="text-fecha-nac">{{ ineData?.fechaNacimiento }}</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label">Sexo</span>
                        <span class="data-value" data-testid="text-sexo">{{ ineData?.sexo === 'M' ? 'Masculino' : 'Femenino' }}</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label">CURP</span>
                        <span class="data-value" data-testid="text-curp">{{ ineData?.curp }}</span>
                    </div>
                    <div class="data-field" style="grid-column: span 2;">
                        <span class="data-label">Dirección</span>
                        <span class="data-value" data-testid="text-direccion">{{ ineData?.direccion }}</span>
                    </div>
                </div>
            </div>

            <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn" style="background: #334155;" (click)="retakeIdPhoto()" data-testid="button-retake-id">Volver a capturar</button>
                <button class="btn" (click)="confirmIdData()" data-testid="button-confirm-id">Confirmar y continuar</button>
            </div>
        </div>
    </div>

    <!-- PANTALLA 3: ACCESO AUTORIZADO -->
    <section id="screen-3" class="container fade-in" *ngIf="currentState === 'accesoAutorizado'">
        <div class="screen-3-content">
            <div class="success-icon">✓</div>
            <h1>Acceso autorizado</h1>
            <p>Datos de la identificación validados con éxito.</p>
            <p class="main-msg" style="font-weight: 600; color: #22c55e; margin-top: 0.5rem;">Ya puedes pasar.</p>
            
            <div class="reminders-list">
                <p>• Respeta los límites de velocidad dentro del residencial.</p>
                <p>• Respeta el reglamento y las indicaciones del personal de seguridad.</p>
            </div>
        </div>
    </section>

    <!-- PANTALLA ERROR -->
    <section id="screen-error" class="container fade-in" *ngIf="currentState === 'error'">
        <div class="welcome-card" style="border-color: #ef4444;">
            <div style="display: flex; justify-content: center;">
                <div class="success-icon" style="width: 60px; height: 60px; font-size: 2rem; margin-bottom: 0.75rem; background: rgba(239,68,68,0.1); color: #ef4444;">✕</div>
            </div>
            <h1 style="font-size: 1.5rem; color: #ef4444;">{{ errorMessage }}</h1>
            <button class="btn" (click)="resetFlow()" style="margin-top: 1rem;" data-testid="button-retry">Intentar de nuevo</button>
        </div>
    </section>
  `,
  styles: []
})
export class KioskComponent implements OnInit, OnDestroy {
  private readonly accessService = inject(AccessService);
  private readonly ngZone = inject(NgZone);
  
  currentState: KioskState = 'qrIdle';
  visitorData: VisitorData | null = null;
  ineData: IneData | null = null;
  errorMessage: string = '';
  
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ineVideoElement') ineVideoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('ineCanvasElement') ineCanvasElement!: ElementRef<HTMLCanvasElement>;
  
  private scanning = false;
  private stream: MediaStream | null = null;
  private ineStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  ngOnInit(): void {
    this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          this.stream = stream;
          setTimeout(() => {
            if (this.videoElement) {
                this.videoElement.nativeElement.srcObject = stream;
                this.videoElement.nativeElement.setAttribute('playsinline', 'true');
                this.videoElement.nativeElement.play();
                this.scanning = true;
                requestAnimationFrame(this.tick.bind(this));
            }
          }, 100);
        })
        .catch(err => {
          console.error("Camera error:", err);
        });
    }
  }

  stopCamera() {
    this.scanning = false;
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  tick() {
    if (!this.scanning) return;
    
    if (this.videoElement && this.videoElement.nativeElement.readyState === this.videoElement.nativeElement.HAVE_ENOUGH_DATA) {
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;
      const context = canvas.getContext('2d');

      if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            console.log("QR Found:", code.data);
            this.onQrDetected(code.data);
            return;
          }
      }
    }
    
    this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
  }

  async onQrDetected(qrData: string) {
    this.scanning = false;
    this.currentState = 'qrValidando';
    
    this.accessService.validateQr(qrData).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success && response.data) {
            this.visitorData = response.data;
            this.currentState = 'qrValidado';
            
            setTimeout(() => {
              this.ngZone.run(() => {
                this.currentState = 'esperandoIdentificacion';
              });
            }, 3000);
          } else {
            this.errorMessage = response.message || 'Código QR no válido';
            this.currentState = 'error';
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Error validating QR:', err);
          this.errorMessage = err.message || 'Error al validar código QR';
          this.currentState = 'error';
        });
      }
    });
  }
  
  simulateQrScan() {
    this.onQrDetected("DEMO_QR_CODE");
  }

  startIdCapture() {
    this.currentState = 'capturandoIdentificacion';
    
    setTimeout(() => {
      this.startIneCamera();
    }, 100);
  }

  private startIneCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
        .then(stream => {
          this.ineStream = stream;
          if (this.ineVideoElement) {
            this.ineVideoElement.nativeElement.srcObject = stream;
            this.ineVideoElement.nativeElement.setAttribute('playsinline', 'true');
            this.ineVideoElement.nativeElement.play();
          }
        })
        .catch(err => {
          console.error("INE Camera error:", err);
          this.ngZone.run(() => {
            this.errorMessage = 'Error al acceder a la cámara';
            this.currentState = 'error';
          });
        });
    }
  }

  private stopIneCamera() {
    if (this.ineStream) {
      this.ineStream.getTracks().forEach(track => track.stop());
      this.ineStream = null;
    }
  }

  cancelIdCapture() {
    this.stopIneCamera();
    this.currentState = 'esperandoIdentificacion';
  }

  retakeIdPhoto() {
    this.ineData = null;
    this.startIdCapture();
  }

  captureIdPhoto() {
    if (!this.ineVideoElement || !this.ineCanvasElement) {
      this.errorMessage = 'Error: Cámara no disponible';
      this.currentState = 'error';
      return;
    }

    const video = this.ineVideoElement.nativeElement;
    const canvas = this.ineCanvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      this.errorMessage = 'Error al capturar imagen';
      this.currentState = 'error';
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);
    
    this.stopIneCamera();
    this.currentState = 'leyendoIdentificacion';

    this.accessService.processIne(imageBase64).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success && response.data) {
            this.ineData = response.data;
            this.currentState = 'identificacionMostrada';
          } else {
            this.errorMessage = response.message || 'Error procesando identificación';
            this.currentState = 'error';
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Error processing INE:', err);
          this.errorMessage = err.message || 'Error al procesar identificación';
          this.currentState = 'error';
        });
      }
    });
  }

  confirmIdData() {
    if (!this.ineData?.curp) {
      this.errorMessage = 'No se encontró CURP válido';
      this.currentState = 'error';
      return;
    }

    this.accessService.openGate(this.ineData.curp, 'GATE-MAIN').subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success) {
            this.currentState = 'accesoAutorizado';
            
            setTimeout(() => {
              this.ngZone.run(() => {
                this.resetFlow();
              });
            }, 7000);
          } else {
            this.errorMessage = response.message || 'Error al abrir puerta';
            this.currentState = 'error';
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Error opening gate:', err);
          this.errorMessage = err.message || 'Error al abrir puerta';
          this.currentState = 'error';
        });
      }
    });
  }

  resetFlow() {
    this.stopCamera();
    this.stopIneCamera();
    
    this.currentState = 'qrIdle';
    this.visitorData = null;
    this.ineData = null;
    this.errorMessage = '';
    
    setTimeout(() => {
      this.startCamera();
    }, 100);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return date.toLocaleDateString('es-MX', options);
  }
}
