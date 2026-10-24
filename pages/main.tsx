import { createRoot } from 'react-dom/client';
import { App } from '../src/App';
import '../src/styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root is missing in pages/index.html');
createRoot(rootElement).render(<App />);
