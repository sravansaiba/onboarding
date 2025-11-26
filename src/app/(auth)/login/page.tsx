// 'use client';

// import { JSX, useState } from 'react';
// import { useRouter } from 'next/navigation';

// const STRAPI_URL = 'https://onboarding-apis.app.f2c.io';

// interface LoginForm {
//     email: string;
//     password: string;
// }

// interface StrapiAuthResponse {
//     jwt: string;
//     user: {
//         id: number;
//         username: string;
//         email: string;
//     };
// }

// interface StrapiRole {
//     id: number;
//     name: string;
//     description?: string;
//     type?: string;
// }

// interface StrapiUserWithRole {
//     id: number;
//     username: string;
//     email: string;
//     role?: StrapiRole;
// }

// export default function LoginPage(): JSX.Element {
//     const router = useRouter();
//     const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' });
//     const [error, setError] = useState<string>('');
//     const [loading, setLoading] = useState<boolean>(false);
//     const [rememberMe, setRememberMe] = useState<boolean>(false);

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({ ...prev, [name]: value }));
//         setError('');
//     };

//     const handleSubmit = async (): Promise<void> => {
//         setLoading(true);
//         setError('');

//         try {
//             const authRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     identifier: formData.email,
//                     password: formData.password,
//                 }),
//             });

//             const authData: StrapiAuthResponse | { error?: { message?: string } } = await authRes.json();

//             if (!authRes.ok || !('jwt' in authData)) {
//                 const msg = 'error' in authData && authData.error?.message ? authData.error.message : 'Invalid email or password';
//                 throw new Error(msg);
//             }

//             const jwt = authData.jwt;

//             const meRes = await fetch(`${STRAPI_URL}/api/users/me?populate=role`, {
//                 method: 'GET',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: `Bearer ${jwt}`,
//                 },
//             });

//             const meData: StrapiUserWithRole | { error?: { message?: string } } = await meRes.json();

//             if (!meRes.ok || !('id' in meData)) {
//                 const msg = (meData as { error?: { message?: string } }).error?.message ?? 'Failed to fetch user details';
//                 throw new Error(msg);
//             }

//             const user = meData as StrapiUserWithRole;

//             const storage = rememberMe ? localStorage : sessionStorage;
//             storage.setItem('jwt', jwt);
//             storage.setItem('user', JSON.stringify(user));

//             const roleName = user.role?.name?.toLowerCase() ?? '';

//             if (roleName.includes('admin')) {
//                 router.push('/dashboard');
//             } else if (roleName.includes('customer') || roleName.includes('authenticated') || roleName === '') {
//                 router.push('/');
//             } else {
//                 router.push('/');
//             }
//         } catch (err) {
//             const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
//             setError(message);
//             setLoading(false);
//         }
//     };

//     const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
//         if (e.key === 'Enter') handleSubmit();
//            localStorage.setItem('isLoggedIn', 'true');

//     };

//     return (
//         <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
//             <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-xl p-8">
//                 <div>
//                     <div className="mx-auto h-16 w-16 bg-orange-500 rounded-full flex items-center justify-center">
//                         <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                         </svg>
//                     </div>
//                     <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
//                     <p className="mt-2 text-center text-sm text-gray-600">Partner with us and grow your business</p>
//                 </div>

//                 <div className="mt-8 space-y-6">
//                     {error && (
//                         <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
//                             <div className="flex">
//                                 <div className="shrink-0">
//                                     <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
//                                         <path
//                                             fillRule="evenodd"
//                                             d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
//                                             clipRule="evenodd"
//                                         />
//                                     </svg>
//                                 </div>
//                                 <div className="ml-3">
//                                     <p className="text-sm text-red-700">{error}</p>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     <div className="space-y-4">
//                         <div>
//                             <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Email address
//                             </label>
//                             <input
//                                 id="email-address"
//                                 name="email"
//                                 type="email"
//                                 autoComplete="email"
//                                 required
//                                 value={formData.email}
//                                 onChange={handleChange}
//                                 onKeyPress={handleKeyPress}
//                                 className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-150"
//                                 placeholder="Enter your email"
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Password
//                             </label>
//                             <input
//                                 id="password"
//                                 name="password"
//                                 type="password"
//                                 autoComplete="current-password"
//                                 required
//                                 value={formData.password}
//                                 onChange={handleChange}
//                                 onKeyPress={handleKeyPress}
//                                 className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-150"
//                                 placeholder="Enter your password"
//                             />
//                         </div>
//                     </div>

