import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrimeReactProvider } from 'primereact/api';
import App from './App';

// PrimeReact structural CSS only (no theme — we own all styling in index.css)
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrimeReactProvider>
      <App />
    </PrimeReactProvider>
  </StrictMode>
);
