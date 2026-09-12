import { Outlet, useMatch } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function Layout() {
  const isAtlas = useMatch('/atlas/:id/*');

  return (
    <>
      <Navbar />
      <main className={`app-main ${isAtlas ? 'app-main--full' : ''}`}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
