import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <App />,
);
