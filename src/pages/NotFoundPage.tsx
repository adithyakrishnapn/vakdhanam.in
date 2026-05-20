import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <Card className="w-full p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">404</p>
        <h1 className="mt-3 text-4xl font-bold">This promise is not in the feed.</h1>
        <p className="mt-3 text-white/65">Loading promises politicians forgot... please go back to the main feed.</p>
        <Button className="mt-6" onClick={() => navigate('/')}>Go home</Button>
      </Card>
    </div>
  );
}
