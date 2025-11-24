// 'use client';
// import { useEffect, useState, JSX } from 'react';
// import { useRouter } from 'next/navigation';
// const STRAPI_URL = 'https://onboarding-apis.app.f2c.io'; 
// interface StrapiRole {
//     id: number;
//     name: string;
// }
// interface User {
//     id: number;
//     username: string;
//     email: string;
//     role?: StrapiRole;
// }
// interface MediaFile {
//     id: number;
//     documentId: string;
//     url: string;
//     name: string;
//     ext: string;
//     mime: string;
//     size: number;
// }
// interface SocialLink {
//     url: string;
//     platform: string;
// }
// interface TimingHour {
//     day: string;
//     open_time: string;
//     close_time: string;
// }
// interface Timing {
//     open_time: string;
//     close_time: string;
// }
// interface OnboardingRecord {
//     id: number;
//     documentId: string;
//     restaurant_name: string;
//     fullname: string;
//     email: string;
//     phone: string;
//     restaurant_primary_contact: string;
//     buildingno: string;
//     floor: string;
//     area: string;
//     city: string;
//     landmark: string;
//     address: string;
//     pan_number: string;
//     fullnameaspan: string;
//     gst: boolean;
//     gst_number: string | null;
//     fssai_number: string;
//     fssai_expiry: string;
//     bank_accno: string;
//     ifsc_code: string;
//     account_type: string;
//     application_status: boolean;
//     timings: {
//         hours: TimingHour[];
//     };
//     delivery_timings: Timing;
//     takeaway_timings: Timing;
//     cuisines: string;
//     services: string;
//     // socialLinks: SocialLink | null;
//     // mapEmbedUrl: string | null;
//     pan_card: MediaFile | null;
//     fssai_license: MediaFile | null;
//     gst_certificate: MediaFile | null;
//     logo_url: MediaFile | null;
//     background_image_url: MediaFile | null;
//     createdAt: string;
//     updatedAt: string;
//     publishedAt: string;
// }
// interface ApiResponse {
//     data: OnboardingRecord[]; // Expect an array, even if single record
//     meta?: string; // Pagination might not be needed for single user
// }



// interface EditFormData {
//     restaurant_name: string;
//     fullname: string;
//     email: string;
//     phone: string;
//     restaurant_primary_contact: string;
//     buildingno: string;
//     floor: string;
//     area: string;
//     city: string;
//     landmark: string;
//     pan_number: string;
//     fullnameaspan: string;
//     address: string;
//     gst: boolean;
//     gst_number: string; // Use string, handle empty/null logic in save
//     fssai_number: string;
//     fssai_expiry: string;
//     bank_accno: string;
//     ifsc_code: string;
//     account_type: string;
//     timings: {
//         hours: TimingHour[];
//     };
//     delivery_timings: Timing;
//     takeaway_timings: Timing;
//     cuisines: string[]; // Direct array for editing
//     services: string[]; // Direct array for editing
//     // mapEmbedUrl?: string;
//     // socialLinks?: SocialLink;
//     logo_url: MediaFile | null;
//     background_image_url: MediaFile | null;
//     pan_card: MediaFile | null;
//     fssai_license: MediaFile | null;
//     gst_certificate: MediaFile | null;
// }



// type FileUploadField = "logo_url" | "background_image_url" | "pan_card" | "fssai_license" | "gst_certificate";

// // --- End of Reused Interfaces ---

// export default function CustomerDashboard(): JSX.Element {
//     const router = useRouter();
//     const [user, setUser] = useState<User | null>(null);
//     const [record, setRecord] = useState<OnboardingRecord | null>(null); // Hold single record
//     const [loading, setLoading] = useState<boolean>(true);
//     const [error, setError] = useState<string>('');
//     const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null); // For modal
//     const [isEditing, setIsEditing] = useState<boolean>(false); // New state for edit mode
//     // Updated state for form data to include file objects
//     const [editFormData, setEditFormData] = useState<EditFormData>({} as EditFormData);
//     const [fileUploads, setFileUploads] = useState<{
//         logo_url?: File | null;
//         background_image_url?: File | null;
//         pan_card?: File | null;
//         fssai_license?: File | null;
//         gst_certificate?: File | null;
//     }>({});
//     const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set());


//     // Add these after your existing useState declarations (around line 120)
//     const [deleteConfirmation, setDeleteConfirmation] = useState<{
//         show: boolean;
//         field: string;
//         label: string;
//     } | null>(null);

//     const [toast, setToast] = useState<{
//         show: boolean;
//         message: string;
//         type: 'success' | 'error';
//     } | null>(null);

//     useEffect(() => {
//         checkAuth();
//     }, []);

//     useEffect(() => {
//         if (user) {
//             fetchRecord();
//         }
//     }, [user]);

    


//     useEffect(() => {
//         // Initialize edit form data when record is loaded
//         if (record) {
//             setEditFormData({
//                 restaurant_name: record.restaurant_name,
//                 fullname: record.fullname,
//                 email: record.email,
//                 phone: record.phone,
//                 restaurant_primary_contact: record.restaurant_primary_contact,
//                 buildingno: record.buildingno,
//                 floor: record.floor,
//                 area: record.area,
//                 city: record.city,
//                 landmark: record.landmark,
//                 pan_number: record.pan_number,
//                 fullnameaspan: record.fullnameaspan,
//                 address: record.address,
//                 gst: record.gst,
//                 gst_number: record.gst_number || '',
//                 fssai_number: record.fssai_number,
//                 fssai_expiry: record.fssai_expiry,
//                 bank_accno: record.bank_accno,
//                 ifsc_code: record.ifsc_code,
//                 account_type: record.account_type,
//                 timings: record.timings,
//                 delivery_timings: record.delivery_timings,
//                 takeaway_timings: record.takeaway_timings,
//                 cuisines: record.cuisines ? JSON.parse(record.cuisines) : [],
//                 services: record.services ? JSON.parse(record.services) : [],
//                 logo_url: record.logo_url,
//                 background_image_url: record.background_image_url,
//                 pan_card: record.pan_card,
//                 fssai_license: record.fssai_license,
//                 gst_certificate: record.gst_certificate,
//             });

//             // Initialize fileUploads state to null for all file fields
//             setFileUploads({
//                 logo_url: null,
//                 background_image_url: null,
//                 pan_card: null,
//                 fssai_license: null,
//                 gst_certificate: null,
//             });

//             // Clear files to delete when loading a record
//             setFilesToDelete(new Set());
//         }
//     }, [record]);

//     const checkAuth = (): void => {
//         // Check for JWT and user data from storage
//         const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
//         const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
//         if (!jwt || !userData) {
//             router.push('/login'); // Redirect to login if not authenticated
//             return;
//         }
//         try {
//             const parsedUser: User = JSON.parse(userData);
//             setUser(parsedUser);
//         } catch (e) {
//             console.error('Failed to parse user data:', e);
//             router.push('/login');
//         }
//     };

//     const fetchRecord = async (): Promise<void> => {
//         setLoading(true);
//         setError('');
//         try {
//             const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
//             if (!jwt) {
//                 throw new Error('Authentication token missing.');
//             }
//             // Use the user's email from the authenticated user object
//             const userEmail = user?.email;
//             if (!userEmail) {
//                 throw new Error('User email not found.');
//             }
//             // Construct the query to filter by the logged-in user's email
//             const query = `${STRAPI_URL}/api/onboardapis?filters[email][$eq]=${encodeURIComponent(userEmail)}&populate=*`;
//             const response = await fetch(query, {
//                 headers: {
//                     Authorization: `Bearer ${jwt}`,
//                 },
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     router.push('/login'); // Token might be expired
//                     return;
//                 }
//                 throw new Error('Failed to fetch your application record.');
//             }