//                     <div className="flex items-center justify-between">
//                         <div className="flex items-center">
//                             <input
//                                 id="remember-me"
//                                 name="remember-me"
//                                 type="checkbox"
//                                 checked={rememberMe}
//                                 onChange={(e) => setRememberMe(e.target.checked)}
//                                 className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
//                             />
//                             <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
//                                 Remember me
//                             </label>
//                         </div>

//                         <div className="text-sm">
//                             <a href="#" className="font-medium text-orange-600 hover:text-orange-500 transition duration-150">
//                                 Forgot password?
//                             </a>
//                         </div>
//                     </div>

//                     <div>
//                         <button
//                             onClick={handleSubmit}
//                             disabled={loading}
//                             className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition duration-150 ${loading
//                                     ? 'bg-orange-400 cursor-not-allowed'
//                                     : 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg transform hover:-translate-y-0.5'
//                                 } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500`}
//                         >
//                             {loading ? (
//                                 <span className="flex items-center">
//                                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
//                                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                         <path
//                                             className="opacity-75"
//                                             fill="currentColor"
//                                             d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
//                                         />
//                                     </svg>
//                                     Signing in...
//                                 </span>
//                             ) : (
//                                 'Sign in'
//                             )}
//                         </button>
//                     </div>
//                 </div>

//                 <div className="text-center mt-6">
//                     <p className="text-sm text-gray-600">
//                         Don&apos;t have an account?{' '}
//                         <a href="/signup" className="font-medium text-orange-600 hover:text-orange-500 transition duration-150">
//                             Register now
//                         </a>
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// }







'use client';

import { JSX, useState } from 'react';
import { useRouter } from 'next/navigation';

const STRAPI_URL = 'https://onboarding-apis.app.f2c.io';

interface LoginForm {
    email: string;
    password: string;
}

interface StrapiAuthResponse {
    jwt: string;
    user: {
        id: number;
        username: string;
        email: string;
    };
}

interface StrapiRole {
    id: number;
    name: string;
    description?: string;
    type?: string;
}

interface StrapiUserWithRole {
    id: number;
    username: string;
    email: string;
    role?: StrapiRole;
}

export default function LoginPage(): JSX.Element {
    const router = useRouter();
    const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false); // 👈 New state

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (): Promise<void> => {
        setLoading(true);
        setError('');

        try {
            const authRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: formData.email,
                    password: formData.password,
                }),
            });

            const authData: StrapiAuthResponse | { error?: { message?: string } } = await authRes.json();

            if (!authRes.ok || !('jwt' in authData)) {
                const msg = 'error' in authData && authData.error?.message ? authData.error.message : 'Invalid email or password';
                throw new Error(msg);
            }

            const jwt = authData.jwt;

            const meRes = await fetch(`${STRAPI_URL}/api/users/me?populate=role`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                },
            });

            const meData: StrapiUserWithRole | { error?: { message?: string } } = await meRes.json();

            if (!meRes.ok || !('id' in meData)) {
                const msg = (meData as { error?: { message?: string } }).error?.message ?? 'Failed to fetch user details';
                throw new Error(msg);
            }

            const user = meData as StrapiUserWithRole;

            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('jwt', jwt);
            storage.setItem('user', JSON.stringify(user));

            const roleName = user.role?.name?.toLowerCase() ?? '';

            if (roleName.includes('admin')) {
                router.push('/dashboard');
            } else if (roleName.includes('customer') || roleName.includes('authenticated') || roleName === '') {
                router.push('/');
            } else {
                router.push('/');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(message);
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            handleSubmit();
            localStorage.setItem('isLoggedIn', 'true'); // ⚠️ Note: might be better inside success block
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-xl p-8">
                <div>
                    <div className="mx-auto h-16 w-16 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">Partner with us and grow your business</p>
                </div>

                <div className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <div className="flex">
                                <div className="shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                onKeyPress={handleKeyPress}
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-150"
                                placeholder="Enter your email"
                            />
                        </div>

                        {/* Password Field with Eye Toggle */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    onKeyPress={handleKeyPress}
                                    className="appearance-none relative block w-full px-4 py-3 pl-4 pr-12 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-150"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        // Eye Slash Icon
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-gray-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                                            />
                                        </svg>
                                    ) : (
                                        // Eye Icon
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-gray-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-orange-600 hover:text-orange-500 transition duration-150">
                                Forgot password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition duration-150 ${loading
                                    ? 'bg-orange-400 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg transform hover:-translate-y-0.5'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500`}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </div>
                </div>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a href="/signup" className="font-medium text-orange-600 hover:text-orange-500 transition duration-150">
                            Register now
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}