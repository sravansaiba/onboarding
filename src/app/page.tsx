'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';


  function QrCodeIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h4v4H3V3zm6 6h4v4H9V9zm-6 6h4v4H3v-4zm12-12h4v4h-4V3zm-6 6h4v4h-4v-4zm6 0h4v4h-4v-4zm-6 6h4v4h-4v-4zm6 0h4v4h-4v-4zm-6 6h4v4H9v-4zm6 0h4v4h-4v-4zm6 0h2v2h-2v-2zm0-6h2v2h-2v-2zm0-6h2v2h-2v-2z" />
      </svg>
    );
  }

  function KotSystemIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    );
  }

  function AnalyticsIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-5h2v5zm4 0h-2v-3h2v3zm0-5h-2v-2h2v2zm4 5h-2V7h2v10z" />
      </svg>
    );
  }

  function MultiLocationIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
      </svg>
    );
  }

  function AllInOneIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14H7v-2h4v2zm0-4H7v-2h4v2zm0-4H7V7h4v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2z" />
      </svg>
    );
  }

  function GroupOrderingIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    );
  }

  function DineInIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    );
  }


  function TakeawayIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .89 2 2h-4c0-1.11.9-2 2-2zm6 14H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v10z" />
      </svg>
    );
  }




export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // package selection & accordion
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  useEffect(() => {
    const loginStatus = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loginStatus);
  },[setIsLoggedIn]);

  const PACKAGE_MAP: Record<string, { label: string; points: string[]; services: string[]; icon: React.ComponentType; price?: string }> = {
    'marinate-menu': {
      label: 'Marinate — Menu',
      points: [
        'Unlimited QR Code Menu Generation',
        'Easy Menu Management with Bulk Upload',
        'Mobile-Responsive Menus & Basic Reports'
      ],
      services: ['dine_in','takeaway'],
      icon: DineInIcon,
    },
    'marinate-dinein': {
      label: 'Marinate — Dine-in',
      points: [
        'All features from Marinate Menu',
        'Advanced Table Management & KOT',
        'Takeaway support & Order prioritization'
      ],
      services: ['dine_in', 'takeaway'],
      icon: TakeawayIcon,
    },
    'marinate360': {
      label: 'Marinate360',
      points: [
        'Full package: Dine-in, Delivery, Takeaway & Catering',
        'Advanced analytics, multi-location & KOT',
        'Custom integrations & Dedicated account manager'
      ],
      services: ['dine_in', 'delivery', 'takeaway', 'catering'],
      icon: AllInOneIcon,
    }
  };

  const handlePackageSelect = (pkgId: string) => {
    const newSelected = selectedPackage === pkgId ? null : pkgId;
    setSelectedPackage(newSelected);
    setExpandedPackage(newSelected);
  };

  const toggleExpandPackage = (pkgId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedPackage(prev => (prev === pkgId ? null : pkgId));
  };

  const handleRegisterClick = () => {
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      setSelectedPackage(null);
      setExpandedPackage(null);
      setShowServiceModal(true);
    }
  };

  // const handleServiceSelect = () => {
  //   if (!selectedPackage) return;
  //   const servicesForPackage = PACKAGE_MAP[selectedPackage]?.services ?? [];
  //   if (servicesForPackage.length === 0) return;
  //   const servicesParam = servicesForPackage.join(',');
  //   setShowServiceModal(false);
  //   router.push(`/onboarding?services=${servicesParam}`);
  // };

  const handleServiceSelect = () => {
  if (!selectedPackage) return;
  const servicesForPackage = PACKAGE_MAP[selectedPackage]?.services ?? [];
  if (servicesForPackage.length === 0) return;
  const servicesParam = servicesForPackage.join(',');
  router.push(`/onboarding?services=${encodeURIComponent(servicesParam)}&package=${encodeURIComponent(selectedPackage)}`);
  setShowServiceModal(false);
};



  // -------------------- RENDER --------------------
  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-orange-50">
      <Header />

      {/* Hero Section */}
      <div style={{ backgroundImage: 'url("/bg2.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }} className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center mt-10 ">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight ">
            Grow Your Food Business with{' '}
            <span className="text-orange-500 bg-linear-to-r from-orange-500 to-orange-600 bg-clip-text  font-mono ">
              marinate360
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white mb-10 max-w-2xl mx-auto leading-relaxed">
            Reach millions of hungry customers, boost your revenue, and streamline operations with our all-in-one platform.
          </p>

          <button
            onClick={handleRegisterClick}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold mt-10 py-4 px-10 rounded-full text-lg transition duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mb-4"
          >
            Register Your Business
          </button>

          <p className="text-sm text-white/80">Free setup • No hidden fees • 24/7 support</p>
        </div>
      </div>

      {/* Features Grid (unchanged) */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Why Partner with Us?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                <QrCodeIcon />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">QR Code Ordering</h3>
              <p className="text-gray-600 leading-relaxed">
                Enable contactless dining with instant digital menus. Customers scan, browse, and order directly — reducing wait times and boosting satisfaction.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <KotSystemIcon />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">KOT System</h3>
              <p className="text-gray-600 leading-relaxed">
                Replace paper tickets with a real-time Kitchen Display System. Reduce errors, track prep time, and streamline workflow across busy shifts.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                <AnalyticsIcon />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Real-Time Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Powered by your POS data. Gain insights into sales, popular items, and peak hours to make smarter business decisions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                <MultiLocationIcon />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Multi-Location Control</h3>
              <p className="text-gray-600 leading-relaxed">
                Manage all your outlets from one unified dashboard. Customize menus, view performance, and scale effortlessly across locations.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-4">
                <AllInOneIcon />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">All-in-One Platform</h3>
              <p className="text-gray-600 leading-relaxed">
                From dine-in to delivery, takeaway to catering — manage every service seamlessly in a single integrated system.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <GroupOrderingIcon />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Group Ordering</h3>
              <p className="text-gray-600 leading-relaxed">
                Let groups of diners add items to one shared order from their own phones using a simple code. Perfect for parties, families, and corporate gatherings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SERVICE SELECTION MODAL - PACKAGES AS ACCORDION (no service toggles) */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 ">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl hide-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                Choose Your Package
              </h3>
              <button
              aria-label='services'
                onClick={() => setShowServiceModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Pick a package. Click anywhere on a package box to select it. Expand to view details.
            </p>

            <div className="space-y-4 mb-6">
              {Object.entries(PACKAGE_MAP).map(([pkgId, pkg]) => {
                const isSelected = selectedPackage === pkgId;
                const isExpanded = expandedPackage === pkgId;

                return (
                  <div
                    key={pkgId}
                    className={`border rounded-2xl overflow-hidden ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}
                    onClick={() => handlePackageSelect(pkgId)}
                  >
                    <div className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600"><pkg.icon /></span>
                        </div>

                        <div className="text-left">
                          <div className={`font-semibold ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{pkg.label}</div>
                          <div className="text-sm text-gray-500">{pkg.points[0]}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500">{isSelected ? 'Selected' : ''}</div>
                         
                        <button
                          aria-label='expand'
                          onClick={(e) => toggleExpandPackage(pkgId, e)}
                          className="p-2 rounded-md hover:bg-gray-100"
                          aria-expanded={isExpanded}
                        >
                          <svg className={`w-5 h-5 text-blue-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[800px]' : 'max-h-0'}`}>
                      <div className="px-5 py-4 bg-gray-50">
                        <div className="mb-3">
                          <div className="font-medium text-gray-800 mb-2">What&apos;s included</div>
                          <ul className="list-disc pl-5 text-gray-600">
                            {pkg.points.map((p, i) => (
                              <li key={i} className="mb-1">{p}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedPackage ? `Package: ${PACKAGE_MAP[selectedPackage].label}` : 'No package selected'}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedPackage(null); setExpandedPackage(null); }}
                  className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Reset
                </button>

                <button
                  onClick={handleServiceSelect}
                  disabled={!selectedPackage}
                  className={`px-6 py-3 rounded-lg font-semibold ${selectedPackage ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  Continue to Registration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
