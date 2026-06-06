export function getHomePathForRole(role: 'user' | 'admin') {
  return role === 'admin' ? '/admin' : '/dashboard';
}
