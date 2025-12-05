import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsQR from 'jsqr';

type KioskState = 'qrIdle' | 'qrValidando' | 'qrValidado' | 'esperandoIdentificacion' | 'leyendoIdentificacion' | 'identificacionMostrada' | 'accesoAutorizado';

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
            
            <!-- Camera Preview (Hidden in design but active) or Visible? Design implies simple message, but we need scanning. 
                 We'll keep it hidden or show a small preview if desired. For now, following design: hidden or subtle.
                 Actually, usually Kiosks show the camera feed. I'll add a small preview container.
            -->
            <div class="camera-preview" style="width: 300px; height: 300px; border-radius: 1rem; overflow: hidden; margin-bottom: 1rem; border: 2px solid #48b8e9; position: relative;">
                 <video #videoElement [style.display]="'block'" style="width: 100%; height: 100%; object-fit: cover;"></video>
                 <div class="scan-overlay" style="position: absolute; inset: 0; border: 2px solid rgba(255,255,255,0.5);"></div>
            </div>
            <canvas #canvasElement hidden></canvas>

            <!-- Manual Trigger (Optional fallback, keeping it for dev/testing if cam fails) -->
            <button class="btn" (click)="simulateQrScan()" style="margin-top: 1rem; opacity: 0.5; font-size: 1rem;">
                Simular Scan (Fallback)
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
                    <div class="success-icon" style="width: 80px; height: 80px; font-size: 3rem; margin-bottom: 1rem;">✓</div>
                </div>
                <h1 style="font-size: 2rem; margin-bottom: 1.5rem;">¡Qué tal, Erick!</h1>
                <p>Tu código QR es de acceso único.</p>
                <p class="highlight-text">Válido del 05 de dic al 06 de dic.</p>
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #334155;">
                    <p style="font-size: 1rem; color: #e2e8f0;">Ahora vamos a validar tu identificación (INE o licencia).</p>
                </div>
            </div>
        </div>
    </section>

    <!-- PANTALLA 2: CAPTURA INE -->
    <section id="screen-2" class="container" *ngIf="currentState === 'esperandoIdentificacion' || currentState === 'leyendoIdentificacion' || currentState === 'identificacionMostrada'">
        <!-- Estado Inicial -->
        <div id="s2-initial" class="container fade-in" *ngIf="currentState === 'esperandoIdentificacion'">
            <h1>Coloca tu identificación en el módulo correspondiente</h1>
            <h2>Asegúrate de que la INE o licencia esté bien alineada.</h2>
            <button class="btn" (click)="startIdCapture()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="6" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/></svg>
                Capturar identificación
            </button>
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
                        <span class="data-value">Erick Demo Pérez</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label">Fecha de nacimiento</span>
                        <span class="data-value">15/08/1990</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label">Sexo</span>
                        <span class="data-value">Masculino</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label">CURP</span>
                        <span class="data-value">DEPE900815HDFRRL09</span>
                    </div>
                    <div class="data-field" style="grid-column: span 2;">
                        <span class="data-label">Dirección</span>
                        <span class="data-value">Calle Ficticia 123, Colonia Centro, Ciudad Demo</span>
                    </div>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn" (click)="confirmIdData()">Confirmar y continuar</button>
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
  `,
  styles: []
})
export class KioskComponent implements OnInit, OnDestroy {
  currentState: KioskState = 'qrIdle';
  
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  
  private scanning = false;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  constructor() {}

  ngOnInit(): void {
    // Start camera when component inits
    this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // --- CAMERA & QR LOGIC ---

  startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          this.stream = stream;
          // We need to wait for the view to update if we are toggling *ngIf, 
          // but 'qrIdle' is default so it should be fine.
          // Use setTimeout to ensure element exists if strictly needed, but usually ViewChild works after AfterViewInit.
          // Since we are in OnInit, we might need to wait for AfterViewInit or use a setter.
          // For simplicity in this migration, we'll try to set it after a tick.
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
          alert("No se pudo acceder a la cámara. Usar botón manual.");
        });
    }
  }

  stopCamera() {
    this.scanning = false;
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
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
            return; // Stop scanning loop
          }
      }
    }
    
    this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
  }

  // --- STATE MACHINE ---

  onQrDetected(qrData: string) {
    // Pause scanning but keep camera open? 
    // Requirement: "Solo el proceso de decodificación se pausa... cámara SIEMPRE encendida"
    this.scanning = false; 
    
    this.currentState = 'qrValidando';
    
    // Simulate API Validation (2 seconds)
    setTimeout(() => {
        this.currentState = 'qrValidado';
        
        // Wait 3 seconds before moving to ID capture
        setTimeout(() => {
            this.currentState = 'esperandoIdentificacion';
        }, 3000);
    }, 2000);
  }
  
  // Fallback for testing without camera
  simulateQrScan() {
      this.onQrDetected("DEMO_QR_CODE");
  }

  startIdCapture() {
    this.currentState = 'leyendoIdentificacion';
    
    // Simulate processing (3 seconds)
    setTimeout(() => {
        this.currentState = 'identificacionMostrada';
    }, 3000);
  }

  confirmIdData() {
    this.currentState = 'accesoAutorizado';
    
    // Final reset delay (7 seconds)
    setTimeout(() => {
        this.resetFlow();
    }, 7000);
  }

  resetFlow() {
    this.currentState = 'qrIdle';
    // Resume scanning
    this.scanning = true;
    this.tick();
  }
}
