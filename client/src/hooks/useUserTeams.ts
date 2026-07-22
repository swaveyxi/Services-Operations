import { useEffect, useState } from 'react';
import { fetchMyTeams, type Team } from '@/services/teams';

export function useUserTeams(): Team[] {
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    fetchMyTeams().then(setTeams).catch(() => setTeams([]));
  }, []);
  return teams;
}
