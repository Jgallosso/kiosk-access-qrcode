import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <!-- Shared Header -->
    <header>
        <img src="https://admin.taggersmart.app/assets/img/logo-light-login.svg" alt="Logo" style="width: 150px; max-width: 100%; height: auto; margin-bottom: 1rem;">
    </header>
    
    <!-- Router Outlet -->
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent {}
