import { Outlet } from 'react-router-dom';

/**
 * Layout component providing the base structure and styling for the app.
 * Includes header and outlet for child routes.
 */
const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header role="banner" className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold ">RuralMail Co-Pilot</h1>
        <p className="text-sm">Your serene delivery assistant</p>
      </header>
      <Outlet />
    </div>
  );
};

export default Layout;