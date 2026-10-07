import StrainView from './StrainView';

export default function StrainPage({ params }: { params: { ca: string } }) {
  return <StrainView ca={params.ca} />;
}