//             const data: ApiResponse = await response.json();
//             console.log('API Response:', data); // Debug log
//             if (data.data && data.data.length > 0) {
//                 // Assuming only one record per user email, take the first
//                 setRecord(data.data[0]);
//             } else {
//                 // Handle case where no record is found for the user
//                 setRecord(null);
//                 console.warn('No application record found for the user:', userEmail);
//             }
//         } catch (err) {
//             console.error('Error fetching record:', err);
//             setError(err instanceof Error ? err.message : 'Failed to load your application details.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleEdit = (): void => {
//         // Check if the user's email matches the record's email
//         if (user?.email === record?.email) {
//             setIsEditing(true);
//         } else {
//             setError('You are not authorized to edit this record.');
//         }
//     };

//     // Function to upload a file and return its ID
//     const uploadFileAndGetId = async (file: File, jwt: string): Promise<number> => {
//         const formData = new FormData();
//         formData.append('files', file);

//         const uploadResponse = await fetch(`${STRAPI_URL}/api/upload`, {
//             method: 'POST',
//             headers: {
//                 Authorization: `Bearer ${jwt}`,
//             },
//             body: formData,
//         });

//         if (!uploadResponse.ok) {
//             const errorText = await uploadResponse.text();
//             console.error('Upload error response:', errorText);
//             throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
//         }

//         const uploadedFiles = await uploadResponse.json();
//         if (uploadedFiles && uploadedFiles[0] && uploadedFiles[0].id) {
//             return uploadedFiles[0].id;
//         } else {
//             throw new Error('Upload response did not contain file ID.');
//         }
//     };

    



//     // Replace the entire handleSave function with this updated version (around line 300)
//     const handleSave = async (): Promise<void> => {
//         if (!record) return;
//         try {
//             const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
//             if (!jwt) {
//                 throw new Error('Authentication token missing.');
//             }

//             // Prepare the payload - handle file uploads first
//             const payload = {
//                 data: {
//                     restaurant_name: editFormData.restaurant_name,
//                     fullname: editFormData.fullname,
//                     phone: editFormData.phone,
//                     restaurant_primary_contact: editFormData.restaurant_primary_contact,
//                     buildingno: editFormData.buildingno,
//                     floor: editFormData.floor,
//                     area: editFormData.area,
//                     city: editFormData.city,
//                     landmark: editFormData.landmark,
//                     pan_number: editFormData.pan_number,
//                     fullnameaspan: editFormData.fullnameaspan,
//                     address: editFormData.address,
//                     gst: editFormData.gst,
//                     gst_number: editFormData.gst_number || null,
//                     fssai_number: editFormData.fssai_number,
//                     fssai_expiry: editFormData.fssai_expiry,
//                     bank_accno: editFormData.bank_accno,
//                     ifsc_code: editFormData.ifsc_code,
//                     account_type: editFormData.account_type,
//                     timings: editFormData.timings,
//                     delivery_timings: editFormData.delivery_timings,
//                     takeaway_timings: editFormData.takeaway_timings,
//                     cuisines: JSON.stringify(editFormData.cuisines),
//                     services: JSON.stringify(editFormData.services),
//                 }
//             };

//             // Handle file uploads and update payload with file IDs
//             const fileIds: Record<string, number> = {};
//             const fileUploadPromises = Object.entries(fileUploads)
//                 .filter(([_, file]) => file !== null)
//                 .map(async ([fieldName, file]) => {
//                     if (file) {
//                         const fileId = await uploadFileAndGetId(file, jwt);
//                         fileIds[fieldName] = fileId;
//                     }
//                 });

//             // Wait for all file uploads to complete
//             await Promise.all(fileUploadPromises);

//             // Add file IDs to the payload's data section
//             Object.entries(fileIds).forEach(([fieldName, fileId]) => {
//                 // @ts-ignore
//                 payload.data[fieldName] = fileId;
//             });

//             // Add null values for files marked for deletion
//             filesToDelete.forEach((fieldName) => {
//                 // @ts-ignore
//                 payload.data[fieldName] = null;
//             });

//             console.log('Final Payload for PUT request:', payload);

//             const response = await fetch(`${STRAPI_URL}/api/onboardapis/${record.documentId}`, {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: `Bearer ${jwt}`,
//                 },
//                 body: JSON.stringify(payload),
//             });

//             if (!response.ok) {
//                 const errorText = await response.text();
//                 console.error('Save error response:', errorText);
//                 throw new Error(`Failed to update record: ${response.statusText}`);
//             }

//             // Now delete the actual files from Strapi storage
//             const fileDeletionPromises = Array.from(filesToDelete).map(async (fieldName) => {
//                 const fileToDelete = record[fieldName as keyof OnboardingRecord] as MediaFile | null;
//                 if (fileToDelete && fileToDelete.id) {
//                     try {
//                         await fetch(`${STRAPI_URL}/api/upload/files/${fileToDelete.id}`, {
//                             method: 'DELETE',
//                             headers: {
//                                 Authorization: `Bearer ${jwt}`,
//                             },
//                         });
//                     } catch (err) {
//                         console.error(`Failed to delete file ${fieldName}:`, err);
//                     }
//                 }
//             });

//             // Wait for all file deletions to complete
//             await Promise.all(fileDeletionPromises);

//             const updatedRecord = await response.json();
//             window.location.reload();
//             setRecord(updatedRecord.data);
//             setIsEditing(false);
//             setError('');

//             // Reset file uploads state after successful save
//             setFileUploads({
//                 logo_url: null,
//                 background_image_url: null,
//                 pan_card: null,
//                 fssai_license: null,
//                 gst_certificate: null,
//             });

//             // Clear the files to delete set
//             setFilesToDelete(new Set());

//             // Show success toast
//             showToast('Changes saved successfully!', 'success');

//         } catch (err) {
//             console.error('Error saving record:', err);
//             setError(err instanceof Error ? err.message : 'Failed to save changes.');
//             showToast('Failed to save changes', 'error');
//         }
//     };

   


//     // Replace the handleCancel function with this updated version (around line 400)
//     const handleCancel = (): void => {
//         // Fetch the record again to reset any changes
//         fetchRecord();
//         setIsEditing(false);
//         setError('');

//         // Reset file uploads state
//         setFileUploads({
//             logo_url: null,
//             background_image_url: null,
//             pan_card: null,
//             fssai_license: null,
//             gst_certificate: null,
//         });

//         // Clear files to delete
//         setFilesToDelete(new Set());
//     };

//     const handleInputChange = (field: keyof EditFormData, value: unknown): void => {
//         setEditFormData(prev => ({ ...prev, [field]: value }));
//     };

//     // New function to handle file input changes
//     // const handleFileChange = (field: keyof typeof fileUploads, file: File | null): void => {
//     //     setFileUploads(prev => ({
//     //         ...prev,
//     //         [field]: file
//     //     }));
//     // };


//     // New function to handle file input changes
//     const handleFileChange = (field: FileUploadField, file: File | null): void => { // Use FileUploadField here
//         setFileUploads(prev => ({
//             ...prev,
//             [field]: file
//         }));
//     };


//     // Add these functions after handleFileChange (around line 280)
//     const showToast = (message: string, type: 'success' | 'error') => {
//         setToast({ show: true, message, type });
//         setTimeout(() => setToast(null), 3000);
//     };

   


//     // Replace the handleDeleteFile function with this simpler version (around line 290)
//     const handleDeleteFile = (field: keyof typeof fileUploads): void => {
//         // Mark the file for deletion (staged deletion)
//         setFilesToDelete(prev => new Set(prev).add(field as string));

//         // Update form data to show null immediately in UI
//         setEditFormData(prev => ({
//             ...prev,
//             [field]: null
//         }));

//         // Clear any pending file upload for this field
//         setFileUploads(prev => ({
//             ...prev,
//             [field]: null
//         }));

//         // Close the confirmation modal
//         setDeleteConfirmation(null);

//         // Show info toast
//         showToast('File marked for deletion. Click "Save Changes" to confirm.', 'success');
//     };

//     const handleCuisineChange = (cuisine: string) => {
//         setEditFormData(prev => ({
//             ...prev,
//             cuisines: prev.cuisines.includes(cuisine)
//                 ? prev.cuisines.filter((c: string) => c !== cuisine)
//                 : [...prev.cuisines, cuisine]
//         }));
//     };

