




// Optional: Add specific metadata for the onboarding flow if needed
export const metadata = {
    title: 'Register Your Restaurant - marinate360',
    description: 'Get started with marinate360 - Register your restaurant',
};

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
       
            

                <div className="min-h-screen w-full bg-white">
                    {/* <Header /> */}
                    <div className='grow'>{children}</div>
                </div>
          
       
    );
}