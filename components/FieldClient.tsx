'use client';
import dynamic from 'next/dynamic';
const Field = dynamic(() => import('./Field'), { ssr: false, loading: () => <div className="h-full w-full bg-void" /> });
export default Field;