//     const handleTimeChange = (day: string, type: 'open' | 'close', time: string) => {
//         setEditFormData(prev => ({
//             ...prev,
//             timings: {
//                 ...prev.timings,
//                 hours: prev.timings.hours.map(hour =>
//                     hour.day === day
//                         ? { ...hour, [`${type}_time`]: time }
//                         : hour
//                 )
//             }
//         }));
//     };

//     const handleDeliveryTimeChange = (type: 'open' | 'close', time: string) => {
//         setEditFormData(prev => ({
//             ...prev,
//             delivery_timings: {
//                 ...prev.delivery_timings,
//                 [`${type}_time`]: time
//             }
//         }));
//     };

//     const handleTakeawayTimeChange = (type: 'open' | 'close', time: string) => {
//         setEditFormData(prev => ({
//             ...prev,
//             takeaway_timings: {
//                 ...prev.takeaway_timings,
//                 [`${type}_time`]: time
//             }
//         }));
//     };

//     const handleLogout = (): void => {
//         localStorage.removeItem('jwt');
//         localStorage.removeItem('user');
//         sessionStorage.removeItem('jwt');
//         sessionStorage.removeItem('user');
//         router.push('/login');
//     };

//     const formatDate = (dateString: string): string => {
//         return new Date(dateString).toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'short',
//             day: 'numeric',
//         });
//     };

//     const getFileUrl = (file: MediaFile | null): string => {
//         if (!file || !file.url) return '';
//         return `${STRAPI_URL}${file.url}`;
//     };

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gray-50">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
//                     <p className="mt-4 text-gray-600">Loading your application...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-gray-50">
//             {/* Header */}
//             <div className="bg-white shadow">
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//                     <div className="flex justify-between items-center">
//                         <div>
//                             <h1 className="text-2xl font-bold text-gray-900">My Application Dashboard</h1>
//                             <p className="text-sm text-gray-600">View and manage your restaurant onboarding status</p>
//                         </div>
//                         <div className="flex items-center gap-4">
//                             <button
//                                 onClick={handleLogout}
//                                 className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
//                             >
//                                 Logout
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Main Content */}
//             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//                 {error && (
//                     <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
//                         <p className="text-sm text-red-700">{error}</p>
//                     </div>
//                 )}
//                 {record ? (
//                     <div className="bg-white rounded-lg shadow overflow-hidden">
//                         <div className="overflow-x-auto">
//                             <table className="min-w-full divide-y divide-gray-200">
//                                 <thead className="bg-gray-50">
//                                     <tr>
//                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                             Restaurant
//                                         </th>
//                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                             Owner
//                                         </th>
//                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                             Contact
//                                         </th>
//                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                             Status
//                                         </th>
//                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                             Date
//                                         </th>
//                                         <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                             Actions
//                                         </th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="bg-white divide-y divide-gray-200">
//                                     <tr className="hover:bg-gray-50 transition">
//                                         <td className="px-6 py-4 whitespace-nowrap">
//                                             <div className="flex items-center">
//                                                 <div className="flex-shrink-0 h-10 w-10">
//                                                     {record.logo_url ? (
//                                                         <img
//                                                             className="h-10 w-10 rounded-full object-cover"
//                                                             src={getFileUrl(record.logo_url)}
//                                                             alt={record.restaurant_name}
//                                                         />
//                                                     ) : (
//                                                         <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
//                                                             <span className="text-orange-600 font-semibold text-sm">
//                                                                 {record.restaurant_name.charAt(0).toUpperCase()}
//                                                             </span>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                                 <div className="ml-4">
//                                                     <div className="text-sm font-medium text-gray-900">{record.restaurant_name}</div>
//                                                     <div className="text-sm text-gray-500">{record.city}</div>
//                                                 </div>
//                                             </div>
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap">
//                                             <div className="text-sm text-gray-900">{record.fullname}</div>
//                                             <div className="text-sm text-gray-500">{record.email}</div>
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                                             {record.phone}
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap">
//                                             {record.application_status ? (
//                                                 <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
//                                                     Accepted
//                                                 </span>
//                                             ) : (
//                                                 <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
//                                                     Pending
//                                                 </span>
//                                             )}
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                                             {formatDate(record.createdAt)}
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                                             <button
//                                                 onClick={() => setSelectedRecord(record)} // Set the single record for the modal
//                                                 className="text-orange-600 hover:text-orange-900 mr-2"
//                                             >
//                                                 <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                                                 </svg>
//                                             </button>
//                                             <button
//                                                 onClick={handleEdit}
//                                                 disabled={record.application_status} // Disable if application is accepted
//                                                 className={`text-blue-600 hover:text-blue-900 ${record.application_status ? 'opacity-50 cursor-not-allowed' : ''
//                                                     }`}
//                                             >
//                                                 <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                                                 </svg>
//                                             </button>
//                                         </td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>
//                 ) : (
//                     // Optional: Display a message if no record is found
//                     <div className="bg-white rounded-lg shadow p-8 text-center">
//                         <h3 className="text-lg font-medium text-gray-900 mb-2">No Application Found</h3>
//                         <p className="text-sm text-gray-500">It seems you haven't submitted an onboarding application yet.</p>
//                         {/* You might add a button here to navigate to the application form */}
//                         <button
//                             onClick={() => router.push('/onboarding')} // Example route to application form
//                             className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
//                         >
//                             Apply Now
//                         </button>
//                     </div>
//                 )}
//             </div>

//             {/* Detail Modal - Only show if a record is selected */}
//             {selectedRecord && (
//                 <DetailModal
//                     record={selectedRecord}
//                     onClose={() => setSelectedRecord(null)}
//                     getFileUrl={getFileUrl}
//                 />
//             )}

//             {/* Edit Modal */}
//             {isEditing && record && (
//                 <EditModal
//                     formData={editFormData}
//                     fileUploads={fileUploads} // Pass file uploads state
//                     onInputChange={handleInputChange}
//                     onFileChange={handleFileChange} // Pass file change handler
//                     handleCuisineChange={handleCuisineChange}
//                     handleTimeChange={handleTimeChange}
//                     handleDeliveryTimeChange={handleDeliveryTimeChange}
//                     handleTakeawayTimeChange={handleTakeawayTimeChange}
//                     onClose={() => setIsEditing(false)}
//                     onSave={handleSave}
//                     onCancel={handleCancel}
//                     applicationStatus={record.application_status}
//                     getFileUrl={getFileUrl} // Pass getFileUrl for previews
//                     onShowDeleteConfirmation={(field, label) =>
//                         setDeleteConfirmation({ show: true, field, label })
//                     }
//                 />
//             )}
            

//             {/* Update the confirmation modal paragraph text */}
//             {deleteConfirmation?.show && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
//                     <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
//                         <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                             Confirm Deletion
//                         </h3>
//                         <p className="text-gray-600 mb-6">
//                             Are you sure you want to delete the {deleteConfirmation.label}? The file will be removed from the UI now, but will only be permanently deleted from the server when you click "Save Changes".
//                         </p>
//                         <div className="flex justify-end gap-3">
//                             <button
//                                 onClick={() => setDeleteConfirmation(null)}
//                                 className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 onClick={() => handleDeleteFile(deleteConfirmation.field as FileUploadField)}
//                                 className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
//                             >
//                                 Remove
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Toast Notification */}
//             {toast?.show && (
//                 <div className="fixed bottom-4 right-4 z-[70] animate-slide-up">
//                     <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
//                         } text-white`}>
//                         {toast.type === 'success' ? (
//                             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                             </svg>
//                         ) : (
//                             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                             </svg>
//                         )}
//                         <span>{toast.message}</span>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// // --- Edit Modal Component ---
// function EditModal({
//     formData,
//     fileUploads,
//     onInputChange,
//     onFileChange, // Receive the new file change handler
//     handleCuisineChange,
//     handleTimeChange,
//     handleDeliveryTimeChange,
//     handleTakeawayTimeChange,
//     onClose,
//     onSave,
//     onCancel,
//     applicationStatus,
//     getFileUrl, // Receive getFileUrl for previews
//     onShowDeleteConfirmation,
// }: {
//     formData: EditFormData;
//     fileUploads: { [key: string]: File | null };
//     onInputChange: (field: keyof EditFormData, value: unknown) => void;
//         onFileChange: (field: FileUploadField, file: File | null) => void; // New prop
//     handleCuisineChange: (cuisine: string) => void;
//     handleTimeChange: (day: string, type: 'open' | 'close', time: string) => void;
//     handleDeliveryTimeChange: (type: 'open' | 'close', time: string) => void;
//     handleTakeawayTimeChange: (type: 'open' | 'close', time: string) => void;
//     onClose: () => void;
//     onSave: () => void;
//     onCancel: () => void;
//     applicationStatus: boolean;
//     getFileUrl: (file: MediaFile | null) => string;
//     onShowDeleteConfirmation: (field: string, label: string) => void;
// }): JSX.Element {
//     const cuisineOptions = ['Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'American', 'Continental'];

    


