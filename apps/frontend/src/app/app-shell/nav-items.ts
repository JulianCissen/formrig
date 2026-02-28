/** Navigation destinations shared by the nav rail and bottom nav bar. */
export const navItems = [
  { icon: 'dashboard', label: 'Forms', route: '/', exact: true },
  { icon: 'add_circle', label: 'New', route: '/form/new', exact: false },
] as const;
