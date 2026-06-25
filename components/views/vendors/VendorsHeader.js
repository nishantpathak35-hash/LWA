'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input } from '../../ui/core';
import { PlusCircle, Search, Eye, Edit2, CreditCard } from 'lucide-react';
import { Users } from 'lucide-react';

export default function VendorsHeader({ canOnboard, handleOpenModal, filteredVendors, searchQuery, setSearchQuery, handleOpenViewModal, handleOpenEditModal, setActiveView }) {
  return (
    <>
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 text-gold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-light text-slate-100 font-serif">Vendors</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Manage onboarded vendor files and profiles.</p>
          </div>
        </div>

        {canOnboard && (
          <Button variant="primary" size="sm" onClick={handleOpenModal}>
            <PlusCircle className="w-4 h-4" />
            Onboard Vendor
          </Button>
        )}
      </div>

      {/* Search and Table Grid */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4">
          <CardTitle className="text-sm font-semibold text-slate-400">REGISTERED VENDORS ({filteredVendors.length})</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-light">
              No vendors found matching your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Legal Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((v, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-slate-200">{v.code}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell className="text-slate-400">{v.legalName || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{v.gstin || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={String(v.status || '').toLowerCase() === 'active' ? 'success' : 'inactive'}>
                        {v.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center flex justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenViewModal(v)} title="View Vendor Details">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                      {canOnboard && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(v)} title="Edit Vendor">
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setActiveView('payments')} title="Request Payment">
                        <CreditCard className="w-3.5 h-3.5" />
                        Request
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