//     // Replace the entire renderFileInput function with this:
//     const renderFileInput = (label: string, field: keyof typeof fileUploads, currentFile: MediaFile | null, acceptTypes: string) => {
//         const selectedFile = fileUploads[field];
//         const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : (currentFile ? getFileUrl(currentFile) : '');
//         const hasFile = selectedFile || currentFile;

//         return (
//             <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
//                 <div className="flex items-center gap-4">
//                     <input
//                         type="file"
//                         accept={acceptTypes}
//                         onChange={(e) => onFileChange(field as FileUploadField, e.target.files?.[0] || null)}
//                         className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                         disabled={applicationStatus}
//                     />
//                     <button
//                         type="button"
//                         onClick={() => {
//                             if (hasFile && !applicationStatus) {
//                                 // Show confirmation dialog
//                                 onShowDeleteConfirmation(field as string, label);
//                             }
//                         }}
//                         className={`px-4 py-3 border rounded-xl transition whitespace-nowrap ${hasFile && !applicationStatus
//                             ? 'border-red-300 text-red-700 hover:bg-red-50'
//                             : 'border-gray-300 text-gray-400 cursor-not-allowed'
//                             }`}
//                         disabled={applicationStatus || !hasFile}
//                     >
//                         Clear
//                     </button>
//                 </div>
//                 {previewUrl && (
//                     <div className="mt-2">
//                         {previewUrl.endsWith('.pdf') ? (
//                             <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
//                                 View PDF
//                             </a>
//                         ) : (
//                             <img src={previewUrl} alt={`${label} Preview`} className="h-32 object-contain border rounded" />
//                         )}
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     return (
//         <div className="fixed inset-0 bg-black/70 bg-opacity-50 overflow-y-auto h-full w-full z-50">
//             <div className="relative top-10 mx-auto p-5 border border-gray-300 w-full max-w-4xl shadow-lg rounded-lg bg-white mb-10">
//                 {/* Header */}
//                 <div className="flex justify-between items-center border-b pb-4 mb-4">
//                     <h3 className="text-2xl font-bold text-gray-900">Edit Application</h3>
//                     <button
//                         onClick={onClose}
//                         className="text-gray-400 hover:text-gray-600 transition"
//                     >
//                         <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                     </button>
//                 </div>

//                 {/* Content */}
//                 <div className="max-h-[70vh] overflow-y-auto px-2">
//                     {/* Basic Info */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                             <div className="md:col-span-2">
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
//                                 <input
//                                     type="text"
//                                     name="restaurant_name"
//                                     value={formData.restaurant_name}
//                                     onChange={(e) => onInputChange('restaurant_name', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Enter your restaurant name"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
//                                 <input
//                                     type="text"
//                                     name="fullname"
//                                     value={formData.fullname}
//                                     onChange={(e) => onInputChange('fullname', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Your full name"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
//                                 <input
//                                     type="email"
//                                     name="email"
//                                     value={formData.email}
//                                     onChange={(e) => onInputChange('email', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="your.email@example.com"
//                                     disabled
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
//                                 <input
//                                     type="tel"
//                                     name="phone"
//                                     value={formData.phone}
//                                     onChange={(e) => onInputChange('phone', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="+91 XXXXX XXXXX"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Primary Contact *</label>
//                                 <input
//                                     type="tel"
//                                     name="restaurant_primary_contact"
//                                     value={formData.restaurant_primary_contact}
//                                     onChange={(e) => onInputChange('restaurant_primary_contact', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Restaurant phone number"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Address Info */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Address Information</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Building Number *</label>
//                                 <input
//                                     type="text"
//                                     name="buildingno"
//                                     value={formData.buildingno}
//                                     onChange={(e) => onInputChange('buildingno', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Building/House no."
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
//                                 <input
//                                     type="text"
//                                     name="floor"
//                                     value={formData.floor}
//                                     onChange={(e) => onInputChange('floor', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Floor number"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Area *</label>
//                                 <input
//                                     type="text"
//                                     name="area"
//                                     value={formData.area}
//                                     onChange={(e) => onInputChange('area', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Area/Locality"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
//                                 <input
//                                     type="text"
//                                     name="city"
//                                     value={formData.city}
//                                     onChange={(e) => onInputChange('city', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="City"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
//                                 <input
//                                     type="text"
//                                     name="landmark"
//                                     value={formData.landmark}
//                                     onChange={(e) => onInputChange('landmark', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Nearby landmark"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address *</label>
//                                 <input
//                                     type="text"
//                                     name="address"
//                                     value={formData.address}
//                                     onChange={(e) => onInputChange('address', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Full address"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Business Info */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Business Information</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number *</label>
//                                 <input
//                                     type="text"
//                                     name="pan_number"
//                                     value={formData.pan_number}
//                                     onChange={(e) => onInputChange('pan_number', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all uppercase"
//                                     placeholder="ABCDE1234F"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Full Name as per PAN *</label>
//                                 <input
//                                     type="text"
//                                     name="fullnameaspan"
//                                     value={formData.fullnameaspan}
//                                     onChange={(e) => onInputChange('fullnameaspan', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Name as on PAN card"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">FSSAI License No *</label>
//                                 <input
//                                     type="text"
//                                     name="fssai_number"
//                                     value={formData.fssai_number}
//                                     onChange={(e) => onInputChange('fssai_number', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="14-digit FSSAI number"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">FSSAI Expiry Date *</label>
//                                 <input
//                                     type="date"
//                                     name="fssai_expiry"
//                                     value={formData.fssai_expiry}
//                                     onChange={(e) => onInputChange('fssai_expiry', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             {/* Conditionally render GST number field based on GST checkbox */}
//                             {formData.gst && (
//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
//                                     <input
//                                         type="text"
//                                         name="gst_number"
//                                         value={formData.gst_number}
//                                         onChange={(e) => onInputChange('gst_number', e.target.value)}
//                                         className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all uppercase"
//                                         placeholder="GST number"
//                                         disabled={applicationStatus}
//                                     />
//                                 </div>
//                             )}
//                             <div className="flex items-center">
//                                 <label className="flex items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all w-full">
//                                     <input
//                                         type="checkbox"
//                                         name="gst"
//                                         checked={formData.gst}
//                                         onChange={(e) => onInputChange('gst', e.target.checked)}
//                                         className="h-5 w-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
//                                         disabled={applicationStatus}
//                                     />
//                                     <span className="ml-3 text-sm font-medium text-gray-700">GST Registered</span>
//                                 </label>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Banking Info */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Banking Information</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number *</label>
//                                 <input
//                                     type="text"
//                                     name="bank_accno"
//                                     value={formData.bank_accno}
//                                     onChange={(e) => onInputChange('bank_accno', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     placeholder="Account number"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code *</label>
//                                 <input
//                                     type="text"
//                                     name="ifsc_code"
//                                     value={formData.ifsc_code}
//                                     onChange={(e) => onInputChange('ifsc_code', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all uppercase"
//                                     placeholder="IFSC code"
//                                     disabled={applicationStatus}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
//                                 <select
//                                     name="account_type"
//                                     value={formData.account_type}
//                                     onChange={(e) => onInputChange('account_type', e.target.value)}
//                                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
//                                     disabled={applicationStatus}
//                                 >
//                                     <option value="savings">Savings</option>
//                                     <option value="current">Current</option>
//                                 </select>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Cuisines */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Cuisines</h4>
//                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                             {cuisineOptions.map(cuisine => (
//                                 <label key={cuisine} className="flex items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all">
//                                     <input
//                                         type="checkbox"
//                                         checked={formData.cuisines.includes(cuisine.toLowerCase())}
//                                         onChange={() => handleCuisineChange(cuisine.toLowerCase())}
//                                         className="h-5 w-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
//                                         disabled={applicationStatus}
//                                     />
//                                     <span className="ml-3 text-sm font-medium text-gray-700">{cuisine}</span>
//                                 </label>
//                             ))}
//                         </div>
//                     </div>

//                     {/* Operating Hours */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Operating Hours</h4>
//                         <div className="space-y-3">
//                             {formData.timings.hours.map((day: TimingHour, index: number) => (
//                                 <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-100 hover:border-orange-200 transition-all">
//                                     <div className="font-medium text-gray-900 w-32">{day.day}</div>
//                                     <div className="flex items-center gap-4">
//                                         <div className="flex flex-col">
//                                             <label className="text-xs font-medium text-gray-600 mb-1">Open</label>
//                                             <input
//                                                 type="time"
//                                                 value={day.open_time.replace(' am', '').replace(' pm', '')}
//                                                 onChange={(e) => handleTimeChange(day.day, 'open', e.target.value)}
//                                                 className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
//                                                 disabled={applicationStatus}
//                                             />
//                                         </div>
//                                         <div className="flex flex-col">
//                                             <label className="text-xs font-medium text-gray-600 mb-1">Close</label>
//                                             <input
//                                                 type="time"
//                                                 value={day.close_time.replace(' am', '').replace(' pm', '')}
//                                                 onChange={(e) => handleTimeChange(day.day, 'close', e.target.value)}
//                                                 className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
//                                                 disabled={applicationStatus}
//                                             />
//                                         </div>
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>

//                     {/* Delivery & Takeaway Timings */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Delivery & Takeaway Timings</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                             <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
//                                 <h3 className="font-medium text-blue-900 mb-4 text-lg">Delivery Timings</h3>
//                                 <div className="flex items-center gap-4">
//                                     <div className="flex flex-col flex-1">
//                                         <label className="text-xs font-medium text-blue-700 mb-1">Open</label>
//                                         <input
//                                             type="time"
//                                             value={formData.delivery_timings.open_time.replace(' am', '').replace(' pm', '')}
//                                             onChange={(e) => handleDeliveryTimeChange('open', e.target.value)}
//                                             className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
//                                             disabled={applicationStatus}
//                                         />
//                                     </div>
//                                     <div className="flex flex-col flex-1">
//                                         <label className="text-xs font-medium text-blue-700 mb-1">Close</label>
//                                         <input
//                                             type="time"
//                                             value={formData.delivery_timings.close_time.replace(' am', '').replace(' pm', '')}
//                                             onChange={(e) => handleDeliveryTimeChange('close', e.target.value)}
//                                             className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
//                                             disabled={applicationStatus}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
//                                 <h3 className="font-medium text-green-900 mb-4 text-lg">Takeaway Timings</h3>
//                                 <div className="flex items-center gap-4">
//                                     <div className="flex flex-col flex-1">
//                                         <label className="text-xs font-medium text-green-700 mb-1">Open</label>
//                                         <input
//                                             type="time"
//                                             value={formData.takeaway_timings.open_time.replace(' am', '').replace(' pm', '')}
//                                             onChange={(e) => handleTakeawayTimeChange('open', e.target.value)}
//                                             className="px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
//                                             disabled={applicationStatus}
//                                         />
//                                     </div>
//                                     <div className="flex flex-col flex-1">
//                                         <label className="text-xs font-medium text-green-700 mb-1">Close</label>
//                                         <input
//                                             type="time"
//                                             value={formData.takeaway_timings.close_time.replace(' am', '').replace(' pm', '')}
//                                             onChange={(e) => handleTakeawayTimeChange('close', e.target.value)}
//                                             className="px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
//                                             disabled={applicationStatus}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* File Uploads Section */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Documents & Images</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                             {renderFileInput("Logo (Image)", "logo_url", formData.logo_url, "image/*")}
//                             {renderFileInput("Background Image (Image)", "background_image_url", formData.background_image_url, "image/*")}
//                             {renderFileInput("PAN Card (PDF/Image)", "pan_card", formData.pan_card, ".pdf,image/*")}
//                             {renderFileInput("FSSAI License (PDF/Image)", "fssai_license", formData.fssai_license, ".pdf,image/*")}
//                             {renderFileInput("GST Certificate (PDF/Image)", "gst_certificate", formData.gst_certificate, ".pdf,image/*")}
//                         </div>
//                     </div>

                   
//                 </div>

//                 {/* Footer Actions */}
//                 <div className="flex justify-end gap-3 border-t pt-4 mt-4">
//                     <button
//                         onClick={onCancel}
//                         className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={onSave}

//                         disabled={applicationStatus}
//                         className={`px-4 py-2 rounded-lg text-white transition ${applicationStatus
//                             ? 'bg-gray-400 cursor-not-allowed'
//                             : 'bg-orange-500 hover:bg-orange-600'
//                             }`}
//                     >
//                         Save Changes
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }


