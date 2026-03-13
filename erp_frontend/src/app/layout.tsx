import './globals.css';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { RoleProvider } from '../context/RoleContext';

export const metadata = {
  title: 'City Surveillance - ITMS ERP Platform',
  description: 'Integrated Traffic Management System ERP Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <RoleProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopHeader />
              <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </RoleProvider>
      </body>
    </html>
  );
}
