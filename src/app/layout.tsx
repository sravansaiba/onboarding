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
import { Inter } from 'next/font/google';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Manrope } from "next/font/google"; 


// const inter = Inter({ subsets: ['latin'] });
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

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
      <body className={manrope.className}>
        <div className="min-h-screen flex flex-col">
          {/* <Header /> */}
          <div className="grow">{children}</div>
          {/* <Footer /> */}
        </div>
      </body>
    </html>
  );
}