// function DetailModal({
//     record,
//     onClose,
//     getFileUrl,
// }: {
//     record: OnboardingRecord;
//     onClose: () => void;
//     getFileUrl: (file: MediaFile | null) => string;
// }): JSX.Element {
//     const parseCuisines = (): string[] => {
//         try {
//             return JSON.parse(record.cuisines || '[]');
//         } catch {
//             return [];
//         }
//     };

//     const parseServices = (): string[] => {
//         try {
//             return JSON.parse(record.services || '[]');
//         } catch {
//             return [];
//         }
//     };

//     return (
//         <div className="fixed inset-0 bg-black/70 bg-opacity-50 overflow-y-auto h-full w-full z-50">
//             <div className="relative top-10 mx-auto p-5 border border-gray-300 w-full max-w-4xl shadow-lg rounded-lg bg-white mb-10">
//                 {/* Header */}
//                 <div className="flex justify-between items-center border-b pb-4 mb-4">
//                     <h3 className="text-2xl font-bold text-gray-900">{record.restaurant_name}</h3>
//                     <button
//                         onClick={onClose}
//                         className="text-gray-400 hover:text-gray-600 transition"
//                     >
//                         <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                     </button>
//                 </div>

//                 {/* Content - Same as Admin Modal */}
//                 <div className="max-h-[70vh] overflow-y-auto px-2">
//                     {/* Basic Info */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Owner Name</p>
//                                 <p className="text-sm text-gray-900">{record.fullname}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Email</p>
//                                 <p className="text-sm text-gray-900">{record.email}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Phone</p>
//                                 <p className="text-sm text-gray-900">{record.phone}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Restaurant Contact</p>
//                                 <p className="text-sm text-gray-900">{record.restaurant_primary_contact}</p>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Address */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Address</h4>
//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Building No</p>
//                                 <p className="text-sm text-gray-900">{record.buildingno}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Floor</p>
//                                 <p className="text-sm text-gray-900">{record.floor}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Area</p>
//                                 <p className="text-sm text-gray-900">{record.area}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">City</p>
//                                 <p className="text-sm text-gray-900">{record.city}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Landmark</p>
//                                 <p className="text-sm text-gray-900">{record.landmark}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Full Address</p>
//                                 <p className="text-sm text-gray-900">{record.address}</p>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Business Details */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Business Details</h4>
//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">PAN Number</p>
//                                 <p className="text-sm text-gray-900">{record.pan_number}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">PAN Name</p>
//                                 <p className="text-sm text-gray-900">{record.fullnameaspan}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">GST Registered</p>
//                                 <p className="text-sm text-gray-900">{record.gst ? 'Yes' : 'No'}</p>
//                             </div>
//                             {record.gst_number && (
//                                 <div>
//                                     <p className="text-sm font-medium text-gray-500">GST Number</p>
//                                     <p className="text-sm text-gray-900">{record.gst_number}</p>
//                                 </div>
//                             )}
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">FSSAI Number</p>
//                                 <p className="text-sm text-gray-900">{record.fssai_number}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">FSSAI Expiry</p>
//                                 <p className="text-sm text-gray-900">{record.fssai_expiry}</p>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Bank Details */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Bank Details</h4>
//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Account Number</p>
//                                 <p className="text-sm text-gray-900">{record.bank_accno}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">IFSC Code</p>
//                                 <p className="text-sm text-gray-900">{record.ifsc_code}</p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Account Type</p>
//                                 <p className="text-sm text-gray-900 capitalize">{record.account_type}</p>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Cuisines & Services */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Cuisines & Services</h4>
//                         <div className="mb-3">
//                             <p className="text-sm font-medium text-gray-500 mb-2">Cuisines</p>
//                             <div className="flex flex-wrap gap-2">
//                                 {parseCuisines().map((cuisine, idx) => (
//                                     <span
//                                         key={idx}
//                                         className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full capitalize"
//                                     >
//                                         {cuisine}
//                                     </span>
//                                 ))}
//                             </div>
//                         </div>
//                         <div>
//                             <p className="text-sm font-medium text-gray-500 mb-2">Services</p>
//                             <div className="flex flex-wrap gap-2">
//                                 {parseServices().map((service, idx) => (
//                                     <span
//                                         key={idx}
//                                         className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full capitalize"
//                                     >
//                                         {service.replace('_', ' ')}
//                                     </span>
//                                 ))}
//                             </div>
//                         </div>
//                     </div>

