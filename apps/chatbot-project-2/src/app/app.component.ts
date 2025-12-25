import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Chatbot Project 2';
  highlights = [
    'Angular-Frontend mit eigenständigem Einstiegspunkt',
    'Klare Struktur für UI-Module und zukünftige Features',
    'Bereit für Chat- und Service-Integrationen',
  ];
}
