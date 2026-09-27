import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'BiblioTech Health — All your priors. One intelligence.',description:'A synthetic demonstration of patient-owned, evidence-grounded health context.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;}
