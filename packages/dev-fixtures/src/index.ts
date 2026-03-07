export interface MockUser {
  id: string;
  claims: Record<string, unknown>;
}

export const MOCK_USERS: MockUser[] = [
  { id: 'alice', claims: { name: 'Alice Dev', email: 'alice@example.dev', roles: ['admin'] } },
  { id: 'bob',   claims: { name: 'Bob Dev',   email: 'bob@example.dev',   roles: ['editor'] } },
  { id: 'charlie', claims: { name: 'Charlie Dev', email: 'charlie@example.dev', roles: ['viewer'] } },
];
