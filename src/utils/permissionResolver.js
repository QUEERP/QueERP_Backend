module.exports = (membership) => {
  const rolePermissions = membership.role.rolePermissions.map(
    (rp) => `${rp.permission.module}.${rp.permission.action}`
  );

  const userPermissions = membership.userPermissions.map(
    (up) => `${up.permission.module}.${up.permission.action}`
  );

  return new Set([...rolePermissions, ...userPermissions]);
};
