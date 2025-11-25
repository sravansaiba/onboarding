/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import Image from 'next/image';
import { JSX,useCallback, useEffect, useState } from 'react';
const STRAPI_URL = 'https://onboarding-apis.app.f2c.io';

interface MediaFile {
    id: number;
    documentId: string;
    url: string;
    name: string;
    ext: string;
    mime: string;
    size: number;
}

interface TimeSlot {
    open_time: string;
    close_time: string;
}

interface Timings {
    hours: { [key: string]: TimeSlot[] };
}

interface OnboardingRecord {
    id: number;
    documentId: string;
    restaurant_name: string;
    fullname: string;
    email: string;
    phone: string;
    restaurant_primary_contact: string;
    buildingno: string;
    floor: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
    address: string;
    pan_number: string;
    fullnameaspan: string;
    gst: boolean;
    gst_number: string | null;
    fssai_number: string;
    fssai_expiry: string;
    bank_accno: string;
    ifsc_code: string;
    account_type: string;
    application_status: boolean;
    timings: Timings;
    delivery_timings: Timings;
    takeaway_timings: Timings;
    cuisines: string;
    services: string;
    package: string;
    pan_card: MediaFile | null;
    fssai_license: MediaFile | null;
    gst_certificate: MediaFile | null;
    logo_url: MediaFile | null;
    background_image_url: MediaFile | null;
    createdAt: string;
    updatedAt: string;
}

interface EditFormData {
    restaurant_name: string;
    fullname: string;
    email: string;
    phone: string;
    restaurant_primary_contact: string;
    buildingno: string;
    floor: string;
    area: string;
    city: string;
    pincode: string;
    landmark: string;
    address: string;
    pan_number: string;
    fullnameaspan: string;
    gst: boolean;
    gst_number: string;
    fssai_number: string;
    fssai_expiry: string;
    bank_accno: string;
    ifsc_code: string;
    account_type: string;
    timings: Timings;
    delivery_timings: Timings;
    takeaway_timings: Timings;
    cuisines: string[];
    services: string[];
    logo_url: MediaFile | null;
    background_image_url: MediaFile | null;
    pan_card: MediaFile | null;
    fssai_license: MediaFile | null;
    gst_certificate: MediaFile | null;
}

type FileUploadField = "logo_url" | "background_image_url" | "pan_card" | "fssai_license" | "gst_certificate";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CUISINES = ["North Indian", "South Indian", "Chinese", "Italian", "Mexican", "Thai", "Continental", "Fast Food", "Biryani", "Pizza", "Desserts", "Cafe", "Street Food", "Seafood", "BBQ"];

