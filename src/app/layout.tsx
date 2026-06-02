// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";


// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body
        
//       >
//         {children}
//       </body>
//     </html>
//   );
// }




import './globals.css';

export const metadata = {
  title: 'Partner with Us - marinate360',
  description: 'Partner with us and grow your business',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          {/* <Header /> */}
          <div className="grow">{children}</div>
          {/* <Footer /> */}
        </div>
      </body>
    </html>
  );
}





