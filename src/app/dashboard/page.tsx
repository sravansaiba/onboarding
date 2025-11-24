

'use client'; 

import { useEffect, useState, JSX } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../../components/AdminDashboard'; 
import CustomerDashboard from '../../components/CustomerDashboard'; 


interface User {
    id: number;
    username: string;
    email: string;
    role?: {
        id: number;
        name: string; 
    };
}

const DASHBOARD_URL = 'https://onboarding-apis.app.f2c.io'; 

export default function Dashboard(): JSX.Element {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null); 
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        checkAuthAndRole();
    }, []);

    const checkAuthAndRole = (): void => {
        setLoading(true);
        setError('');

        const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
        const userDataString = localStorage.getItem('user') || sessionStorage.getItem('user');

        if (!jwt || !userDataString) {
            console.error('Auth token or user data missing.');
            router.push('/login'); 
            setLoading(false);
            return;
        }

        try {
            const parsedUser: User = JSON.parse(userDataString);
            setUser(parsedUser);

            const roleName = parsedUser.role?.name?.toLowerCase() || 'unknown';
            setRole(roleName);

            console.log('User Role Identified:', roleName);

        } catch (e) {
            console.error('Failed to parse user data:', e);
            setError('Failed to parse user information.');
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = (): void => {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('user');
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-500">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // const AdminComp: any = AdminDashboard;
    // const CustomerComp: any = CustomerDashboard;
    const AdminComp: React.ComponentType<{ onLogout: () => void }> = AdminDashboard;
    const CustomerComp: React.ComponentType<{ onLogout: () => void }> = CustomerDashboard;

    if (role === 'admin') { 
        return <AdminComp onLogout={handleLogout} />;
    } else if (role === 'customer') { 
        return <CustomerComp onLogout={handleLogout} />;
    } else {
        
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-500">Access Denied: Unknown or unauthorized role.</p>
                    <button
                        onClick={handleLogout}
                        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }
}