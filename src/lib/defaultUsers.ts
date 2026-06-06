import { UserSession } from '@/types/trading';

export interface SeedUser extends UserSession {
  id: string;
  email: string;
  phone: string;
  password: string;
  active: boolean;
  balance: number;
}

export const DEFAULT_ADMIN: SeedUser = {
  id: '0',
  username: 'admin',
  role: 'admin',
  email: 'admin@bitvesty.local',
  phone: '0000000000',
  password: 'admin123',
  active: true,
  balance: 25000,
};

export const DEFAULT_DEMO_USER: SeedUser = {
  id: '1',
  username: 'user',
  role: 'user',
  email: 'user@bitvesty.local',
  phone: '0000000001',
  password: 'user123',
  active: true,
  balance: 10000,
};

export function seedDefaultUsers(stored: SeedUser[]): SeedUser[] {
  const users = [...stored];

  const upsertByUsername = (defaults: SeedUser) => {
    const index = users.findIndex((u) => u.username === defaults.username);
    if (index === -1) {
      users.push({ ...defaults });
      return;
    }
    users[index] = { ...users[index], ...defaults, id: users[index].id };
  };

  upsertByUsername(DEFAULT_ADMIN);
  upsertByUsername(DEFAULT_DEMO_USER);

  return users.sort((a, b) => {
    if (a.role === 'admin') return -1;
    if (b.role === 'admin') return 1;
    return a.username.localeCompare(b.username);
  });
}