//                     {/* Timings */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Operating Hours</h4>
//                         <div className="space-y-2 mb-4">
//                             {record.timings.hours.map((timing, idx) => (
//                                 <div key={idx} className="flex justify-between text-sm">
//                                     <span className="font-medium text-gray-700">{timing.day}</span>
//                                     <span className="text-gray-600">
//                                         {timing.open_time} - {timing.close_time}
//                                     </span>
//                                 </div>
//                             ))}
//                         </div>
//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Delivery Hours</p>
//                                 <p className="text-sm text-gray-900">
//                                     {record.delivery_timings.open_time} - {record.delivery_timings.close_time}
//                                 </p>
//                             </div>
//                             <div>
//                                 <p className="text-sm font-medium text-gray-500">Takeaway Hours</p>
//                                 <p className="text-sm text-gray-900">
//                                     {record.takeaway_timings.open_time} - {record.takeaway_timings.close_time}
//                                 </p>
//                             </div>
//                         </div>
//                     </div>

                    

//                     {/* Documents */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Documents</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             {/* PAN Card */}
//                             {record.pan_card && (
//                                 <div className="border rounded-lg p-4">
//                                     <p className="text-sm font-medium text-gray-700 mb-2">PAN Card</p>
//                                     {record.pan_card.mime === 'application/pdf' ? (
//                                         <a
//                                             href={getFileUrl(record.pan_card)}
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
//                                         >
//                                             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
//                                             </svg>
//                                             <span className="text-sm">{record.pan_card.name}</span>
//                                         </a>
//                                     ) : (
//                                         <img
//                                             src={getFileUrl(record.pan_card)}
//                                             alt="PAN Card"
//                                             className="w-full h-32 object-cover rounded"
//                                         />
//                                     )}
//                                 </div>
//                             )}
//                             {/* FSSAI License */}
//                             {record.fssai_license && (
//                                 <div className="border rounded-lg p-4">
//                                     <p className="text-sm font-medium text-gray-700 mb-2">FSSAI License</p>
//                                     {record.fssai_license.mime === 'application/pdf' ? (
//                                         <a
//                                             href={getFileUrl(record.fssai_license)}
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
//                                         >
//                                             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
//                                             </svg>
//                                             <span className="text-sm">{record.fssai_license.name}</span>
//                                         </a>
//                                     ) : (
//                                         <img
//                                             src={getFileUrl(record.fssai_license)}
//                                             alt="FSSAI License"
//                                             className="w-full h-32 object-cover rounded"
//                                         />
//                                     )}
//                                 </div>
//                             )}
//                             {/* GST Certificate */}
//                             {record.gst_certificate && (
//                                 <div className="border rounded-lg p-4">
//                                     <p className="text-sm font-medium text-gray-700 mb-2">GST Certificate</p>
//                                     {record.gst_certificate.mime === 'application/pdf' ? (
//                                         <a
//                                             href={getFileUrl(record.gst_certificate)}
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
//                                         >
//                                             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
//                                             </svg>
//                                             <span className="text-sm">{record.gst_certificate.name}</span>
//                                         </a>
//                                     ) : (
//                                         <img
//                                             src={getFileUrl(record.gst_certificate)}
//                                             alt="GST Certificate"
//                                             className="w-full h-32 object-cover rounded"
//                                         />
//                                     )}
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Images */}
//                     <div className="mb-6">
//                         <h4 className="text-lg font-semibold text-gray-900 mb-3">Images</h4>
//                         <div className="grid grid-cols-2 gap-4">
//                             {record.logo_url && (
//                                 <div>
//                                     <p className="text-sm font-medium text-gray-500 mb-2">Logo</p>
//                                     <img
//                                         src={getFileUrl(record.logo_url)}
//                                         alt="Restaurant Logo"
//                                         className="w-full h-40 object-cover rounded-lg"
//                                     />
//                                 </div>
//                             )}
//                             {record.background_image_url && (
//                                 <div>
//                                     <p className="text-sm font-medium text-gray-500 mb-2">Background Image</p>
//                                     <img
//                                         src={getFileUrl(record.background_image_url)}
//                                         alt="Background"
//                                         className="w-full h-40 object-cover rounded-lg"
//                                     />
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </div>

//                 {/* Footer Actions - Removed Accept/Reject buttons */}
//                 <div className="flex justify-end gap-3 border-t pt-4 mt-4">
//                     <button
//                         onClick={onClose}
//                         className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
//                     >
//                         Close
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }



