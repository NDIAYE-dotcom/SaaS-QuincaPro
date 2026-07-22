export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  comptable: 'Comptable',
  caissier: 'Caissier',
  magasinier: 'Magasinier',
  vendeur: 'Vendeur',
  responsable_stock: 'Responsable Stock',
  consultation: 'Consultation seule',
};

export function getRoleLabels(t) {
  return {
    super_admin: t('team.roleSuperAdmin'),
    admin: t('team.roleAdmin'),
    comptable: t('team.roleAccountant'),
    caissier: t('team.roleCashier'),
    magasinier: t('team.roleWarehouseKeeper'),
    vendeur: t('team.roleSalesperson'),
    responsable_stock: t('team.roleStockManager'),
    consultation: t('team.roleReadOnly'),
  };
}

export const INVITABLE_ROLES = [
  'admin',
  'comptable',
  'caissier',
  'magasinier',
  'vendeur',
  'responsable_stock',
  'consultation',
];
