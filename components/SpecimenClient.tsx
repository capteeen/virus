'use client';
import dynamic from 'next/dynamic';
const Specimen = dynamic(() => import('./Specimen'), { ssr: false, loading: () => <div className="h-full w-full bg-void" /> });
export default Specimen;
