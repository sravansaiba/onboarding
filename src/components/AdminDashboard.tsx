'use client';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

const STRAPI_URL = 'https://onboarding-apis.app.f2c.io';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface MediaFile {
    id: number;
    url: string;
    name: string;
}

interface TimeSlot {
    open_time: string;
    close_time: string;
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
    timings: { hours: Record<string, TimeSlot[]> };
    delivery_timings?: { hours: Record<string, TimeSlot[]> };
    takeaway_timings?: { hours: Record<string, TimeSlot[]> };
    cuisines: string;
    services: string;
    package?: string | null;
    pincode?: string;
    mapEmbedUrl?: string;
    socialLinks?: string[];
    pan_card: MediaFile | null;
    fssai_license: MediaFile | null;
    gst_certificate: MediaFile | null;
    logo_url: MediaFile | null;
    background_image_url: MediaFile | null;
    createdAt: string;
}

export default function AdminDashboard() {
    const [records, setRecords] = useState<OnboardingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [viewMode, setViewMode] = useState<'steps' | 'compact'>('steps');

    useEffect(() => {
        fetchRecords();
    }, [currentPage]);

    const fetchRecords = async () => {
        try {
            const response = await fetch(
                `${STRAPI_URL}/api/onboardapis?pagination[page]=${currentPage}&pagination[pageSize]=10&populate=*`
            );
            const data = await response.json();
            setRecords(data.data);
            setTotalPages(data.meta.pagination.pageCount);
        } catch (error) {
            console.error('Error fetching records:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (record: OnboardingRecord) => {
        if (!confirm(`Accept ${record.restaurant_name}?`)) return;
        
        setProcessing(true);
        try {
            const cuisines = JSON.parse(record.cuisines || '[]');
            const services = JSON.parse(record.services || '[]');
            
            const supabaseData = {
                restaurant_name: record.restaurant_name,
                domain_name: record.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                domain_url: `${record.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.yourdomain.com`,
                logo_url: record.logo_url?.url ? `${STRAPI_URL}${record.logo_url.url}` : null,
                background_image_url: record.background_image_url?.url ? `${STRAPI_URL}${record.background_image_url.url}` : null,
                is_active: true,
                services: services,
                address: `${record.buildingno}, ${record.floor}, ${record.area}, ${record.city}`,
                cuisines: cuisines,
                timings: record.timings,
                contact: parseInt(record.restaurant_primary_contact.replace(/\D/g, '')) || null,
                email: record.email,
                theme: 'light',
                delivery_timmings: record.delivery_timings || { hours: {} },
                takeaway_timmings: record.takeaway_timings || { hours: {} },
                gst_number: record.gst_number,
                fssai_number: record.fssai_number,
                package: record.package || 'marinate-menu',
                mapEmbedUrl: record.mapEmbedUrl,
                socialLinks: record.socialLinks,
            };

            const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/restaurants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify(supabaseData),
            });

            if (!supabaseResponse.ok) throw new Error('Supabase error');

            await fetch(`${STRAPI_URL}/api/onboardapis/${record.documentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { application_status: true } }),
            });

            alert('Application accepted!');
            fetchRecords();
            setSelectedRecord(null);
        } catch (error) {
            alert('Error: ' + error);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Modern Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                                Admin Dashboard
                            </h1>
                            <p className="text-gray-600 mt-1">Restaurant Onboarding Management</p>
                        </div>
                        <button className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{records.length}</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Accepted</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">
                                    {records.filter(r => r.application_status).length}
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-3xl font-bold text-orange-600 mt-2">
                                    {records.filter(r => !r.application_status).length}
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Applications Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Restaurant</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Package</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {records.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {record.logo_url ? (
                                                    <img src={`${STRAPI_URL}${record.logo_url.url}`} className="w-10 h-10 rounded-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
                                                        {record.restaurant_name[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900">{record.restaurant_name}</p>
                                                    <p className="text-sm text-gray-500">{record.city}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{record.fullname}</p>
                                            <p className="text-sm text-gray-500">{record.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                                                {record.package || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.application_status ? (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Accepted</span>
                                            ) : (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedRecord(record)}
                                                className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                                            >
                                                View Details →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRecord && (
                <DetailModal
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                    onAccept={handleAccept}
                    processing={processing}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />
            )}
        </div>
    );
}

type DetailModalProps = {
  record: OnboardingRecord;
  onClose: () => void;
  onAccept: (record: OnboardingRecord) => void;
  processing: boolean;
  viewMode: "steps" | "compact";
  setViewMode: Dispatch<SetStateAction<"steps" | "compact">>;
};

function DetailModal({ record, onClose, onAccept, processing, viewMode, setViewMode }: DetailModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    
    const cuisines = JSON.parse(record.cuisines || '[]');
    const services = JSON.parse(record.services || '[]');
    
    const getTimingsArray = (timingsObj: { hours: Record<string, TimeSlot[]>; }) => {
        if (!timingsObj?.hours) return [];
        const hours = timingsObj.hours;
        return Object.entries(hours).map(([day, slots]: [string, TimeSlot[]]) => ({
            day,
            slots: Array.isArray(slots) ? slots : []
        }));
    };

    const steps = [
        { id: 1, name: 'Basic Info', icon: '📋' },
        { id: 2, name: 'Business', icon: '🏢' },
        { id: 3, name: 'Operations', icon: '⏰' },
        { id: 4, name: 'Documents', icon: '📄' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold">{record.restaurant_name}</h2>
                            <p className="text-orange-100 mt-1">Application Review</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <button
                                onClick={() => setViewMode(viewMode === 'steps' ? 'compact' : 'steps')}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition"
                            >
                                {viewMode === 'steps' ? '📋 Compact' : '🎯 Steps'}
                            </button>
                            <button aria-label='close' onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Step Navigation (only in steps mode) */}
                {viewMode === 'steps' && (
                    <div className="border-b bg-gray-50 px-8 py-4">
                        <div className="flex justify-between items-center max-w-3xl mx-auto">
                            {steps.map((step, idx) => (
                                <div key={step.id} className="flex items-center">
                                    <button
                                        onClick={() => setCurrentStep(step.id)}
                                        className={`flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition ${
                                            currentStep === step.id
                                                ? 'bg-orange-100 text-orange-600'
                                                : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="text-2xl">{step.icon}</span>
                                        <span className="text-xs font-semibold">{step.name}</span>
                                    </button>
                                    {idx < steps.length - 1 && (
                                        <div className="w-12 h-0.5 bg-gray-200 mx-2"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-8 overflow-y-auto max-h-[60vh]">
                    {viewMode === 'compact' ? (
                        /* Compact View - All Info */
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <Section title="Basic Information">
                                <InfoGrid>
                                    <InfoItem label="Owner" value={record.fullname} />
                                    <InfoItem label="Email" value={record.email} />
                                    <InfoItem label="Phone" value={record.phone} />
                                    <InfoItem label="City" value={record.city} />
                                    <InfoItem label="Area" value={record.area} />
                                    <InfoItem label="Building" value={record.buildingno} />
                                </InfoGrid>
                            </Section>

                            {/* Business Details */}
                            <Section title="Business Details">
                                <InfoGrid>
                                    <InfoItem label="PAN" value={record.pan_number} />
                                    <InfoItem label="FSSAI" value={record.fssai_number} />
                                    <InfoItem label="GST" value={record.gst_number || 'Not Registered'} />
                                    <InfoItem label="Package" value={record.package || 'N/A'} />
                                    <InfoItem label="Bank Account" value={record.bank_accno} />
                                    <InfoItem label="IFSC" value={record.ifsc_code} />
                                </InfoGrid>
                                <div className="mt-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Cuisines</p>
                                    <div className="flex flex-wrap gap-2">
                                        {cuisines.map((c: string, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm capitalize">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Services</p>
                                    <div className="flex flex-wrap gap-2">
                                        {services.map((s: string, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
                                                {s.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Section>
                        </div>
                    ) : (
                        /* Step View */
                        <div>
                            {currentStep === 1 && (
                                <Section title="Restaurant & Owner Information">
                                    <InfoGrid>
                                        <InfoItem label="Restaurant Name" value={record.restaurant_name} />
                                        <InfoItem label="Owner Name" value={record.fullname} />
                                        <InfoItem label="Email" value={record.email} />
                                        <InfoItem label="Phone" value={record.phone} />
                                        <InfoItem label="Primary Contact" value={record.restaurant_primary_contact} />
                                        <InfoItem label="City" value={record.city} />
                                        <InfoItem label="Area" value={record.area} />
                                        <InfoItem label="Building No" value={record.buildingno} />
                                        <InfoItem label="Floor" value={record.floor} />
                                        <InfoItem label="Landmark" value={record.landmark} />
                                    </InfoGrid>
                                </Section>
                            )}

                            {currentStep === 2 && (
                                <Section title="Business & Legal Details">
                                    <InfoGrid>
                                        <InfoItem label="PAN Number" value={record.pan_number} />
                                        <InfoItem label="Name as per PAN" value={record.fullnameaspan} />
                                        <InfoItem label="FSSAI Number" value={record.fssai_number} />
                                        <InfoItem label="FSSAI Expiry" value={record.fssai_expiry} />
                                        <InfoItem label="GST Registered" value={record.gst ? 'Yes' : 'No'} />
                                        {record.gst_number && <InfoItem label="GST Number" value={record.gst_number} />}
                                        <InfoItem label="Package" value={record.package || 'N/A'} />
                                        <InfoItem label="Bank Account" value={record.bank_accno} />
                                        <InfoItem label="IFSC Code" value={record.ifsc_code} />
                                        <InfoItem label="Account Type" value={record.account_type} />
                                    </InfoGrid>
                                    <div className="mt-6 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-3">Cuisines</p>
                                            <div className="flex flex-wrap gap-2">
                                                {cuisines.map((c: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium capitalize">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-3">Services</p>
                                            <div className="flex flex-wrap gap-2">
                                                {services.map((s: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                                                        {s.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {currentStep === 3 && (
                                <Section title="Operating Hours">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3">Restaurant Timings</h4>
                                            <div className="space-y-2">
                                                {getTimingsArray(record.timings).map((day) => (
                                                    <div key={day.day} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg">
                                                        <span className="font-medium text-gray-700">{day.day}</span>
                                                        <div className="text-sm text-gray-600">
                                                            {day.slots.map((slot, i: number) => (
                                                                <span key={i}>{slot.open_time} - {slot.close_time}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {record.delivery_timings && (
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-3 mt-6">Delivery Timings</h4>
                                                <div className="space-y-2">
                                                    {getTimingsArray(record.delivery_timings).map((day) => (
                                                        <div key={day.day} className="flex justify-between items-center py-2 px-4 bg-blue-50 rounded-lg">
                                                            <span className="font-medium text-blue-700">{day.day}</span>
                                                            <div className="text-sm text-blue-600">
                                                                {day.slots.map((slot, i: number) => (
                                                                    <span key={i}>{slot.open_time} - {slot.close_time}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Section>
                            )}

                            {currentStep === 4 && (
                                <Section title="Documents & Images">
                                    <div className="grid grid-cols-2 gap-6">
                                        {record.logo_url && (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-2">Logo</p>
                                                <img src={`${STRAPI_URL}${record.logo_url.url}`} className="w-full h-48 object-cover rounded-xl border-2 border-gray-200" alt="Logo" />
                                            </div>
                                        )}
                                        {record.pan_card && (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-2">PAN Card</p>
                                                <a href={`${STRAPI_URL}${record.pan_card.url}`} target="_blank" className="block p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 transition text-center">
                                                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <p className="text-sm text-gray-600">{record.pan_card.name}</p>
                                                </a>
                                            </div>
                                        )}
                                        {record.fssai_license && (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-2">FSSAI License</p>
                                                <a href={`${STRAPI_URL}${record.fssai_license.url}`} target="_blank" className="block p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 transition text-center">
                                                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p className="text-sm text-gray-600">{record.fssai_license.name}</p>
                                                </a>
                                            </div>
                                        )}
                                        {record.gst_certificate && (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-2">GST Certificate</p>
                                                <a href={`${STRAPI_URL}${record.gst_certificate.url}`} target="_blank" className="block p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition text-center">
                                                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <p className="text-sm text-gray-600">{record.gst_certificate.name}</p>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </Section>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t bg-gray-50 px-8 py-6">
                    <div className="flex justify-between items-center">
                        {viewMode === 'steps' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                                    disabled={currentStep === 1}
                                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                                >
                                    ← Previous
                                </button>
                                <button
                                    onClick={() => setCurrentStep(s => Math.min(4, s + 1))}
                                    disabled={currentStep === 4}
                                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                        <div className={`flex gap-3 ${viewMode === 'compact' ? 'w-full justify-end' : ''}`}>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition font-medium"
                            >
                                Close
                            </button>
                            {!record.application_status && (
                                <>
                                    <button
                                        onClick={() => alert('Reject functionality')}
                                        disabled={processing}
                                        className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition font-medium"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => onAccept(record)}
                                        disabled={processing}
                                        className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition font-medium"
                                    >
                                        {processing ? 'Processing...' : '✓ Accept'}
                                    </button>
                                </>
                            )}
                            {record.application_status && (
                                <div className="px-6 py-2.5 bg-green-100 text-green-700 rounded-lg font-semibold">
                                    ✓ Accepted
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-orange-500">{title}</h3>
            {children}
        </div>
    );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value || 'N/A'}</p>
        </div>
    );
}