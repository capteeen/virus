import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-20 text-center">
      <div className="eyebrow">404</div>
      <h1 className="mt-2 text-4xl">no specimen here</h1>
      <Link href="/" className="btn mt-6">back to the field</Link>
    </div>
  );
}
