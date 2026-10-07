import HostView from './HostView';

export default function HostPage({ params }: { params: { ca: string } }) {
  return <HostView ca={params.ca} />;
}
