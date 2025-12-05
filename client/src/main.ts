import 'zone.js';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

console.log('Bootstrapping Angular App...');

bootstrapApplication(AppComponent, appConfig)
  .then(() => console.log('Bootstrap success!'))
  .catch((err) => console.error('Bootstrap error:', err));
