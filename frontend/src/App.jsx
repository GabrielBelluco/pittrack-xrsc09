import ClientPage from './pages/ClientPage.jsx';
import WorkshopPage from './pages/WorkshopPage.jsx';

export default function App() {
  const path = window.location.pathname;
  const clientMatch = path.match(/^\/cliente\/(\d+)$/);

  if (clientMatch) {
    return <ClientPage orderId={Number(clientMatch[1])} />;
  }

  return <WorkshopPage />;
}
