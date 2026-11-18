import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { Shield, HardHat, ShoppingBag, Banknote, LayoutDashboard, CheckSquare, Square } from 'lucide-react';

export default function SettingsPermissionsTab({
  handleSavePermissions,
  roleKeys,
  roleLabels,
  featureLabels,
  localPerms,
  handleTogglePerm,
  handleToggleRoleAll
}) {
  const groups = useMemo(() => [
    {
      id: 'site_ops',
      title: 'Site Operations & Attendance',
      icon: HardHat,
      color: 'text-amber-500',
      badge: 'Operations',
      keys: ['site_employees', 'site_attendance', 'site_geofence', 'approve_attendance', 'goods_receipt']
    },
    {
      id: 'procurement',
      title: 'Procurement & Purchase Orders',
      icon: ShoppingBag,
      color: 'text-blue-500',
      badge: 'Procurement',
      keys: ['purchase_orders', 'create_po', 'approve_po', 'vendors']
    },
    {
      id: 'finance',
      title: 'Finance, Payments & Budgets',
      icon: Banknote,
      color: 'text-emerald-500',
      badge: 'Finance',
      keys: ['payments', 'create_payment', 'approve_payment', 'reject_payment', 'budgets', 'export_data', 'view_analytics']
    },
    {
      id: 'core',
      title: 'Core System & Administration',
      icon: LayoutDashboard,
      color: 'text-violet-500',
      badge: 'Administration',
      keys: ['dashboard', 'projects', 'documents', 'reports', 'notifications', 'settings', 'manage_users', 'manage_settings']
    }
  ], []);

  // Collect keys from groups to find any remaining unclassified features
  const groupedKeys = useMemo(() => {
    const s = new Set();
    groups.forEach(g => g.keys.forEach(k => s.add(k)));
    return s;
  }, [groups]);

  const allFeatureKeys = Object.keys(featureLabels);
  const remainingKeys = allFeatureKeys.filter(k => !groupedKeys.has(k));

  return (
    <Card className="bg-card border-border shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-border bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Shield className="w-4 h-4" />
            </span>
            <CardTitle className="text-amber-700 dark:text-primary font-bold text-sm uppercase tracking-wider">
              Department &amp; Feature Permissions Matrix
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure granular access permissions for Operations, Procurement, Finance, Accountant and Directors
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={handleSavePermissions} className="text-xs font-bold shrink-0">
          Save Changes
        </Button>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <Table id="tblPermissions" className="min-w-[700px]">
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
              <TableHead className="w-2/5 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase py-3.5 pl-6">
                Module &amp; Feature Capabilities
              </TableHead>
              {roleKeys.map(r => {
                const isOps = r === 'operations';
                const allKeysCount = allFeatureKeys.length;
                const assignedCount = (localPerms[r] || []).length;
                const isAllSelected = assignedCount === allKeysCount && allKeysCount > 0;

                return (
                  <TableHead key={r} className="text-center py-3.5 px-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        isOps ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {roleLabels[r] || r}
                      </span>
                      {handleToggleRoleAll && (
                        <button
                          type="button"
                          onClick={() => handleToggleRoleAll(r, !isAllSelected)}
                          title={isAllSelected ? `Revoke all for ${roleLabels[r]}` : `Grant all to ${roleLabels[r]}`}
                          className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer underline"
                        >
                          {isAllSelected ? 'Clear All' : 'Select All'}
                        </button>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {groups.map(grp => {
              const GroupIcon = grp.icon;
              const featuresInGroup = grp.keys.filter(k => featureLabels[k]);
              if (featuresInGroup.length === 0) return null;

              return (
                <React.Fragment key={grp.id}>
                  {/* Category Section Header Row */}
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-y border-border">
                    <TableCell colSpan={roleKeys.length + 1} className="py-2.5 px-6">
                      <div className="flex items-center gap-2">
                        <GroupIcon className={`w-3.5 h-3.5 ${grp.color}`} />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                          {grp.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium ml-1">
                          {featuresInGroup.length} permissions
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Feature Rows */}
                  {featuresInGroup.map(key => (
                    <TableRow key={key} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-xs text-foreground py-3 pl-8">
                        {featureLabels[key]}
                      </TableCell>
                      {roleKeys.map(role => {
                        const isChecked = !!(localPerms[role] && localPerms[role].includes(key));
                        const isOps = role === 'operations';

                        return (
                          <TableCell key={role} className={`text-center py-3 ${isOps ? 'bg-amber-500/5' : ''}`}>
                            <input
                              type="checkbox"
                              id={`perm-${role}-${key}`}
                              aria-label={`${roleLabels[role] || role} - ${featureLabels[key]}`}
                              className="w-4 h-4 rounded cursor-pointer accent-amber-600 dark:accent-amber-400 transition-all hover:scale-110"
                              checked={isChecked}
                              onChange={() => handleTogglePerm(role, key)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Remaining Features if any */}
            {remainingKeys.length > 0 && (
              <React.Fragment>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-y border-border">
                  <TableCell colSpan={roleKeys.length + 1} className="py-2.5 px-6">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Additional Permissions
                    </span>
                  </TableCell>
                </TableRow>
                {remainingKeys.map(key => (
                  <TableRow key={key} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-xs text-foreground py-3 pl-8">
                      {featureLabels[key]}
                    </TableCell>
                    {roleKeys.map(role => {
                      const isChecked = !!(localPerms[role] && localPerms[role].includes(key));
                      return (
                        <TableCell key={role} className="text-center py-3">
                          <input
                            type="checkbox"
                            id={`perm-${role}-${key}`}
                            aria-label={`${roleLabels[role] || role} - ${featureLabels[key]}`}
                            className="w-4 h-4 rounded cursor-pointer accent-amber-600 dark:accent-amber-400"
                            checked={isChecked}
                            onChange={() => handleTogglePerm(role, key)}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