export default function CustomerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [record, setRecord] = useState<OnboardingRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<EditFormData>({} as EditFormData);
    const [fileUploads, setFileUploads] = useState<Record<string, File | null>>({});
    const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set());
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);


        const fetchRecord =useCallback( async () => {
        setLoading(true);
        setError('');
        try {
            const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
            if (!jwt) throw new Error('Authentication token missing.');
            const userEmail = user?.email;
            if (!userEmail) throw new Error('User email not found.');
            const query = `${STRAPI_URL}/api/onboardapis?filters[email][$eq]=${encodeURIComponent(userEmail)}&populate=*`;
            const response = await fetch(query, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to fetch your application record.');
            }
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                setRecord(data.data[0]);
            } else {
                setRecord(null);
            }
        } catch (err) {
            console.error('Error fetching record:', err);
            setError(err instanceof Error ? err.message : 'Failed to load your application details.');
        } finally {
            setLoading(false);
        }
    },[user]);


    useEffect(() => {
        if (user) {
            fetchRecord();
        }
    }, [user,fetchRecord]);


    const initializeEditForm =useCallback( () => {
        if (!record) return;
        setEditFormData({
            restaurant_name: record.restaurant_name,
            fullname: record.fullname,
            email: record.email,
            phone: record.phone,
            restaurant_primary_contact: record.restaurant_primary_contact,
            buildingno: record.buildingno,
            floor: record.floor,
            area: record.area,
            city: record.city,
            pincode: record.pincode,
            landmark: record.landmark,
            pan_number: record.pan_number,
            fullnameaspan: record.fullnameaspan,
            address: record.address,
            gst: record.gst,
            gst_number: record.gst_number || '',
            fssai_number: record.fssai_number,
            fssai_expiry: record.fssai_expiry,
            bank_accno: record.bank_accno,
            ifsc_code: record.ifsc_code,
            account_type: record.account_type,
            timings: record.timings || { hours: {} },
            delivery_timings: record.delivery_timings || { hours: {} },
            takeaway_timings: record.takeaway_timings || { hours: {} },
            cuisines: record.cuisines ? JSON.parse(record.cuisines) : [],
            services: record.services ? JSON.parse(record.services) : [],
            logo_url: record.logo_url,
            background_image_url: record.background_image_url,
            pan_card: record.pan_card,
            fssai_license: record.fssai_license,
            gst_certificate: record.gst_certificate,
        });
        setFileUploads({});
        setFilesToDelete(new Set());
    },[record]);

    useEffect(() => {
        if (record) {
            initializeEditForm();
        }
    }, [record,initializeEditForm]);

    const checkAuth = () => {
        const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
        const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!jwt || !userData) {
            window.location.href = '/login';
            return;
        }
        try {
            setUser(JSON.parse(userData));
        } catch (e) {
            console.error('Failed to parse user data:', e);
            window.location.href = '/login';
        }
    };



    const uploadFileAndGetId = async (file: File, jwt: string): Promise<number> => {
        const formData = new FormData();
        formData.append('files', file);
        const response = await fetch(`${STRAPI_URL}/api/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${jwt}` },
            body: formData,
        });
        if (!response.ok) throw new Error(`Failed to upload file: ${response.statusText}`);
        const uploadedFiles = await response.json();
        if (uploadedFiles && uploadedFiles[0] && uploadedFiles[0].id) {
            return uploadedFiles[0].id;
        }
        throw new Error('Upload response did not contain file ID.');
    };

    const handleSave = async () => {
        if (!record) return;
        try {
            const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
            if (!jwt) throw new Error('Authentication token missing.');
            const payload: any = {
                data: {
                    restaurant_name: editFormData.restaurant_name,
                    fullname: editFormData.fullname,
                    phone: editFormData.phone,
                    restaurant_primary_contact: editFormData.restaurant_primary_contact,
                    buildingno: editFormData.buildingno,
                    floor: editFormData.floor,
                    area: editFormData.area,
                    city: editFormData.city,
                    pincode: editFormData.pincode,
                    landmark: editFormData.landmark,
                    pan_number: editFormData.pan_number,
                    fullnameaspan: editFormData.fullnameaspan,
                    address: editFormData.address,
                    gst: editFormData.gst,
                    gst_number: editFormData.gst_number || null,
                    fssai_number: editFormData.fssai_number,
                    fssai_expiry: editFormData.fssai_expiry,
                    bank_accno: editFormData.bank_accno,
                    ifsc_code: editFormData.ifsc_code,
                    account_type: editFormData.account_type,
                    timings: editFormData.timings,
                    delivery_timings: editFormData.delivery_timings,
                    takeaway_timings: editFormData.takeaway_timings,
                    cuisines: JSON.stringify(editFormData.cuisines),
                    services: JSON.stringify(editFormData.services),
                }
            };

            const fileUploadPromises = Object.entries(fileUploads)
                .filter(([_, file]) => file !== null)
                .map(async ([fieldName, file]) => {
                    if (file) {
                        const fileId = await uploadFileAndGetId(file, jwt);
                        payload.data[fieldName] = fileId;
                    }
                });

            await Promise.all(fileUploadPromises);

            filesToDelete.forEach((fieldName) => {
                payload.data[fieldName] = null;
            });

            const response = await fetch(`${STRAPI_URL}/api/onboardapis/${record.documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`Failed to update record: ${response.statusText}`);

            const fileDeletionPromises = Array.from(filesToDelete).map(async (fieldName) => {
                const fileToDelete = record[fieldName as keyof OnboardingRecord] as MediaFile | null;
                if (fileToDelete && fileToDelete.id) {
                    try {
                        await fetch(`${STRAPI_URL}/api/upload/files/${fileToDelete.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${jwt}` },
                        });
                    } catch (err) {
                        console.error(`Failed to delete file ${fieldName}:`, err);
                    }
                }
            });

            await Promise.all(fileDeletionPromises);

            showToast('Changes saved successfully!', 'success');
            setIsEditing(false);
            fetchRecord();
        } catch (err) {
            console.error('Error saving record:', err);
            showToast('Failed to save changes', 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const getFileUrl = (file: MediaFile | null): string => {
        if (!file || !file.url) return '';
        return `${STRAPI_URL}${file.url}`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-50 to-red-50 px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading your application...</p>
                </div>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-50 px-4">
                <div className="bg-orange-50 py-4">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Application</h1>
                        <button onClick={handleLogout} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white text-sm sm:text-base rounded-lg hover:bg-red-600 transition">
                            Logout
                        </button>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto py-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-12 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">No Application Found</h3>
                        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">You haven&apos;t submitted an onboarding application yet. Start your journey with us today!</p>
                        <button
                            onClick={() => window.location.href = '/onboarding'}
                            className="px-6 py-2.5 sm:px-8 sm:py-3 bg-linear-to-r from-orange-500 to-red-500 text-white text-sm sm:text-base rounded-lg hover:from-orange-600 hover:to-red-600 transition font-semibold shadow-lg"
                        >
                            Start Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-300 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Application</h1>
                            <p className="text-xs sm:text-sm text-gray-600">Manage your restaurant onboarding</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {error && (
                    <div className="mb-4 sm:mb-6 bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded-lg shadow-sm">
                        <p className="text-xs sm:text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Application Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Status Banner */}
                    <div className={`px-4 sm:px-6 py-3 sm:py-4 ${record.application_status ? 'bg-green-100' : 'bg-blue-100'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    {record.application_status ? (
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className=" font-bold text-base sm:text-lg">
                                        {record.application_status ? 'Application Accepted' : 'Application Under Review'}
                                    </p>
                                    <p className=" text-xs sm:text-sm">
                                        {record.application_status ? 'Your restaurant is now active!' : 'We\'ll notify you once reviewed'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className=" text-xs font-medium">Submitted on</p>
                                <p className=" font-bold text-sm">{formatDate(record.createdAt)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Restaurant Overview */}
                    <div className="p-4 sm:p-6 border-b bg-linear-to-br from-gray-50 to-white">
                        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                            <div className="shrink-0">
                                {record.logo_url ? (
                                    <Image
                                        width={96} height={96}
                                        src={getFileUrl(record.logo_url)}
                                        alt={record.restaurant_name}
                                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                                    />
                                ) : (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-linear-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg ring-4 ring-white">
                                        <span className="text-white font-bold text-2xl sm:text-3xl">{record.restaurant_name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 w-full">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 truncate">{record.restaurant_name}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="font-medium">{record.fullname}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span>{record.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>{record.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{record.city}, {record.pincode}</span>
                                    </div>
                                </div>
                                <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2">
                                    <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        {record.package} Plan
                                    </span>
                                    {JSON.parse(record.cuisines || '[]').slice(0, 2).map((cuisine: string, idx: number) => (
                                        <span key={idx} className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm font-medium capitalize">
                                            {cuisine}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 sm:p-6 bg-white flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => setShowDetailModal(true)}
                            className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-100 text-sm sm:text-base rounded-xl hover:cursor-pointer hover:border-2 border-blue-400 transition font-medium  flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Full Details
                        </button>
                        {!record.application_status && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-orange-100  text-sm sm:text-base rounded-xl hover:cursor-pointer hover:border-2 border-orange-400 transition font-medium shadow-lg flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Application
                            </button>
                        )}
                    </div>
                </div>

                {!record.application_status && (
                    <div className="mt-4 sm:mt-6 bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg shadow-sm">
                        <div className="flex items-start gap-2 sm:gap-3">
                            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">Application Under Review</p>
                                <p className="text-xs sm:text-sm text-blue-800">You can edit your application details until it is accepted. Once accepted, no changes can be made.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showDetailModal && record && (
                <DetailModal record={record} onClose={() => setShowDetailModal(false)} getFileUrl={getFileUrl} />
            )}
            {isEditing && record && (
                <EditModal
                    formData={editFormData}
                    fileUploads={fileUploads}
                    onInputChange={(field, value) => setEditFormData(prev => ({ ...prev, [field]: value }))}
                    onFileChange={(field, file) => setFileUploads(prev => ({ ...prev, [field]: file }))}
                    onClose={() => setIsEditing(false)}
                    onSave={handleSave}
                    onCancel={() => {
                        initializeEditForm();
                        setIsEditing(false);
                    }}
                    getFileUrl={getFileUrl}
                    onDeleteFile={(field) => {
                        setFilesToDelete(prev => new Set(prev).add(field));
                        setEditFormData(prev => ({ ...prev, [field]: null }));
                        setFileUploads(prev => ({ ...prev, [field]: null }));
                        showToast('File marked for deletion', 'success');
                    }}
                />
            )}

            {/* Toast */}
            {toast?.show && (
                <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
                    <div className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white text-sm sm:text-base`}>
                        {toast.type === 'success' ? (
                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Detail Modal Component
function DetailModal({ record, onClose, getFileUrl }: { record: OnboardingRecord; onClose: () => void; getFileUrl: (file: MediaFile | null) => string }) {
    const parseCuisines = (): string[] => {
        try {
            return JSON.parse(record.cuisines || '[]');
        } catch {
            return [];
        }
    };

    const parseServices = (): string[] => {
        try {
            return JSON.parse(record.services || '[]');
        } catch {
            return [];
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 overflow-y-auto h-full w-full z-50">
            <div className="relative top-6 sm:top-10 mx-auto p-4 sm:p-6 w-full max-w-4xl sm:max-w-5xl shadow-2xl rounded-2xl bg-white mb-6 sm:mb-10">
                <div className="flex justify-between items-start sm:items-center border-b pb-3 sm:pb-4 mb-4 sm:mb-6">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{record.restaurant_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">Complete Application Details</p>
                    </div>
                    <button
                    aria-label='close'
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-1 sm:px-2 space-y-4 sm:space-y-6">
                    {/* Basic Info */}
                    <div className="bg-linear-to-br from-orange-50 to-red-50 rounded-xl p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Basic Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InfoItem label="Owner Name" value={record.fullname} />
                            <InfoItem label="Email" value={record.email} />
                            <InfoItem label="Phone" value={record.phone} />
                            <InfoItem label="Restaurant Contact" value={record.restaurant_primary_contact} />
                            <InfoItem label="Package" value={record.package} badge />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            Address Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InfoItem label="Building No" value={record.buildingno} />
                            <InfoItem label="Floor" value={record.floor || 'N/A'} />
                            <InfoItem label="Area" value={record.area} />
                            <InfoItem label="City" value={record.city} />
                            <InfoItem label="Pincode" value={record.pincode} />
                            <InfoItem label="Landmark" value={record.landmark || 'N/A'} />
                            <div className="sm:col-span-2">
                                <InfoItem label="Full Address" value={record.address} />
                            </div>
                        </div>
                    </div>

                    {/* Business Details */}
                    <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Business Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InfoItem label="PAN Number" value={record.pan_number} />
                            <InfoItem label="PAN Name" value={record.fullnameaspan} />
                            <InfoItem label="GST Registered" value={record.gst ? 'Yes' : 'No'} />
                            {record.gst_number && <InfoItem label="GST Number" value={record.gst_number} />}
                            <InfoItem label="FSSAI Number" value={record.fssai_number} />
                            <InfoItem label="FSSAI Expiry" value={record.fssai_expiry} />
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-xl p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Bank Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <InfoItem label="Account Number" value={record.bank_accno} />
                            <InfoItem label="IFSC Code" value={record.ifsc_code} />
                            <InfoItem label="Account Type" value={record.account_type} capitalize />
                        </div>
                    </div>

                    {/* Cuisines & Services */}
                    <div className="bg-linear-to-br from-yellow-50 to-orange-50 rounded-xl p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Cuisines & Services
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Cuisines</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {parseCuisines().map((cuisine, idx) => (
                                        <span key={idx} className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-orange-100 text-orange-800 text-xs sm:text-sm rounded-lg font-medium capitalize">
                                            {cuisine}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Services</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {parseServices().map((service, idx) => (
                                        <span key={idx} className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-blue-100 text-blue-800 text-xs sm:text-sm rounded-lg font-medium capitalize">
                                            {service.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operating Hours */}
                    <div className="bg-linear-to-br from-gray-50 to-slate-50 rounded-xl p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Operating Hours
                        </h4>
                        <div className="space-y-2 sm:space-y-3">
                            {Object.entries(record.timings.hours).map(([day, slots]) => (
                                <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 bg-white rounded-lg border border-gray-200 gap-2">
                                    <span className="font-semibold text-gray-800 text-sm sm:text-base">{day}</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {slots.map((slot: TimeSlot, idx: number) => (
                                            <span key={idx} className="text-gray-600 text-xs sm:text-sm bg-gray-100 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full">
                                                {slot.open_time} - {slot.close_time}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(record.delivery_timings?.hours || record.takeaway_timings?.hours) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                                {record.delivery_timings?.hours && (
                                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-1.5 sm:mb-2">Delivery Hours</p>
                                        {Object.entries(record.delivery_timings.hours).map(([day, slots]) => (
                                            <div key={day} className="flex justify-between text-xs sm:text-sm mb-0.5">
                                                <span className="text-blue-700">{day}</span>
                                                <span className="text-blue-600">{slots[0]?.open_time} - {slots[0]?.close_time}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {record.takeaway_timings?.hours && (
                                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm font-semibold text-green-900 mb-1.5 sm:mb-2">Takeaway Hours</p>
                                        {Object.entries(record.takeaway_timings.hours).map(([day, slots]) => (
                                            <div key={day} className="flex justify-between text-xs sm:text-sm mb-0.5">
                                                <span className="text-green-700">{day}</span>
                                                <span className="text-green-600">{slots[0]?.open_time} - {slots[0]?.close_time}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Documents */}
                    <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Documents
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {record.pan_card && <DocumentCard label="PAN Card" file={record.pan_card} getFileUrl={getFileUrl} />}
                            {record.fssai_license && <DocumentCard label="FSSAI License" file={record.fssai_license} getFileUrl={getFileUrl} />}
                            {record.gst_certificate && <DocumentCard label="GST Certificate" file={record.gst_certificate} getFileUrl={getFileUrl} />}
                        </div>
                    </div>

                    {/* Images */}
                    {(record.logo_url || record.background_image_url) && (
                        <div className="bg-linear-to-br from-rose-50 to-pink-50 rounded-xl p-4 sm:p-6">
                            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Restaurant Images
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                {record.logo_url && (
                                    <div>
                                        <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Logo</p>
                                        <Image 
                                            width={20} height={20}
                                            src={getFileUrl(record.logo_url)}
                                            alt="Restaurant Logo"
                                            className="w-full  object-cover rounded-xl shadow-lg"
                                        />
                                    </div>
                                )}
                                {record.background_image_url && (
                                    <div>
                                        <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Background Image</p>
                                        <Image width={96} height={96}
                                            src={getFileUrl(record.background_image_url)}
                                            alt="Background"
                                            className="w-full h-32 sm:h-48 object-cover rounded-xl shadow-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end border-t pt-3 sm:pt-4 mt-4 sm:mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-linear-to-r from-gray-600 to-gray-700 text-white text-xs sm:text-sm rounded-lg hover:from-gray-700 hover:to-gray-800 transition font-medium shadow-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value, badge, capitalize }: { label: string; value: string; badge?: boolean; capitalize?: boolean }) {
    return (
        <div>
            <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">{label}</p>
            {badge ? (
                <span className="inline-block px-2.5 py-1 sm:px-3 sm:py-1 bg-orange-100 text-orange-700 rounded-full text-xs sm:text-sm font-semibold uppercase">
                    {value}
                </span>
            ) : (
                <p className={`text-sm sm:text-base text-gray-900 font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</p>
            )}
        </div>
    );
}

function DocumentCard({ label, file, getFileUrl }: { label: string; file: MediaFile; getFileUrl: (file: MediaFile | null) => string }) {
    const isPDF = file.mime === 'application/pdf';
    return (
        <div className="border-2 border-gray-200 rounded-xl p-3 sm:p-4 hover:border-indigo-300 transition bg-white">
            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">{label}</p>
            {isPDF ? (
                <a
                    href={getFileUrl(file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 sm:gap-3 text-indigo-600 hover:text-indigo-700 bg-indigo-50 p-2.5 sm:p-3 rounded-lg transition"
                >
                    <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                        <p className="font-medium text-xs sm:text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">Click to view</p>
                    </div>
                </a>
            ) : (
                <Image
                    width={96} height={96}
                    src={getFileUrl(file)}
                    alt={label}
                    className="w-full h-28 sm:h-32 object-cover rounded-lg shadow-md"
                />
            )}
        </div>
    );
}

function EditModal({
    formData,
    fileUploads,
    onInputChange,
    onFileChange,
    onClose,
    onSave,
    onCancel,
    getFileUrl,
    onDeleteFile,
}: {
    formData: EditFormData;
    fileUploads: Record<string, File | null>;
    onInputChange: (field: keyof EditFormData, value: any) => void;
    onFileChange: (field: FileUploadField, file: File | null) => void;
    onClose: () => void;
    onSave: () => void;
    onCancel: () => void;
    getFileUrl: (file: MediaFile | null) => string;
    onDeleteFile: (field: string) => void;
}) {
    const renderFileInput = (label: string, field: FileUploadField, currentFile: MediaFile | null, acceptTypes: string) => {
        const selectedFile = fileUploads[field];
        const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : (currentFile ? getFileUrl(currentFile) : '');
        const hasFile = selectedFile || currentFile;
        return (
            <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{label}</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <input
                        aria-label={label}
                        type="file"
                        accept={acceptTypes}
                        onChange={(e) => onFileChange(field, e.target.files?.[0] || null)}
                        className="w-full sm:flex-1 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                    {hasFile && (
                        <button
                            type="button"
                            onClick={() => onDeleteFile(field)}
                            className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition font-medium"
                        >
                            Remove
                        </button>
                    )}
                </div>
                {previewUrl && (
                    <div className="mt-2.5">
                        {previewUrl.includes('.pdf') ? (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                View PDF
                            </a>
                        ) : (
                            <Image
                                width={96} height={96}
                                src={previewUrl}
                                alt={`${label} Preview`}
                                className="h-24 sm:h-32 w-full object-contain border-2 border-gray-200 rounded-lg"
                            />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 overflow-y-auto h-full w-full z-50">
            <div className="relative top-6 sm:top-10 mx-auto p-4 sm:p-6 w-full max-w-4xl sm:max-w-5xl shadow-2xl rounded-2xl bg-white mb-6 sm:mb-10">
                <div className="flex justify-between items-start sm:items-center border-b pb-3 sm:pb-4 mb-4 sm:mb-6">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Application</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">Update your restaurant information</p>
                    </div>
                    <button
                        aria-label='close'
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-1 sm:px-2 space-y-4 sm:space-y-6">
                    {/* Basic Info */}
                    <Section title="Basic Information" icon="info">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InputField
                                label="Restaurant Name *"
                                value={formData.restaurant_name}
                                onChange={(e) => onInputChange('restaurant_name', e.target.value)}
                                placeholder="Enter restaurant name"
                            />
                            <InputField
                                label="Owner Name *"
                                value={formData.fullname}
                                onChange={(e) => onInputChange('fullname', e.target.value)}
                                placeholder="Owner's full name"
                            />
                            <InputField
                                label="Email *"
                                type="email"
                                value={formData.email}
                                onChange={(e) => onInputChange('email', e.target.value)}
                                placeholder="your@email.com"
                                disabled
                            />
                            <InputField
                                label="Phone *"
                                value={formData.phone}
                                onChange={(e) => onInputChange('phone', e.target.value)}
                                placeholder="+91 XXXXX XXXXX"
                            />
                            <InputField
                                label="Restaurant Contact *"
                                value={formData.restaurant_primary_contact}
                                onChange={(e) => onInputChange('restaurant_primary_contact', e.target.value)}
                                placeholder="Restaurant phone"
                                className="sm:col-span-2"
                            />
                        </div>
                    </Section>

                    {/* Address */}
                    <Section title="Address Information" icon="location">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InputField label="Building No *" value={formData.buildingno} onChange={(e) => onInputChange('buildingno', e.target.value)} />
                            <InputField label="Floor" value={formData.floor} onChange={(e) => onInputChange('floor', e.target.value)} />
                            <InputField label="Area *" value={formData.area} onChange={(e) => onInputChange('area', e.target.value)} />
                            <InputField label="City *" value={formData.city} onChange={(e) => onInputChange('city', e.target.value)} />
                            <InputField label="Pincode *" value={formData.pincode} onChange={(e) => onInputChange('pincode', e.target.value)} maxLength={6} />
                            <div className="sm:col-span-2">
                                <InputField label="Landmark" value={formData.landmark} onChange={(e) => onInputChange('landmark', e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                                <InputField label="Complete Address *" value={formData.address} onChange={(e) => onInputChange('address', e.target.value)} />
                            </div>
                        </div>
                    </Section>

                    {/* Business Info */}
                    <Section title="Business Information" icon="document">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InputField
                                label="PAN Number *"
                                value={formData.pan_number}
                                onChange={(e) => onInputChange('pan_number', e.target.value.toUpperCase())}
                                maxLength={10}
                            />
                            <InputField
                                label="Name as per PAN *"
                                value={formData.fullnameaspan}
                                onChange={(e) => onInputChange('fullnameaspan', e.target.value)}
                            />
                            <InputField
                                label="FSSAI Number *"
                                value={formData.fssai_number}
                                onChange={(e) => onInputChange('fssai_number', e.target.value)}
                            />
                            <InputField
                                label="FSSAI Expiry *"
                                type="date"
                                value={formData.fssai_expiry}
                                onChange={(e) => onInputChange('fssai_expiry', e.target.value)}
                            />
                            <div className="sm:col-span-2">
                                <label className="flex items-center cursor-pointer bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg border-2 border-gray-200 hover:border-orange-300 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.gst}
                                        onChange={(e) => onInputChange('gst', e.target.checked)}
                                        className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <span className="ml-2.5 sm:ml-3 text-xs sm:text-sm font-semibold text-gray-700">GST Registered</span>
                                </label>
                            </div>
                            {formData.gst && (
                                <div className="sm:col-span-2">
                                    <InputField
                                        label="GST Number"
                                        value={formData.gst_number}
                                        onChange={(e) => onInputChange('gst_number', e.target.value.toUpperCase())}
                                        maxLength={15}
                                    />
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Bank Details */}
                    <Section title="Bank Details" icon="card">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <InputField label="Account Number *" value={formData.bank_accno} onChange={(e) => onInputChange('bank_accno', e.target.value)} />
                            <InputField label="IFSC Code *" value={formData.ifsc_code} onChange={(e) => onInputChange('ifsc_code', e.target.value.toUpperCase())} maxLength={11} />
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Account Type *</label>
                                <select
                                     aria-label="account"
                                    value={formData.account_type}
                                    onChange={(e) => onInputChange('account_type', e.target.value)}
                                    className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                >
                                    <option value="savings">Savings</option>
                                    <option value="current">Current</option>
                                </select>
                            </div>
                        </div>
                    </Section>

                    {/* Cuisines */}
                    <Section title="Cuisines" icon="food">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                            {CUISINES.map((cuisine) => (
                                <label key={cuisine} className="flex items-center cursor-pointer bg-gray-50 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-lg border border-gray-200 hover:border-orange-300 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.cuisines.includes(cuisine.toLowerCase())}
                                        onChange={() => {
                                            const cuisineLower = cuisine.toLowerCase();
                                            if (formData.cuisines.includes(cuisineLower)) {
                                                onInputChange('cuisines', formData.cuisines.filter(c => c !== cuisineLower));
                                            } else {
                                                if (formData.cuisines.length < 3) {
                                                    onInputChange('cuisines', [...formData.cuisines, cuisineLower]);
                                                }
                                            }
                                        }}
                                        className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <span className="ml-2 sm:ml-2.5 text-xs sm:text-sm font-medium text-gray-700">{cuisine}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2">Selected: {formData.cuisines.length}/3 (Maximum 3 cuisines)</p>
                    </Section>

                    {/* Operating Hours */}
                    <Section title="Restaurant Operating Hours" icon="clock">
                        <div className="space-y-2.5 sm:space-y-3">
                            {DAYS.map((day) => {
                                const daySlots = formData.timings.hours[day] || [];
                                return (
                                    <div key={day} className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 sm:mb-3 gap-2">
                                            <h5 className="font-semibold text-gray-900 text-sm sm:text-base">{day}</h5>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSlots = [...daySlots, { open_time: '9:00', close_time: '23:00' }];
                                                    onInputChange('timings', {
                                                        ...formData.timings,
                                                        hours: { ...formData.timings.hours, [day]: newSlots }
                                                    });
                                                }}
                                                className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-medium"
                                            >
                                                + Add Slot
                                            </button>
                                        </div>
                                        {daySlots.map((slot: TimeSlot, idx: number) => (
                                            <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                                                <input
                                                    aria-label='time'
                                                    type="time"
                                                    value={slot.open_time}
                                                    onChange={(e) => {
                                                        const newSlots = [...daySlots];
                                                        newSlots[idx] = { ...newSlots[idx], open_time: e.target.value };
                                                        onInputChange('timings', {
                                                            ...formData.timings,
                                                            hours: { ...formData.timings.hours, [day]: newSlots }
                                                        });
                                                    }}
                                                    className="w-full sm:flex-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border-2 border-gray-300 rounded-lg"
                                                />
                                                <span className="text-gray-500 text-xs sm:text-sm">to</span>
                                                <input
                                                    aria-label='time'
                                                    type="time"
                                                    value={slot.close_time}
                                                    onChange={(e) => {
                                                        const newSlots = [...daySlots];
                                                        newSlots[idx] = { ...newSlots[idx], close_time: e.target.value };
                                                        onInputChange('timings', {
                                                            ...formData.timings,
                                                            hours: { ...formData.timings.hours, [day]: newSlots }
                                                        });
                                                    }}
                                                    className="w-full sm:flex-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border-2 border-gray-300 rounded-lg"
                                                />
                                                {daySlots.length > 1 && (
                                                    <button
                                                        aria-label='button'
                                                        type="button"
                                                        onClick={() => {
                                                            const newSlots = daySlots.filter((_: any, i: number) => i !== idx);
                                                            onInputChange('timings', {
                                                                ...formData.timings,
                                                                hours: { ...formData.timings.hours, [day]: newSlots }
                                                            });
                                                        }}
                                                        className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Delivery & Takeaway Timings */}
                    <Section title="Delivery & Takeaway Hours" icon="delivery">
                        <div className="grid grid-cols-1 gap-4 sm:gap-6">
                            {formData.delivery_timings?.hours && (
                                <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border-2 border-blue-200">
                                    <h5 className="font-semibold text-blue-900 mb-2.5 sm:mb-3 text-sm sm:text-lg">Delivery Timings</h5>
                                    {DAYS.map((day) => {
                                        const daySlots = formData.delivery_timings?.hours?.[day] || [];
                                        if (daySlots.length === 0) return null;
                                        return (
                                            <div key={day} className="mb-2.5 sm:mb-3">
                                                <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1">{day}</p>
                                                {daySlots.map((slot: TimeSlot, idx: number) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 mb-1.5">
                                                        <input
                                                        aria-label="input"
                                                            type="time"
                                                            value={slot.open_time}
                                                            onChange={(e) => {
                                                                const newSlots = [...daySlots];
                                                                newSlots[idx] = { ...newSlots[idx], open_time: e.target.value };
                                                                onInputChange('delivery_timings', {
                                                                    ...formData.delivery_timings,
                                                                    hours: { ...formData.delivery_timings.hours, [day]: newSlots }
                                                                });
                                                            }}
                                                            className="w-full sm:flex-1 px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs sm:text-sm border border-blue-300 rounded-lg bg-white"
                                                        />
                                                        <span className="text-blue-600 text-xs sm:text-sm">to</span>
                                                        <input
                                                         aria-label='time'
                                                            type="time"
                                                            value={slot.close_time}
                                                            onChange={(e) => {
                                                                const newSlots = [...daySlots];
                                                                newSlots[idx] = { ...newSlots[idx], close_time: e.target.value };
                                                                onInputChange('delivery_timings', {
                                                                    ...formData.delivery_timings,
                                                                    hours: { ...formData.delivery_timings.hours, [day]: newSlots }
                                                                });
                                                            }}
                                                            className="w-full sm:flex-1 px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs sm:text-sm border border-blue-300 rounded-lg bg-white"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {formData.takeaway_timings?.hours && (
                                <div className="bg-green-50 p-4 sm:p-5 rounded-xl border-2 border-green-200">
                                    <h5 className="font-semibold text-green-900 mb-2.5 sm:mb-3 text-sm sm:text-lg">Takeaway Timings</h5>
                                    {DAYS.map((day) => {
                                        const daySlots = formData.takeaway_timings?.hours?.[day] || [];
                                        if (daySlots.length === 0) return null;
                                        return (
                                            <div key={day} className="mb-2.5 sm:mb-3">
                                                <p className="text-xs sm:text-sm font-medium text-green-700 mb-1">{day}</p>
                                                {daySlots.map((slot: TimeSlot, idx: number) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 mb-1.5">
                                                        <input
                                                            aria-label="input"
                                                            type="time"
                                                            value={slot.open_time}
                                                            onChange={(e) => {
                                                                const newSlots = [...daySlots];
                                                                newSlots[idx] = { ...newSlots[idx], open_time: e.target.value };
                                                                onInputChange('takeaway_timings', {
                                                                    ...formData.takeaway_timings,
                                                                    hours: { ...formData.takeaway_timings.hours, [day]: newSlots }
                                                                });
                                                            }}
                                                            className="w-full sm:flex-1 px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs sm:text-sm border border-green-300 rounded-lg bg-white"
                                                        />
                                                        <span className="text-green-600 text-xs sm:text-sm">to</span>
                                                        <input
                                                          aria-label='time'
                                                            type="time"
                                                            value={slot.close_time}
                                                            onChange={(e) => {
                                                                const newSlots = [...daySlots];
                                                                newSlots[idx] = { ...newSlots[idx], close_time: e.target.value };
                                                                onInputChange('takeaway_timings', {
                                                                    ...formData.takeaway_timings,
                                                                    hours: { ...formData.takeaway_timings.hours, [day]: newSlots }
                                                                });
                                                            }}
                                                            className="w-full sm:flex-1 px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs sm:text-sm border border-green-300 rounded-lg bg-white"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {(!formData.delivery_timings?.hours && !formData.takeaway_timings?.hours) && (
                            <p className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">No delivery or takeaway timings configured</p>
                        )}
                    </Section>

                    {/* Documents & Images */}
                    <Section title="Documents & Images" icon="upload">
                        <div className="grid grid-cols-1 gap-4 sm:gap-5">
                            {renderFileInput("Restaurant Logo", "logo_url", formData.logo_url, "image/*")}
                            {renderFileInput("Background Image", "background_image_url", formData.background_image_url, "image/*")}
                            {renderFileInput("PAN Card", "pan_card", formData.pan_card, ".pdf,image/*")}
                            {renderFileInput("FSSAI License", "fssai_license", formData.fssai_license, ".pdf,image/*")}
                            {renderFileInput("GST Certificate", "gst_certificate", formData.gst_certificate, ".pdf,image/*")}
                        </div>
                    </Section>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-3 sm:pt-5 mt-4 sm:mt-6">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 sm:px-6 sm:py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 text-xs sm:text-sm hover:bg-gray-50 transition font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-linear-to-r from-orange-500 to-red-500 text-white text-xs sm:text-sm rounded-lg hover:from-orange-600 hover:to-red-600 transition font-medium shadow-lg"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    const icons: Record<string, JSX.Element> = {
        info: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        location: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>,
        document: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        card: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
        food: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
        clock: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        delivery: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
        upload: <svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
    };
    return (
        <div className="bg-linear-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                {icons[icon]}
                {title}
            </h4>
            {children}
        </div>
    );
}

function InputField({ label, type = 'text', value, onChange, placeholder, disabled, maxLength, className = '' }: { label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; disabled?: boolean; maxLength?: number; className?: string }) {
    return (
        <div className={className}>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                className={`w-full px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
        </div>
    );
}