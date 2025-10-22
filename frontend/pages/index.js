import Head from 'next/head';
import Link from 'next/link';

// Helper component for Feature Icons
const FeatureIcon = ({ children }) => (
  <div className="bg-primary-500 text-white rounded-lg w-12 h-12 flex items-center justify-center mb-4">
    {children}
  </div>
);

export default function HomePage() {
  return (
    <>
      <Head>
        <title>HexaNet - Modern Campus Network Planning</title>
        <meta name="description" content="Streamline your campus network design and deployment with HexaNet." />
      </Head>

      <div className="bg-white text-gray-800 font-sans">
        {/* Header */}
        <header className="py-4 px-6 md:px-12 shadow-md sticky top-0 bg-white z-10">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">HexaNet</h1>
            <nav className="space-x-4">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                Login
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors">
                Sign Up
              </Link>
            </nav>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="bg-gray-50 text-center py-20 px-6">
            <div className="container mx-auto">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                Designing Campus Networks, Simplified.
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                HexaNet is the all-in-one platform for college administrators, designers, and installation teams to collaborate on building robust and efficient campus networks.
              </p>
              <Link href="/register" className="inline-block px-8 py-3 font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                Get Started for Free
              </Link>
            </div>
          </section>
          {/* Other sections can follow here... */}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-6">
          <div className="container mx-auto text-center">
            <p>&copy; {new Date().getFullYear()} HexaNet. All Rights Reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}