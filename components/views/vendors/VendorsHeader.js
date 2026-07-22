'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input } from '../../ui/core';
import { PlusCircle, Search, Eye, Edit2, CreditCard } from 'lucide-react';
import { Users } from 'lucide-react';

export default function VendorsHeader({ canOnboard, handleOpenModal, filteredVendors, searchQuery, setSearchQuery, handleOpenViewModal, handleOpenEditModal, setActiveView, hasMoreVendors, loadMoreVendors }) {
  const [loadingMore, setLoadingMore] = React.useState(false);
  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMoreVendors();
    setLoadingMore(false);
  };

  return (
    <>
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Vendors</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Manage onboarded vendor files and profiles.</p>
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
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-6">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">REGISTERED VENDORS ({filteredVendors.length})</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs py-1.5 h-8 bg-card"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm font-medium">
              No vendors found matching your filters.
            </div>
          ) : (
            <>
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
                      <TableCell className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">{v.code}</TableCell>
                      <TableCell className="font-bold text-foreground text-sm">{v.name}</TableCell>
                      <TableCell className="text-muted-foreground font-medium text-sm">{v.legalName || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground font-medium">{v.gstin || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={String(v.status || '').toLowerCase() === 'active' ? 'success' : 'inactive'}>
                          {v.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center flex justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenViewModal(v)} title="View Vendor Details">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          View
                        </Button>
                        {canOnboard && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(v)} title="Edit Vendor">
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            Edit
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setActiveView('payments')} title="Request Payment">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                          Request
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMoreVendors && (
                <div className="flex justify-center p-4 border-t border-border bg-muted/20">
                  <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="text-muted-foreground hover:text-foreground font-medium">
                    {loadingMore ? 'Loading...' : 'Load More Vendors'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
