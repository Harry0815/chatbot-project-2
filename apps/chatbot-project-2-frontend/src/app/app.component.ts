import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <main class="app-shell">
      <header>
        <p class="eyebrow">Frontend</p>
        <h1>Angular Oberfläche</h1>
        <p class="subtitle">
          Separater Bereich für das Frontend. Die Middleware bleibt im
          <strong>chatbot-project-2</strong>-Service.
        </p>
      </header>
      <section class="content">
        <div>
          <h2>Status</h2>
          <p>Bereit für UI-Entwicklung und weitere Komponenten.</p>
        </div>
        <div>
          <h2>Bereiche</h2>
          <ul>
            <li>UI-Komponenten</li>
            <li>Routing</li>
            <li>API-Anbindung</li>
          </ul>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        color: #0f172a;
      }

      .app-shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        gap: 2.5rem;
        padding: 3.5rem clamp(1.5rem, 4vw, 4rem);
        background: radial-gradient(circle at top, #eef2ff, #ffffff 65%);
      }

      header {
        max-width: 640px;
      }

      .eyebrow {
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #6366f1;
        margin: 0 0 0.75rem;
      }

      h1 {
        font-size: clamp(2.2rem, 4vw, 3.2rem);
        margin: 0 0 1rem;
      }

      .subtitle {
        font-size: 1.1rem;
        line-height: 1.6;
        color: #475569;
        margin: 0;
      }

      .content {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .content > div {
        background: #ffffff;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 12px 30px -20px rgba(15, 23, 42, 0.4);
      }

      h2 {
        margin-top: 0;
        font-size: 1.1rem;
      }

      ul {
        padding-left: 1.2rem;
        margin: 0.75rem 0 0;
        color: #475569;
      }
    `,
  ],
})
export class AppComponent {}
