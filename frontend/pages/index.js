import Head from 'next/head';
import Link from 'next/link';
import { Share2, Users, ClipboardList, Wrench, Building, Mail, Phone, MapPin } from 'lucide-react';

// --- Reusable Components (kept inside this file for simplicity) ---

const AnimatedNetworkGraphic = () => (
  <div className="relative w-[300px] h-[300px] md:w-[350px] md:h-[350px]">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-primary-500 pulse-anim" style={{ animationDelay: '0s' }}></div>
    <div className="absolute top-[20%] left-[15%] w-16 h-16 rounded-full bg-indigo-400 pulse-anim" style={{ animationDelay: '0.5s' }}></div>
    <div className="absolute top-[15%] right-[20%] w-16 h-16 rounded-full bg-indigo-400 pulse-anim" style={{ animationDelay: '1s' }}></div>
    <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-indigo-400 pulse-anim" style={{ animationDelay: '1.5s' }}></div>
    <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 350 350">
      <line x1="175" y1="175" x2="87.5" y2="87.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <line x1="175" y1="175" x2="262.5" y2="87.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <line x1="175" y1="175" x2="175" y2="280" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
    </svg>
  </div>
);

const SectionTitle = ({ children }) => (
    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{children}</h2>
);

const FeatureCard = ({ icon, title, children }) => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl text-center">
        <div className="mx-auto mb-4 bg-primary-100 text-primary-600 w-16 h-16 flex items-center justify-center rounded-full">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-900">{title}</h3>
        <p className="text-gray-600">{children}</p>
    </div>
);

// --- Main Landing Page Component ---

export default function LandingPage() {
    return (
        <>
            <Head>
                <title>HexaNet - Campus Network Planner</title>
                <meta name="description" content="The all-in-one platform for planning, designing, and deploying campus networks with seamless collaboration." />
                <style>{`
                    .hero-background {
                        background: linear-gradient(135deg, #4f46e5 0%, #1e3a8a 100%);
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.1); opacity: 0.7; }
                    }
                    .pulse-anim {
                        animation: pulse 4s ease-in-out infinite;
                    }
                    html { scroll-behavior: smooth; }
                `}</style>
            </Head>
            
            <div className="bg-white text-gray-800">
                {/* Header */}
                <header className="flex justify-between items-center py-4 px-6 md:px-12 bg-white/95 backdrop-blur-sm shadow-sm fixed top-0 w-full z-50">
                    <a href="#home" className="flex items-center space-x-3">
                        <Share2 className="h-8 w-8 text-primary-600" />
                        <span className="text-2xl font-bold text-slate-800 tracking-tight">HexaNet</span>
                    </a>
                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="#home" className="font-medium text-gray-600 hover:text-primary-600 transition-colors">Home</a>
                        <a href="#services" className="font-medium text-gray-600 hover:text-primary-600 transition-colors">Services</a>
                        <a href="#about" className="font-medium text-gray-600 hover:text-primary-600 transition-colors">About</a>
                        <a href="#contact" className="font-medium text-gray-600 hover:text-primary-600 transition-colors">Contact</a>
                    </nav>
                    <div className="space-x-2">
                         <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                            Login
                        </Link>
                        <Link href="/register" className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors">
                            Sign Up
                        </Link>
                    </div>
                </header>

                <main>
                    {/* Hero Section */}
                    <section id="home" className="min-h-screen flex items-center justify-center hero-background text-white relative pt-20">
                        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight tracking-tighter mb-6 text-center lg:text-left">Designing Campus Networks, Simplified.</h1>
                                <p className="text-lg lg:text-xl text-indigo-200 mb-8 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">HexaNet is the all-in-one platform for administrators, designers, and installers to collaborate on building robust and efficient campus networks.</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                     <Link href="/register" className="px-8 py-3 font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-lg transition-transform transform hover:scale-105 text-center">Get Started</Link>
                                     <a href="#services" className="px-8 py-3 font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg text-center">Learn More</a>
                                </div>
                            </div>
                            <div className="w-full hidden lg:flex items-center justify-center"><AnimatedNetworkGraphic /></div>
                        </div>
                    </section>

                    {/* Services Section */}
                    <section id="services" className="py-24 px-6 bg-gray-50">
                        <div className="max-w-6xl mx-auto text-center">
                            <SectionTitle>A Better Workflow For Everyone</SectionTitle>
                            <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">From initial request to final installation, our platform streamlines every step, ensuring clarity, efficiency, and better results for all teams.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
                               <FeatureCard icon={<ClipboardList size={28} />} title="Client Requests">College administrators can easily submit detailed project requirements, kicking off the process without ambiguity.</FeatureCard>
                               <FeatureCard icon={<Users size={28} />} title="Web Admin Oversight">Admins manage users, assign projects, and maintain a clear overview of all ongoing network plans.</FeatureCard>
                               <FeatureCard icon={<Share2 size={28} />} title="Collaborative Design">Network Designers access requirements, create architectures, and share plans for approval in one place.</FeatureCard>
                               <FeatureCard icon={<Wrench size={28} />} title="Streamlined Installation">Installation Teams receive approved designs and specifications to execute the plan efficiently on-site.</FeatureCard>
                            </div>
                        </div>
                    </section>
                    
                    {/* About Section */}
                    <section id="about" className="py-24 px-6 bg-white">
                        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
                             <div className="text-center lg:text-left">
                                <SectionTitle>About HexaNet</SectionTitle>
                                <p className="mt-6 text-lg text-gray-600">We specialize in creating robust, scalable network solutions for educational institutions. Our platform connects IT directors with expert network architects to deliver comprehensive design plans that meet the unique needs of modern campuses.</p>
                                <div className="mt-8 flex justify-center lg:justify-start flex-wrap gap-8 md:gap-12">
                                    <div><p className="text-4xl font-extrabold text-primary-600">500+</p><p className="text-gray-500 font-medium">Projects Completed</p></div>
                                    <div><p className="text-4xl font-extrabold text-primary-600">150+</p><p className="text-gray-500 font-medium">Educational Partners</p></div>
                                    <div><p className="text-4xl font-extrabold text-primary-600">99%</p><p className="text-gray-500 font-medium">Client Satisfaction</p></div>
                                </div>
                             </div>
                             <div className="flex items-center justify-center p-8">
                                 <div className="w-64 h-64 bg-gray-100 rounded-full flex items-center justify-center">
                                     <Building size={80} className="text-gray-300" />
                                 </div>
                             </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    <section id="contact" className="py-24 px-6 bg-gray-50">
                        <div className="max-w-4xl mx-auto text-center">
                            <SectionTitle>Get In Touch</SectionTitle>
                            <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">Have questions or want to learn more? We'd love to hear from you.</p>
                            <div className="mt-12 flex flex-col md:flex-row justify-center items-center gap-8 text-gray-700">
                                <div className="flex items-center gap-3"><Mail size={20} className="text-primary-600" /><span>support@hexanet.com</span></div>
                                <div className="flex items-center gap-3"><Phone size={20} className="text-primary-600" /><span>+1 (555) 123-4567</span></div>
                                <div className="flex items-center gap-3"><MapPin size={20} className="text-primary-600" /><span>123 Network St, Tech City</span></div>
                            </div>
                        </div>
                    </section>
                </main>
                
                {/* Footer */}
                <footer className="bg-slate-800 text-white py-8">
                    <div className="container mx-auto text-center text-gray-400">
                        <p>&copy; {new Date().getFullYear()} HexaNet. All Rights Reserved.</p>
                        <p className="text-sm mt-2">Modernizing Campus Connectivity</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