'use client';
import { useEffect, useState } from 'react';

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
    hours: {
        [key: string]: TimeSlot[];
    };
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
    // state: string;
    pincode: string;
    landmark: string;
    pan_number: string;
    fullnameaspan: string;
    address: string;
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

    useEffect(() => {
        if (user) {
            fetchRecord();
        }
    }, [user]);

    useEffect(() => {
        if (record) {
            initializeEditForm();
        }
    }, [record]);

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

    const fetchRecord = async () => {
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
    };

    const initializeEditForm = () => {
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
            // state: record.state || '',
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
                    // state: editFormData.state,
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

            // Upload files
            const fileUploadPromises = Object.entries(fileUploads)
                .filter(([_, file]) => file !== null)
                .map(async ([fieldName, file]) => {
                    if (file) {
                        const fileId = await uploadFileAndGetId(file, jwt);
                        payload.data[fieldName] = fileId;
                    }
                });

            await Promise.all(fileUploadPromises);

            // Mark files for deletion
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

            // Delete files from storage
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading your application...</p>
                </div>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
                <div className="bg-orange-50">
                    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">My Application</h1>
                        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                            Logout
                        </button>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto px-4 py-16">
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">No Application Found</h3>
                        <p className="text-gray-600 mb-8">You haven't submitted an onboarding application yet. Start your journey with us today!</p>
                        <button onClick={() => window.location.href = '/onboarding'} className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition font-semibold shadow-lg">
                            Start Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">My Application</h1>
                            <p className="text-sm text-gray-600">Manage your restaurant onboarding</p>
                        </div>
                        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Application Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Status Banner */}
                    <div className={`px-6 py-4 ${record.application_status ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-yellow-400 to-orange-400'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    {record.application_status ? (
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">
                                        {record.application_status ? 'Application Accepted' : 'Application Under Review'}
                                    </p>
                                    <p className="text-white/90 text-sm">
                                        {record.application_status ? 'Your restaurant is now active!' : 'We\'ll notify you once reviewed'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white/90 text-xs font-medium">Submitted on</p>
                                <p className="text-white font-bold">{formatDate(record.createdAt)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Restaurant Overview */}
                    <div className="p-6 border-b bg-gradient-to-br from-gray-50 to-white">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0">
                                {record.logo_url ? (
                                    <img src={getFileUrl(record.logo_url)} alt={record.restaurant_name} className="w-24 h-24 rounded-2xl object-cover shadow-lg ring-4 ring-white" />
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg ring-4 ring-white">
                                        <span className="text-white font-bold text-3xl">{record.restaurant_name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{record.restaurant_name}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="font-medium">{record.fullname}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span>{record.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>{record.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{record.city}, {record.pincode}</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-3">
                                    <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                                        {record.package} Plan
                                    </span>
                                    {JSON.parse(record.cuisines || '[]').slice(0, 2).map((cuisine: string, idx: number) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                                            {cuisine}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 bg-white flex gap-3">
                        <button onClick={() => setShowDetailModal(true)} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition font-medium shadow-lg flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Full Details
                        </button>
                        {!record.application_status && (
                            <button onClick={() => setIsEditing(true)} className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition font-medium shadow-lg flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Application
                            </button>
                        )}
                    </div>
                </div>

                {/* Info Message */}
                {!record.application_status && (
                    <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg shadow-sm">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm font-semibold text-blue-900 mb-1">Application Under Review</p>
                                <p className="text-sm text-blue-800">You can edit your application details until it's accepted. Once accepted, no changes can be made.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && record && (
                <DetailModal record={record} onClose={() => setShowDetailModal(false)} getFileUrl={getFileUrl} />
            )}

            {/* Edit Modal */}
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
                    <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                        {toast.type === 'success' ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="relative top-10 mx-auto p-6 border w-full max-w-5xl shadow-2xl rounded-2xl bg-white mb-10">
                {/* Header */}
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">{record.restaurant_name}</h3>
                        <p className="text-sm text-gray-500 mt-1">Complete Application Details</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto px-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Basic Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem label="Owner Name" value={record.fullname} />
                            <InfoItem label="Email" value={record.email} />
                            <InfoItem label="Phone" value={record.phone} />
                            <InfoItem label="Restaurant Contact" value={record.restaurant_primary_contact} />
                            <InfoItem label="Package" value={record.package} badge />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            Address Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem label="Building No" value={record.buildingno} />
                            <InfoItem label="Floor" value={record.floor || 'N/A'} />
                            <InfoItem label="Area" value={record.area} />
                            <InfoItem label="City" value={record.city} />
                            {/* <InfoItem label="State" value={record.state || 'N/A'} /> */}
                            <InfoItem label="Pincode" value={record.pincode} />
                            <InfoItem label="Landmark" value={record.landmark || 'N/A'} />
                            <div className="md:col-span-2">
                                <InfoItem label="Full Address" value={record.address} />
                            </div>
                        </div>
                    </div>

                    {/* Business Details */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Business Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem label="PAN Number" value={record.pan_number} />
                            <InfoItem label="PAN Name" value={record.fullnameaspan} />
                            <InfoItem label="GST Registered" value={record.gst ? 'Yes' : 'No'} />
                            {record.gst_number && <InfoItem label="GST Number" value={record.gst_number} />}
                            <InfoItem label="FSSAI Number" value={record.fssai_number} />
                            <InfoItem label="FSSAI Expiry" value={record.fssai_expiry} />
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Bank Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InfoItem label="Account Number" value={record.bank_accno} />
                            <InfoItem label="IFSC Code" value={record.ifsc_code} />
                            <InfoItem label="Account Type" value={record.account_type} capitalize />
                        </div>
                    </div>

                    {/* Cuisines & Services */}
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Cuisines & Services
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Cuisines</p>
                                <div className="flex flex-wrap gap-2">
                                    {parseCuisines().map((cuisine, idx) => (
                                        <span key={idx} className="px-4 py-2 bg-orange-100 text-orange-800 text-sm rounded-lg font-medium capitalize">
                                            {cuisine}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Services</p>
                                <div className="flex flex-wrap gap-2">
                                    {parseServices().map((service, idx) => (
                                        <span key={idx} className="px-4 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg font-medium capitalize">
                                            {service.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operating Hours */}
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Operating Hours
                        </h4>
                        <div className="space-y-3">
                            {Object.entries(record.timings.hours).map(([day, slots]: [string, any]) => (
                                <div key={day} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                                    <span className="font-semibold text-gray-800">{day}</span>
                                    <div className="flex gap-2">
                                        {slots.map((slot: TimeSlot, idx: number) => (
                                            <span key={idx} className="text-gray-600 text-sm bg-gray-100 px-3 py-1 rounded-full">
                                                {slot.open_time} - {slot.close_time}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {(record.delivery_timings?.hours || record.takeaway_timings?.hours) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {record.delivery_timings?.hours && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm font-semibold text-blue-900 mb-2">Delivery Hours</p>
                                        {Object.entries(record.delivery_timings.hours).map(([day, slots]: [string, any]) => (
                                            <div key={day} className="flex justify-between text-sm mb-1">
                                                <span className="text-blue-700">{day}</span>
                                                <span className="text-blue-600">{slots[0]?.open_time} - {slots[0]?.close_time}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {record.takeaway_timings?.hours && (
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <p className="text-sm font-semibold text-green-900 mb-2">Takeaway Hours</p>
                                        {Object.entries(record.takeaway_timings.hours).map(([day, slots]: [string, any]) => (
                                            <div key={day} className="flex justify-between text-sm mb-1">
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
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Documents
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {record.pan_card && <DocumentCard label="PAN Card" file={record.pan_card} getFileUrl={getFileUrl} />}
                            {record.fssai_license && <DocumentCard label="FSSAI License" file={record.fssai_license} getFileUrl={getFileUrl} />}
                            {record.gst_certificate && <DocumentCard label="GST Certificate" file={record.gst_certificate} getFileUrl={getFileUrl} />}
                        </div>
                    </div>

                    {/* Images */}
                    {(record.logo_url || record.background_image_url) && (
                        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Restaurant Images
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {record.logo_url && (
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-3">Logo</p>
                                        <img src={getFileUrl(record.logo_url)} alt="Restaurant Logo" className="w-full h-48 object-cover rounded-xl shadow-lg" />
                                    </div>
                                )}
                                {record.background_image_url && (
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-3">Background Image</p>
                                        <img src={getFileUrl(record.background_image_url)} alt="Background" className="w-full h-48 object-cover rounded-xl shadow-lg" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t pt-4 mt-6">
                    <button onClick={onClose} className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition font-medium shadow-lg">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Info Item Component
function InfoItem({ label, value, badge, capitalize }: { label: string; value: string; badge?: boolean; capitalize?: boolean }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
            {badge ? (
                <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold uppercase">
                    {value}
                </span>
            ) : (
                <p className={`text-sm text-gray-900 font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</p>
            )}
        </div>
    );
}

