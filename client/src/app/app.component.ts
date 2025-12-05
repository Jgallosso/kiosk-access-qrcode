import { Component } from '@angular/core';
import { KioskComponent } from './kiosk/kiosk.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [KioskComponent],
  template: `
    <!-- Shared Header -->
    <header>
        <img src="https://admin.taggersmart.app/assets/img/logo-light-login.svg" alt="Logo" style="width: 150px; max-width: 100%; height: auto; margin-bottom: 1rem;">
    </header>
    
    <!-- Router Outlet or Direct Component (since we only have one route for now) -->
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent {}
