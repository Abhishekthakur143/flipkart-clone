// Role -> uska panel. Login ke baad aur Navbar ke menu me yahi use hota hai.
export const PANELS = {
  superadmin: { path: '/superadmin', label: 'Super Admin Panel' },
  admin: { path: '/admin', label: 'Admin Panel' },
  manager: { path: '/manager', label: 'Manager Panel' },
  seller: { path: '/seller', label: 'Seller Panel' },
};

export const panelPath = (role) => PANELS[role]?.path || '/';
