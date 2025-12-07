import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsQR from 'jsqr';
import { AccessService, VisitorData, IneData, CameraConfig, PlateData } from '../services/access.service';

type KioskState = 
  | 'qrIdle' | 'qrValidando' | 'qrValidado'
  | 'capturandoIne' | 'procesandoIne' | 'ineMostrada'
  | 'capturandoPlaca' | 'procesandoPlaca' | 'placaMostrada'
  | 'accesoAutorizado' | 'error';

@Component({
  selector: 'app-kiosk',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ============================================== -->
    <!-- LAYOUT 1: LECTURA DE QR -->
    <!-- ============================================== -->
    <section id="layout-qr" class="container fade-in" *ngIf="currentState === 'qrIdle' || currentState === 'qrValidando' || currentState === 'qrValidado'">
        
        <!-- Estado Inicial (Idle) -->
        <div id="qr-idle" class="container" *ngIf="currentState === 'qrIdle'">
            <h1>Coloca tu código QR en el lector</h1>
            <h2>Presiona el botón para escanear tu código.</h2>
            
            <div class="qr-preview-container" style="width: 280px; height: 280px; border-radius: 1rem; overflow: hidden; margin-bottom: 1rem; border: 2px solid #48b8e9; position: relative;">
                 <div class="qr-placeholder" [class.fade-out]="qrCameraActive" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); transition: opacity 0.4s ease-out;">
                   <svg viewBox="0 0 100 100" style="width: 180px; height: 180px;">
                     <rect x="5" y="5" width="25" height="25" fill="none" stroke="#48b8e9" stroke-width="4"/>
                     <rect x="10" y="10" width="15" height="15" fill="#48b8e9"/>
                     <rect x="70" y="5" width="25" height="25" fill="none" stroke="#48b8e9" stroke-width="4"/>
                     <rect x="75" y="10" width="15" height="15" fill="#48b8e9"/>
                     <rect x="5" y="70" width="25" height="25" fill="none" stroke="#48b8e9" stroke-width="4"/>
                     <rect x="10" y="75" width="15" height="15" fill="#48b8e9"/>
                     <rect x="35" y="5" width="8" height="8" fill="#475569"/>
                     <rect x="47" y="5" width="8" height="8" fill="#475569"/>
                     <rect x="35" y="17" width="8" height="8" fill="#475569"/>
                     <rect x="55" y="17" width="8" height="8" fill="#475569"/>
                     <rect x="35" y="35" width="8" height="8" fill="#475569"/>
                     <rect x="47" y="35" width="8" height="8" fill="#475569"/>
                     <rect x="35" y="47" width="8" height="8" fill="#475569"/>
                     <rect x="47" y="47" width="15" height="15" fill="none" stroke="#475569" stroke-width="3"/>
                     <rect x="70" y="35" width="8" height="8" fill="#475569"/>
                     <rect x="82" y="35" width="8" height="8" fill="#475569"/>
                     <rect x="70" y="47" width="8" height="8" fill="#475569"/>
                     <rect x="82" y="55" width="8" height="8" fill="#475569"/>
                     <rect x="70" y="70" width="20" height="8" fill="#475569"/>
                     <rect x="70" y="82" width="8" height="8" fill="#475569"/>
                     <rect x="82" y="82" width="8" height="8" fill="#475569"/>
                     <rect x="35" y="70" width="8" height="20" fill="#475569"/>
                     <rect x="47" y="82" width="15" height="8" fill="#475569"/>
                   </svg>
                 </div>
                 <video #videoElement [class.fade-in-camera]="qrCameraActive" [style.display]="qrCameraActive ? 'block' : 'none'" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.4s ease-in;"></video>
                 <div class="scan-overlay" *ngIf="qrCameraActive" style="position: absolute; inset: 0; border: 2px solid rgba(255,255,255,0.5);"></div>
            </div>
            <canvas #canvasElement hidden></canvas>

            <button class="btn" (click)="startQrScan()" *ngIf="!qrCameraActive" style="margin-top: 0.5rem;" data-testid="button-read-qr">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                Leer Código QR
            </button>
            <p *ngIf="qrCameraActive" style="margin-top: 0.5rem; color: #94a3b8; font-size: 0.9rem;">Escaneando...</p>
        </div>

        <!-- Estado Validando -->
        <div id="qr-validando" class="container" *ngIf="currentState === 'qrValidando'">
            <div class="spinner-container">
                <div class="spinner"></div>
                <h2>Validando en el sistema...</h2>
            </div>
        </div>

        <!-- Estado QR Validado -->
        <div id="qr-validado" class="container" *ngIf="currentState === 'qrValidado'">
            <div class="welcome-card fade-in">
                <div style="display: flex; justify-content: center;">
                    <div class="success-icon" style="width: 60px; height: 60px; font-size: 2rem; margin-bottom: 0.75rem;">✓</div>
                </div>
                <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">¡Qué tal, {{ visitorData?.nombre }}!</h1>
                <p style="font-size: 1rem;">Tu código QR es de acceso {{ visitorData?.tipoAcceso }}.</p>
                <p class="highlight-text" style="font-size: 1rem;">Válido del {{ formatDate(visitorData?.fechaInicio) }} al {{ formatDate(visitorData?.fechaFin) }}.</p>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155;">
                    <p style="font-size: 0.9rem; color: #e2e8f0;">Ahora vamos a validar tu identificación.</p>
                    <button class="btn" (click)="goToIneCapture()" style="margin-top: 1rem;" data-testid="button-continue-ine">
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- ============================================== -->
    <!-- LAYOUT 2: VALIDACIÓN DE INE -->
    <!-- ============================================== -->
    <section id="layout-ine" class="container fade-in" *ngIf="currentState === 'capturandoIne' || currentState === 'procesandoIne' || currentState === 'ineMostrada'">
        
        <!-- Progreso -->
        <div class="progress-indicator" style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
            <div class="step completed" style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e;"></div>
            <div class="step active" style="width: 12px; height: 12px; border-radius: 50%; background: #48b8e9;"></div>
            <div class="step" style="width: 12px; height: 12px; border-radius: 50%; background: #475569;"></div>
        </div>

        <!-- Capturando INE -->
        <div id="ine-capturando" class="container fade-in" *ngIf="currentState === 'capturandoIne'">
            <h1 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Paso 1: Captura tu identificación</h1>
            <h2 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Enfoca tu INE o licencia en el recuadro.</h2>
            
            <div class="id-camera-container" style="position: relative; width: 480px; height: 300px; border-radius: 1rem; overflow: hidden; margin: 0 auto 1rem; border: 3px solid #48b8e9; background: #000;">
                <video #ineVideoElement style="width: 100%; height: 100%; object-fit: cover;"></video>
                
                <div class="id-focus-frame" style="position: absolute; inset: 20px; border: 2px dashed rgba(72, 184, 233, 0.8); border-radius: 8px; pointer-events: none;"></div>
                
                <div style="position: absolute; top: 15px; left: 15px; width: 25px; height: 25px; border-top: 3px solid #48b8e9; border-left: 3px solid #48b8e9;"></div>
                <div style="position: absolute; top: 15px; right: 15px; width: 25px; height: 25px; border-top: 3px solid #48b8e9; border-right: 3px solid #48b8e9;"></div>
                <div style="position: absolute; bottom: 15px; left: 15px; width: 25px; height: 25px; border-bottom: 3px solid #48b8e9; border-left: 3px solid #48b8e9;"></div>
                <div style="position: absolute; bottom: 15px; right: 15px; width: 25px; height: 25px; border-bottom: 3px solid #48b8e9; border-right: 3px solid #48b8e9;"></div>
            </div>
            <canvas #ineCanvasElement hidden></canvas>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn" (click)="captureInePhoto()" data-testid="button-take-ine-photo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="4"/><path d="M5 7h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2"/></svg>
                    Capturar
                </button>
            </div>
        </div>

        <!-- Procesando INE -->
        <div id="ine-procesando" class="container" *ngIf="currentState === 'procesandoIne'">
            <div class="spinner-container">
                <div class="spinner"></div>
                <h2>Leyendo y validando identificación...</h2>
            </div>
        </div>

        <!-- INE Mostrada -->
        <div id="ine-mostrada" class="container fade-in" *ngIf="currentState === 'ineMostrada'">
            <h1 style="font-size: 1.3rem; margin-bottom: 0.75rem; color: #22c55e;">Datos de identificación detectados</h1>
            
            <div class="data-card" style="background: #1e293b; border-radius: 1rem; padding: 1.5rem; max-width: 500px; margin: 0 auto 1rem;">
                <div class="id-data-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="data-field">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Nombre completo</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-nombre">{{ ineData?.nombreCompleto }}</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Fecha de nacimiento</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-fecha-nac">{{ ineData?.fechaNacimiento }}</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Sexo</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-sexo">{{ ineData?.sexo === 'M' ? 'Masculino' : 'Femenino' }}</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">CURP</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-curp">{{ ineData?.curp }}</span>
                    </div>
                    <div class="data-field" style="grid-column: span 2;">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Dirección</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-direccion">{{ ineData?.direccion }}</span>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn" style="background: #334155;" (click)="retakeInePhoto()" data-testid="button-retake-ine">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Volver a capturar
                </button>
                <button class="btn" (click)="saveIneAndContinue()" data-testid="button-save-ine">
                    Guardar y continuar
                </button>
            </div>
        </div>
    </section>

    <!-- ============================================== -->
    <!-- LAYOUT 3: VALIDACIÓN DE PLACA -->
    <!-- ============================================== -->
    <section id="layout-placa" class="container fade-in" *ngIf="currentState === 'capturandoPlaca' || currentState === 'procesandoPlaca' || currentState === 'placaMostrada'">
        
        <!-- Progreso -->
        <div class="progress-indicator" style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
            <div class="step completed" style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e;"></div>
            <div class="step completed" style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e;"></div>
            <div class="step active" style="width: 12px; height: 12px; border-radius: 50%; background: #0891b2;"></div>
        </div>

        <!-- Capturando Placa -->
        <div id="placa-capturando" class="container fade-in" *ngIf="currentState === 'capturandoPlaca'">
            <h1 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Paso 2: Captura la placa vehicular</h1>
            <h2 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Posiciona tu vehículo para que la placa sea visible.</h2>
            
            <div class="plate-camera-container" style="position: relative; width: 480px; height: 300px; border-radius: 1rem; overflow: hidden; margin: 0 auto 1rem; border: 3px solid #0891b2; background: #000;">
                <img [src]="anprStreamUrl" style="width: 100%; height: 100%; object-fit: cover;" alt="Stream ANPR" onerror="this.style.display='none'"/>
                
                <div *ngIf="!anprStreamUrl" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
                    <p>Conectando con cámara...</p>
                </div>
                
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 50px; border: 2px dashed rgba(8, 145, 178, 0.8); border-radius: 4px; pointer-events: none;"></div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn" style="background: #0891b2;" (click)="capturePlatePhoto()" data-testid="button-take-plate-photo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="4"/><path d="M5 7h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2"/></svg>
                    Capturar
                </button>
            </div>
        </div>

        <!-- Procesando Placa -->
        <div id="placa-procesando" class="container" *ngIf="currentState === 'procesandoPlaca'">
            <div class="spinner-container">
                <div class="spinner"></div>
                <h2>Leyendo placa vehicular...</h2>
            </div>
        </div>

        <!-- Placa Mostrada -->
        <div id="placa-mostrada" class="container fade-in" *ngIf="currentState === 'placaMostrada'">
            <h1 style="font-size: 1.3rem; margin-bottom: 0.75rem; color: #0891b2;">Placa vehicular detectada</h1>
            
            <div class="data-card" style="background: #1e293b; border-radius: 1rem; padding: 1.5rem; max-width: 500px; margin: 0 auto 1rem;">
                <div class="plate-display" style="text-align: center; margin-bottom: 1rem;">
                    <span style="font-size: 2.5rem; color: #0891b2; font-weight: 700; letter-spacing: 0.1em;" data-testid="text-plate">{{ plateData?.plate }}</span>
                </div>
                <div class="plate-data-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="data-field">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Confianza</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-confidence">{{ (plateData?.confidence || 0) * 100 | number:'1.0-0' }}%</span>
                    </div>
                    <div class="data-field">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Región</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-region">{{ plateData?.region || 'México' }}</span>
                    </div>
                    <div class="data-field" *ngIf="plateData?.vehicleType">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Tipo de vehículo</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-vehicle-type">{{ plateData?.vehicleType }}</span>
                    </div>
                    <div class="data-field" *ngIf="plateData?.color">
                        <span class="data-label" style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Color</span>
                        <span class="data-value" style="font-size: 1rem; color: #e2e8f0; display: block;" data-testid="text-vehicle-color">{{ plateData?.color }}</span>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn" style="background: #334155;" (click)="retakePlatePhoto()" data-testid="button-retake-plate">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Volver a capturar
                </button>
                <button class="btn" style="background: #22c55e;" (click)="finishAndAuthorize()" data-testid="button-finish">
                    Finalizar
                </button>
            </div>
        </div>
    </section>

    <!-- ============================================== -->
    <!-- LAYOUT 4: ACCESO AUTORIZADO -->
    <!-- ============================================== -->
    <section id="layout-success" class="container fade-in" *ngIf="currentState === 'accesoAutorizado'">
        <div class="progress-indicator" style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
            <div class="step completed" style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e;"></div>
            <div class="step completed" style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e;"></div>
            <div class="step completed" style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e;"></div>
        </div>

        <div class="screen-success-content" style="text-align: center;">
            <div class="success-icon" style="width: 100px; height: 100px; font-size: 3rem; margin: 0 auto 1.5rem; background: rgba(34,197,94,0.15); color: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✓</div>
            <h1 style="color: #22c55e; font-size: 2rem; margin-bottom: 1rem;">Acceso autorizado</h1>
            <p class="main-msg" style="font-weight: 700; color: #22c55e; font-size: 2rem; margin: 1.5rem 0;">¡Ya puedes pasar!</p>
            
            <div class="reminders-list" style="max-width: 400px; margin: 2rem auto 0; text-align: center; font-size: 0.9rem; color: #94a3b8;">
                <p>• Respeta los límites de velocidad dentro del residencial.</p>
                <p>• Respeta el reglamento y las indicaciones del personal de seguridad.</p>
            </div>
        </div>
    </section>

    <!-- ============================================== -->
    <!-- PANTALLA ERROR -->
    <!-- ============================================== -->
    <section id="layout-error" class="container fade-in" *ngIf="currentState === 'error'">
        <div class="welcome-card" style="border-color: #ef4444;">
            <div style="display: flex; justify-content: center;">
                <div class="success-icon" style="width: 60px; height: 60px; font-size: 2rem; margin-bottom: 0.75rem; background: rgba(239,68,68,0.1); color: #ef4444;">✕</div>
            </div>
            <h1 style="font-size: 1.5rem; color: #ef4444;">{{ errorMessage }}</h1>
            <button class="btn" (click)="resetFlow()" style="margin-top: 1rem;" data-testid="button-retry">Intentar de nuevo</button>
        </div>
    </section>
  `,
  styles: [`
    .qr-placeholder.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    .fade-in-camera {
      opacity: 1 !important;
    }
  `]
})
export class KioskComponent implements OnInit, OnDestroy {
  private readonly accessService = inject(AccessService);
  private readonly ngZone = inject(NgZone);
  
  currentState: KioskState = 'qrIdle';
  visitorData: VisitorData | null = null;
  ineData: IneData | null = null;
  plateData: PlateData | null = null;
  errorMessage: string = '';
  qrCameraActive: boolean = false;
  anprStreamUrl: string = '';
  
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ineVideoElement') ineVideoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('ineCanvasElement') ineCanvasElement!: ElementRef<HTMLCanvasElement>;
  
  private scanning = false;
  private stream: MediaStream | null = null;
  private ineStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private cameraConfig: CameraConfig | null = null;
  private availableDevices: MediaDeviceInfo[] = [];

  ngOnInit(): void {
    this.loadCameraConfig();
  }

  private async loadCameraConfig() {
    this.accessService.getCameraConfig().subscribe({
      next: (config) => {
        this.cameraConfig = config;
        console.log('[Kiosk] Configuración de cámaras:', config);
      },
      error: (err) => {
        console.error('[Kiosk] Error cargando config de cámaras:', err);
      }
    });
  }

  async startQrScan() {
    this.qrCameraActive = true;
    await this.startCamera();
  }

  private async enumerateCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(d => d.kind === 'videoinput');
      console.log('[Kiosk] Cámaras disponibles:', this.availableDevices.map(d => ({ label: d.label, id: d.deviceId })));
    } catch (e) {
      console.error('[Kiosk] Error enumerando dispositivos:', e);
    }
  }

  private findCameraByName(name: string): string | undefined {
    if (!name) return undefined;
    const device = this.availableDevices.find(d => 
      d.label.toLowerCase().includes(name.toLowerCase())
    );
    return device?.deviceId;
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopIneCamera();
  }

  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());
      
      await this.enumerateCameras();
      
      const qrCameraId = this.cameraConfig?.qrCamera ? this.findCameraByName(this.cameraConfig.qrCamera) : undefined;
      
      const constraints: MediaStreamConstraints = {
        video: qrCameraId 
          ? { deviceId: { exact: qrCameraId } }
          : { facingMode: 'environment' }
      };
      
      console.log('[Kiosk] Iniciando cámara QR con:', qrCameraId ? `deviceId: ${qrCameraId}` : 'facingMode: environment');
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    } catch (err) {
      console.error("Camera error:", err);
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
    this.stopCamera();
    this.qrCameraActive = false;
    this.currentState = 'qrValidando';
    
    this.accessService.validateQr(qrData).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success && response.data) {
            this.visitorData = response.data;
            this.currentState = 'qrValidado';
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

  goToIneCapture() {
    this.currentState = 'capturandoIne';
    setTimeout(() => {
      this.startIneCamera();
    }, 100);
  }

  private async startIneCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    
    try {
      if (this.availableDevices.length === 0 || !this.availableDevices[0].label) {
        await this.enumerateCameras();
      }
      
      const ineCameraId = this.cameraConfig?.ineCamera ? this.findCameraByName(this.cameraConfig.ineCamera) : undefined;
      
      const videoConstraints: MediaTrackConstraints = ineCameraId 
        ? { deviceId: { exact: ineCameraId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } };
      
      console.log('[Kiosk] Iniciando cámara INE con:', ineCameraId ? `deviceId: ${ineCameraId}` : 'facingMode: environment');
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      this.ineStream = stream;
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities() as any;
          const advancedConstraints: any = {};
          
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            advancedConstraints.focusMode = 'continuous';
            console.log('[Kiosk] Enfoque continuo activado');
          }
          
          if (Object.keys(advancedConstraints).length > 0) {
            await videoTrack.applyConstraints({ advanced: [advancedConstraints] });
          }
          
          const settings = videoTrack.getSettings();
          console.log('[Kiosk] Resolución de cámara INE:', settings.width, 'x', settings.height);
        } catch (e) {
          console.log('[Kiosk] No se pudo aplicar configuración de enfoque:', e);
        }
      }
      
      if (this.ineVideoElement) {
        this.ineVideoElement.nativeElement.srcObject = stream;
        this.ineVideoElement.nativeElement.setAttribute('playsinline', 'true');
        this.ineVideoElement.nativeElement.play();
      }
    } catch (err) {
      console.error("INE Camera error:", err);
      this.ngZone.run(() => {
        this.errorMessage = 'Error al acceder a la cámara';
        this.currentState = 'error';
      });
    }
  }

  private stopIneCamera() {
    if (this.ineStream) {
      this.ineStream.getTracks().forEach(track => track.stop());
      this.ineStream = null;
    }
  }

  captureInePhoto() {
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

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    const paddingPercent = 0.04;
    const cropX = Math.floor(videoWidth * paddingPercent);
    const cropY = Math.floor(videoHeight * paddingPercent);
    const cropWidth = Math.floor(videoWidth * (1 - 2 * paddingPercent));
    const cropHeight = Math.floor(videoHeight * (1 - 2 * paddingPercent));
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    console.log('[Kiosk] Captura INE - Resolución original:', videoWidth, 'x', videoHeight);
    console.log('[Kiosk] Captura INE - Área recortada:', cropWidth, 'x', cropHeight);

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.95);
    
    this.stopIneCamera();
    this.currentState = 'procesandoIne';

    this.accessService.processIne(imageBase64).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success && response.data) {
            this.ineData = response.data;
            this.currentState = 'ineMostrada';
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

  retakeInePhoto() {
    this.ineData = null;
    this.currentState = 'capturandoIne';
    setTimeout(() => {
      this.startIneCamera();
    }, 100);
  }

  saveIneAndContinue() {
    this.currentState = 'capturandoPlaca';
    this.anprStreamUrl = this.accessService.getAnprStreamUrl();
  }

  capturePlatePhoto() {
    this.anprStreamUrl = '';
    this.currentState = 'procesandoPlaca';

    this.accessService.captureAnpr().subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success && response.data) {
            this.plateData = response.data;
            this.currentState = 'placaMostrada';
          } else {
            this.errorMessage = response.message || 'No se pudo detectar la placa';
            this.currentState = 'error';
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Error capturing plate:', err);
          this.errorMessage = err.message || 'Error al capturar placa';
          this.currentState = 'error';
        });
      }
    });
  }

  retakePlatePhoto() {
    this.plateData = null;
    this.currentState = 'capturandoPlaca';
    this.anprStreamUrl = this.accessService.getAnprStreamUrl();
  }

  finishAndAuthorize() {
    if (!this.plateData?.plate) {
      this.errorMessage = 'No se detectó placa válida';
      this.currentState = 'error';
      return;
    }

    this.accessService.openGate(this.ineData?.curp || this.plateData.plate, 'GATE-VEHICLE').subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success) {
            this.currentState = 'accesoAutorizado';
            
            setTimeout(() => {
              this.ngZone.run(() => {
                this.resetFlow();
              });
            }, 10000);
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
    this.plateData = null;
    this.errorMessage = '';
    this.qrCameraActive = false;
    this.anprStreamUrl = '';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return date.toLocaleDateString('es-MX', options);
  }
}
