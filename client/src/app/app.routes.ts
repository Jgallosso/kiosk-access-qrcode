import { Routes } from '@angular/router';
import { KioskComponent } from './kiosk/kiosk.component';

export const routes: Routes = [
  { path: '', component: KioskComponent },
  { path: '**', redirectTo: '' }
];
