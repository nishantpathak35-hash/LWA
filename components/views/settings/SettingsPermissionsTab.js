import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';

export default function SettingsPermissionsTab({
  handleSavePermissions,
  roleKeys,
  roleLabels,
  featureLabels,
  localPerms,
  handleTogglePerm
}) {
  return (
    <Card className="bg-card border-border shadow-xs rounded-xl">
      <CardHeader className="flex items-center justify-between p-6 border-b border-border">
        <CardTitle className="text-amber-700 dark:text-gold font-bold text-sm uppercase tracking-wider">Feature Permissions Matrix</CardTitle>
        <Button size="sm" variant="primary" onClick={handleSavePermissions} className="text-xs">
          Save Changes
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table id="tblPermissions">
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-1/2 text-slate-600 dark:text-slate-400 text-[10px] uppercase">Feature</TableHead>
              {roleKeys.map(r => (
                <TableHead key={r} className="text-center text-slate-600 dark:text-slate-400 text-[10px] uppercase">{roleLabels[r]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(featureLabels).map(key => (
              <TableRow key={key} className="border-b border-border/80 hover:bg-muted/30">
                <TableCell className="font-semibold text-xs text-foreground py-3">{featureLabels[key]}</TableCell>
                {roleKeys.map(role => {
                  const isChecked = !!(localPerms[role] && localPerms[role].includes(key));
                  return (
                    <TableCell key={role} className="text-center py-3">
                      <input
                        type="checkbox"
                        id={`perm-${role}-${key}`}
                        className="w-4 h-4 rounded cursor-pointer accent-amber-600 dark:accent-amber-400"
                        checked={isChecked}
                        onChange={() => handleTogglePerm(role, key)}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