// Document Card Component
function DocumentCard({ label, file, getFileUrl }: { label: string; file: MediaFile; getFileUrl: (file: MediaFile | null) => string }) {
    const isPDF = file.mime === 'application/pdf';
    
    return (
        <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition bg-white">
            <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>
            {isPDF ? (
                <a href={getFileUrl(file)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-indigo-600 hover:text-indigo-700 bg-indigo-50 p-3 rounded-lg transition">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">Click to view</p>
                    </div>
                </a>
            ) : (
                <img src={getFileUrl(file)} alt={label} className="w-full h-32 object-cover rounded-lg shadow-md" />
            )}
        </div>
    );
}

// Edit Modal Component
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
            <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        accept={acceptTypes}
                        onChange={(e) => onFileChange(field, e.target.files?.[0] || null)}
                        className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-sm"
                    />
                    {hasFile && (
                        <button
                            type="button"
                            onClick={() => onDeleteFile(field)}
                            className="px-4 py-2.5 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition font-medium text-sm"
                        >
                            Remove
                        </button>
                    )}
                </div>
                {previewUrl && (
                    <div className="mt-3">
                        {previewUrl.includes('.pdf') ? (
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                View PDF
                            </a>
                        ) : (
                            <img src={previewUrl} alt={`${label} Preview`} className="h-32 object-contain border-2 border-gray-200 rounded-lg" />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border w-full max-w-5xl shadow-2xl rounded-2xl bg-white mb-10">
                {/* Header */}
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Edit Application</h3>
                        <p className="text-sm text-gray-500 mt-1">Update your restaurant information</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto px-2 space-y-6">
                    {/* Basic Info */}
                    <Section title="Basic Information" icon="info">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            />
                        </div>
                    </Section>

                    {/* Address */}
                    <Section title="Address Information" icon="location">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Building No *" value={formData.buildingno} onChange={(e) => onInputChange('buildingno', e.target.value)} />
                            <InputField label="Floor" value={formData.floor} onChange={(e) => onInputChange('floor', e.target.value)} />
                            <InputField label="Area *" value={formData.area} onChange={(e) => onInputChange('area', e.target.value)} />
                            <InputField label="City *" value={formData.city} onChange={(e) => onInputChange('city', e.target.value)} />
                            {/* <InputField label="State" value={formData.state} onChange={(e) => onInputChange('state', e.target.value)} /> */}
                            <InputField label="Pincode *" value={formData.pincode} onChange={(e) => onInputChange('pincode', e.target.value)} maxLength={6} />
                            <div className="md:col-span-2">
                                <InputField label="Landmark" value={formData.landmark} onChange={(e) => onInputChange('landmark', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <InputField label="Complete Address *" value={formData.address} onChange={(e) => onInputChange('address', e.target.value)} />
                            </div>
                        </div>
                    </Section>

                    {/* Business Info */}
                    <Section title="Business Information" icon="document">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="PAN Number *" value={formData.pan_number} onChange={(e) => onInputChange('pan_number', e.target.value.toUpperCase())} maxLength={10} />
                            <InputField label="Name as per PAN *" value={formData.fullnameaspan} onChange={(e) => onInputChange('fullnameaspan', e.target.value)} />
                            <InputField label="FSSAI Number *" value={formData.fssai_number} onChange={(e) => onInputChange('fssai_number', e.target.value)} />
                            <InputField label="FSSAI Expiry *" type="date" value={formData.fssai_expiry} onChange={(e) => onInputChange('fssai_expiry', e.target.value)} />
                            <div className="flex items-center md:col-span-2">
                                <label className="flex items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-orange-300 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.gst}
                                        onChange={(e) => onInputChange('gst', e.target.checked)}
                                        className="h-5 w-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <span className="ml-3 text-sm font-semibold text-gray-700">GST Registered</span>
                                </label>
                            </div>
                            {formData.gst && (
                                <div className="md:col-span-2">
                                    <InputField label="GST Number" value={formData.gst_number} onChange={(e) => onInputChange('gst_number', e.target.value.toUpperCase())} maxLength={15} />
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Bank Details */}
                    <Section title="Bank Details" icon="card">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="Account Number *" value={formData.bank_accno} onChange={(e) => onInputChange('bank_accno', e.target.value)} />
                            <InputField label="IFSC Code *" value={formData.ifsc_code} onChange={(e) => onInputChange('ifsc_code', e.target.value.toUpperCase())} maxLength={11} />
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Type *</label>
                                <select
                                    value={formData.account_type}
                                    onChange={(e) => onInputChange('account_type', e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                >
                                    <option value="savings">Savings</option>
                                    <option value="current">Current</option>
                                </select>
                            </div>
                        </div>
                    </Section>

                    {/* Cuisines */}
                    <Section title="Cuisines" icon="food">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {CUISINES.map((cuisine) => (
                                <label key={cuisine} className="flex items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-orange-300 transition">
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
                                        className="h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700">{cuisine}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Selected: {formData.cuisines.length}/3 (Maximum 3 cuisines)</p>
                    </Section>

                    {/* Operating Hours */}
                    <Section title="Restaurant Operating Hours" icon="clock">
                        <div className="space-y-3">
                            {DAYS.map((day) => {
                                const daySlots = formData.timings.hours[day] || [];
                                return (
                                    <div key={day} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h5 className="font-semibold text-gray-900">{day}</h5>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSlots = [...daySlots, { open_time: '9:00', close_time: '23:00' }];
                                                    onInputChange('timings', {
                                                        ...formData.timings,
                                                        hours: { ...formData.timings.hours, [day]: newSlots }
                                                    });
                                                }}
                                                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                                            >
                                                + Add Slot
                                            </button>
                                        </div>
                                        {daySlots.map((slot: TimeSlot, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 mb-2">
                                                <input
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
                                                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
                                                />
                                                <span className="text-gray-500">to</span>
                                                <input
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
                                                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
                                                />
                                                {daySlots.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSlots = daySlots.filter((_: any, i: number) => i !== idx);
                                                            onInputChange('timings', {
                                                                ...formData.timings,
                                                                hours: { ...formData.timings.hours, [day]: newSlots }
                                                            });
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {formData.delivery_timings?.hours && (
                                <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200">
                                    <h5 className="font-semibold text-blue-900 mb-3 text-lg">Delivery Timings</h5>
                                    {DAYS.map((day) => {
                                        const daySlots = formData.delivery_timings?.hours?.[day] || [];
                                        if (daySlots.length === 0) return null;
                                        return (
                                            <div key={day} className="mb-3">
                                                <p className="text-xs font-medium text-blue-700 mb-1">{day}</p>
                                                {daySlots.map((slot: TimeSlot, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
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
                                                            className="flex-1 px-2 py-1.5 border border-blue-300 rounded-lg text-sm bg-white"
                                                        />
                                                        <span className="text-blue-600 text-sm">to</span>
                                                        <input
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
                                                            className="flex-1 px-2 py-1.5 border border-blue-300 rounded-lg text-sm bg-white"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {formData.takeaway_timings?.hours && (
                                <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                                    <h5 className="font-semibold text-green-900 mb-3 text-lg">Takeaway Timings</h5>
                                    {DAYS.map((day) => {
                                        const daySlots = formData.takeaway_timings?.hours?.[day] || [];
                                        if (daySlots.length === 0) return null;
                                        return (
                                            <div key={day} className="mb-3">
                                                <p className="text-xs font-medium text-green-700 mb-1">{day}</p>
                                                {daySlots.map((slot: TimeSlot, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
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
                                                            className="flex-1 px-2 py-1.5 border border-green-300 rounded-lg text-sm bg-white"
                                                        />
                                                        <span className="text-green-600 text-sm">to</span>
                                                        <input
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
                                                            className="flex-1 px-2 py-1.5 border border-green-300 rounded-lg text-sm bg-white"
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
                            <p className="text-sm text-gray-500 text-center py-4">No delivery or takeaway timings configured</p>
                        )}
                    </Section>

                    {/* Documents & Images */}
                    <Section title="Documents & Images" icon="upload">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {renderFileInput("Restaurant Logo", "logo_url", formData.logo_url, "image/*")}
                            {renderFileInput("Background Image", "background_image_url", formData.background_image_url, "image/*")}
                            {renderFileInput("PAN Card", "pan_card", formData.pan_card, ".pdf,image/*")}
                            {renderFileInput("FSSAI License", "fssai_license", formData.fssai_license, ".pdf,image/*")}
                            {renderFileInput("GST Certificate", "gst_certificate", formData.gst_certificate, ".pdf,image/*")}
                        </div>
                    </Section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t pt-5 mt-6">
                    <button onClick={onCancel} className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium">
                        Cancel
                    </button>
                    <button onClick={onSave} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition font-medium shadow-lg">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

// Section Component
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    const icons: Record<string, JSX.Element> = {
        info: <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        location: <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>,
        document: <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        card: <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
        food: <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
        clock: <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        delivery: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
        upload: <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
    };

    return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                {icons[icon]}
                {title}
            </h4>
            {children}
        </div>
    );
}

// Input Field Component
function InputField({ label, type = 'text', value, onChange, placeholder, disabled, maxLength }: { label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; disabled?: boolean; maxLength?: number }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                className={`w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
        </div>
    );
}