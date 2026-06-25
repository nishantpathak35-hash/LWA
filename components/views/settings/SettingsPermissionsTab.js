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
    <Card className="bg-slate-950/40 border-slate-900">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-gold font-medium">Feature Permissions Matrix</CardTitle>
        <Button size="sm" variant="primary" onClick={handleSavePermissions}>
          Save Changes
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table id="tblPermissions">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Feature</TableHead>
              {roleKeys.map(r => (
                <TableHead key={r} className="text-center">{roleLabels[r]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(featureLabels).map(key => (
              <TableRow key={key}>
                <TableCell className="font-semibold text-slate-200">{featureLabels[key]}</TableCell>
                {roleKeys.map(role => {
                  // Controlled checkbox — reads from and writes to React state, not the DOM
                  const isChecked = !!(localPerms[role] && localPerms[role].includes(key));
                  return (
                    <TableCell key={role} className="text-center">
                      <input
                        type="checkbox"
                        id={`perm-${role}-${key}`}
                        className="w-4 h-4 rounded cursor-pointer accent-amber-400"
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
