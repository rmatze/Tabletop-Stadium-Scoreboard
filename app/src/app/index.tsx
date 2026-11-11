import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useBoard } from '@/lib/board';

export default function Index() {
  const { ready, board } = useBoard();
  if (!ready) return <Loading />;
  return <Redirect href={board ? '/board' : '/connect'} />;
}
