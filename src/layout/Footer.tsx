import Image from "next/image";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-gray-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <Link href="/">
                        <Image className="mb-4 bg-white rounded-2xl" src="/logo/marinate2.png" alt="Logo" width={150} height={150} />
                        <p className="text-gray-300 text-sm">
                            Connecting businesses with customers worldwide.
                        </p>
                    </Link>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">For Partners</h3>
                        <ul className="space-y-2 text-gray-300 text-sm">
                            <li><a href="#" className="hover:text-orange-500">Partner with us</a></li>
                            <li><a href="#" className="hover:text-orange-500">Restaurant onboarding</a></li>
                            <li><a href="#" className="hover:text-orange-500">Delivery partners</a></li>
                            <li><a href="#" className="hover:text-orange-500">Business tools</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Support</h3>
                        <ul className="space-y-2 text-gray-300 text-sm">
                            <li><a href="#" className="hover:text-orange-500">Help Center</a></li>
                            <li><a href="#" className="hover:text-orange-500">Contact Us</a></li>
                            <li><a href="#" className="hover:text-orange-500">FAQs</a></li>
                            <li><a href="#" className="hover:text-orange-500">Partner Portal</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Legal</h3>
                        <ul className="space-y-2 text-gray-300 text-sm">
                            <li><a href="#" className="hover:text-orange-500">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-orange-500">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-orange-500">Cookie Policy</a></li>
                            <li><a href="#" className="hover:text-orange-500">Refund Policy</a></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
                    © {new Date().getFullYear()} marinate360. All rights reserved.
                </div>
            </div>
        </footer>
    );
}