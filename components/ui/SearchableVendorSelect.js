import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building } from 'lucide-react';
import { cn } from '../../app/lib/utils';

export default function SearchableVendorSelect({
  vendors = [],
  value = '',
  onChange,
  getValue,
  placeholder = 'Type to search vendor...',
  disabled = false,
  className = '',
  id,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find currently selected vendor object
  const selectedVendor = useMemo(() => {
    if (!value || !Array.isArray(vendors)) return null;
    if (typeof getValue === 'function') {
      const found = vendors.find((v, idx) => getValue(v, idx) === value);
      if (found) return found;
    }
    const vStr = String(value).trim().toLowerCase();
    return vendors.find(v => {
      const code = String(v.code || v.vendor_code || v.vendorId || '').trim().toLowerCase();
      const idStr = String(v.recordId || v.id || v.vendor_id || '').trim().toLowerCase();
      const name = String(v.name || v.legal_name || v.legalName || '').trim().toLowerCase();
      return code === vStr || idStr === vStr || name === vStr || `id:${idStr}` === vStr;
    }) || null;
  }, [value, vendors, getValue]);

  // Filter vendors based on typed search query
  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    const q = search.trim().toLowerCase();
    if (!q) return vendors;

    return vendors.filter(v => {
      const name = String(v.name || v.legal_name || v.legalName || '').toLowerCase();
      const trade = String(v.trade_name || v.tradeName || '').toLowerCase();
      const code = String(v.code || v.vendor_code || v.vendorId || '').toLowerCase();
      return name.includes(q) || trade.includes(q) || code.includes(q);
    });
  }, [vendors, search]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (vendor, idx) => {
    const val = typeof getValue === 'function' 
      ? getValue(vendor, idx) 
      : (vendor.code || vendor.vendor_code || vendor.vendorId || vendor.name);
    onChange?.(val, vendor);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('', null);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border border-border bg-background transition-all text-left select-none cursor-pointer min-h-[38px]",
          disabled && "opacity-60 cursor-not-allowed bg-muted/30",
          isOpen && "border-primary ring-2 ring-primary/20",
          !disabled && !isOpen && "hover:border-border/80 focus:border-primary focus:outline-none"
        )}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {selectedVendor ? (
            <span className="truncate font-semibold text-foreground">
              {selectedVendor.name || selectedVendor.legal_name || selectedVendor.code}
              {(selectedVendor.code || selectedVendor.vendor_code) && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground font-normal">
                  ({selectedVendor.code || selectedVendor.vendor_code})
                </span>
              )}
            </span>
          ) : value ? (
            <span className="truncate font-semibold text-foreground">
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(selectedVendor || value) && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-card border border-border/80 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col max-h-[320px]">
          {/* Search Input Box */}
          <div className="p-2 border-b border-border/60 bg-muted/30 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type vendor name or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 px-1 font-medium">
              <span>Type any letters to filter</span>
              <span>{filteredVendors.length} of {vendors.length} vendors</span>
            </div>
          </div>

          {/* Vendors List */}
          <div className="overflow-y-auto overflow-x-hidden flex-1 p-1 max-h-[240px]">
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor, idx) => {
                const vendorVal = typeof getValue === 'function' 
                  ? getValue(vendor, idx) 
                  : (vendor.code || vendor.vendor_code || vendor.vendorId || vendor.name);
                const isSelected = selectedVendor ? (
                  typeof getValue === 'function' 
                    ? getValue(selectedVendor, 0) === vendorVal
                    : String(selectedVendor.code || selectedVendor.vendor_code || selectedVendor.name).toLowerCase() === String(vendorVal).toLowerCase()
                ) : (value && String(value).toLowerCase() === String(vendorVal).toLowerCase());
                const initials = (vendor.name || vendor.legal_name || 'V').substring(0, 2).toUpperCase();

                return (
                  <button
                    key={vendor.recordId || vendor.id || vendor.code || idx}
                    type="button"
                    onClick={() => handleSelect(vendor, idx)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg transition-colors text-left cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted/60 text-foreground font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-amber-700 dark:text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0">
                        {initials}
                      </span>
                      <div className="truncate">
                        <span className="block truncate text-xs text-foreground font-semibold">
                          {vendor.name || vendor.legal_name}
                        </span>
                        {(vendor.code || vendor.vendor_code || vendor.trade_name) && (
                          <span className="block text-[10px] text-muted-foreground font-mono truncate">
                            {vendor.code || vendor.vendor_code} {vendor.trade_name ? '· ' + vendor.trade_name : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">No vendors match &quot;{search}&quot;</p>
                <p className="text-[11px] mt-0.5">Check spelling or try vendor code</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
