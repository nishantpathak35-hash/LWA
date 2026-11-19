/**
 * Standard Indian Interior Fit-Out Master Category & Subcategory Library
 * 17 Standard Main Categories and comprehensive subcategories.
 */

export const STANDARD_FITOUT_CATEGORIES = [
  {
    code: 'CIV',
    name: 'Civil & Demolition Works',
    sort_order: 10,
    subcategories: [
      'Site preparation', 'Mobilisation', 'Dismantling', 'Demolition', 'Wall breaking',
      'Floor breaking', 'Core cutting', 'Chiselling', 'Brick masonry', 'AAC block masonry',
      'PCC', 'RCC', 'Floor screeding', 'Plastering', 'Levelling',
      'Civil modifications', 'Kerbs', 'Ramps', 'Waterproofing', 'Grouting',
      'Floor protection', 'Debris removal', 'Structural repairs', 'Material shifting'
    ]
  },
  {
    code: 'CLG',
    name: 'False Ceiling & Partition',
    sort_order: 20,
    subcategories: [
      'Gypsum board ceiling', 'Moisture-resistant gypsum ceiling', 'Fire-rated gypsum ceiling',
      'Armstrong/mineral fibre grid ceiling', 'Metal ceiling', 'Aluminium ceiling', 'Wooden ceiling',
      'Baffle ceiling', 'Open-cell ceiling', 'POP ceiling', 'PVC ceiling',
      'Acoustic ceiling', 'Stretch ceiling', 'Cement board ceiling', 'Bulkhead',
      'Cove', 'Ceiling access panel', 'Single-layer gypsum partition', 'Double-layer gypsum partition',
      'Fire-rated partition', 'Acoustic partition', 'Cement board partition', 'Calcium silicate partition',
      'Aluminium partition', 'Modular partition', 'Demountable partition', 'Movable partition',
      'Partition insulation'
    ]
  },
  {
    code: 'FLR',
    name: 'Flooring & Tiling',
    sort_order: 30,
    subcategories: [
      'Vitrified tiles', 'Ceramic tiles', 'Porcelain tiles', 'Marble', 'Granite',
      'Natural stone', 'Wooden flooring', 'Engineered wood', 'Laminate flooring', 'SPC flooring',
      'LVT flooring', 'Vinyl flooring', 'Carpet tiles', 'Broadloom carpet', 'Epoxy flooring',
      'PU flooring', 'Raised access flooring', 'Antistatic flooring', 'IPS flooring', 'Terrazzo',
      'Floor levelling', 'Skirting', 'Tile adhesive', 'Tile grouting', 'Floor polishing', 'Floor profiles'
    ]
  },
  {
    code: 'CAR',
    name: 'Carpentry & Joinery',
    sort_order: 40,
    subcategories: [
      'Plywood work', 'MDF work', 'HDHMR work', 'Blockboard work', 'WPC work',
      'Laminate work', 'Veneer work', 'PU finishing', 'Melamine finishing', 'Wood polishing',
      'Wall panelling', 'Fluted panelling', 'Wooden partitions', 'Built-in cabinets', 'Fixed storage',
      'Reception counters', 'Fixed display units', 'Fixed pantry cabinetry', 'Wardrobe joinery',
      'Decorative woodworking', 'CNC cutting', 'Edge banding', 'Cabinetry accessories'
    ]
  },
  {
    code: 'GLA',
    name: 'Glass & Glazing Works',
    sort_order: 50,
    subcategories: [
      'Toughened glass', 'Laminated glass', 'Clear glass', 'Frosted glass', 'Tinted glass',
      'Double glazing', 'Acoustic glass', 'Fire-rated glass', 'Glass partition', 'Glass door',
      'Fixed glass panels', 'Glass film', 'Mirrors', 'Decorative mirrors', 'Back-painted glass',
      'Switchable glass', 'Structural glazing', 'Patch fittings', 'Glass hardware', 'Silicone sealing'
    ]
  },
  {
    code: 'PNT',
    name: 'Painting & Wall Finishing',
    sort_order: 60,
    subcategories: [
      'Wall putty', 'Primer', 'Interior emulsion', 'Exterior emulsion', 'Enamel paint',
      'Epoxy paint', 'PU paint', 'Textured paint', 'Microcement', 'Wallpaper',
      'Vinyl wall covering', 'Wall fabric', 'Decorative paint', 'Wall moulding', 'Wall cladding',
      'Stone cladding', 'Tile cladding', 'PVC wall panels', 'WPC wall panels', 'Laminate wall finish',
      'Veneer wall finish', 'Wall sanding', 'Wall preparation', 'Protective coating'
    ]
  },
  {
    code: 'ELE',
    name: 'Electrical & Lighting',
    sort_order: 70,
    subcategories: [
      'Conduiting', 'Wiring', 'Power cabling', 'Cable trays', 'Trunking',
      'Floor raceways', 'Modular switches', 'Sockets', 'Power points', 'DBs',
      'MCB/MCCB', 'Electrical panels', 'Earthing', 'Electrical containment', 'Cable termination',
      'LED panel lights', 'Downlights', 'COB lights', 'Spotlights', 'Track lighting',
      'Linear lighting', 'Strip lighting', 'Profile lighting', 'Pendant lighting', 'Decorative lighting',
      'Cove lighting', 'Emergency lighting', 'Exit lighting', 'Lighting controls', 'Sensors',
      'UPS electrical connections', 'Testing'
    ]
  },
  {
    code: 'HVC',
    name: 'HVAC Works',
    sort_order: 80,
    subcategories: [
      'Split AC', 'Cassette AC', 'Ductable AC', 'VRF/VRV', 'AHU',
      'FCU', 'GI ducting', 'Flexible ducting', 'Duct insulation', 'Thermal insulation',
      'Grilles', 'Diffusers', 'Dampers', 'VCD', 'VAV',
      'Refrigerant piping', 'Drain piping', 'Ventilation', 'Fresh air systems', 'Exhaust systems',
      'HVAC controls', 'HVAC accessories', 'Testing and commissioning'
    ]
  },
  {
    code: 'PLM',
    name: 'Plumbing & Sanitary',
    sort_order: 90,
    subcategories: [
      'CPVC piping', 'UPVC piping', 'PPR piping', 'GI piping', 'Water supply systems',
      'Drainage systems', 'Fittings', 'Valves', 'Wash basins', 'Toilets',
      'Urinals', 'Faucets', 'Health faucets', 'Shower fittings', 'Floor drains',
      'Floor traps', 'Toilet cubicles', 'Vanity counters', 'Mirrors', 'Plumbing accessories',
      'Pantry sinks', 'Kitchen plumbing', 'Pumps', 'Water heaters', 'Sanitary installations'
    ]
  },
  {
    code: 'FRF',
    name: 'Fire Fighting & Safety',
    sort_order: 100,
    subcategories: [
      'Sprinklers', 'Hydrants', 'Fire pipes', 'Fire extinguishers', 'Hose reels',
      'Fire valves', 'Fire pumps', 'Smoke detectors', 'Heat detectors', 'Fire alarm panels',
      'Manual call points', 'Hooters', 'Fire alarm cabling', 'Emergency exit systems', 'Fire suppression',
      'Firestop sealing', 'Fire safety signage', 'Testing and commissioning'
    ]
  },
  {
    code: 'DWH',
    name: 'Doors, Windows & Hardware',
    sort_order: 110,
    subcategories: [
      'Flush doors', 'Laminate doors', 'Veneer doors', 'Solid wood doors', 'Aluminium doors',
      'Glass doors', 'Fire-rated doors', 'Acoustic doors', 'Metal doors', 'Sliding doors',
      'Automatic doors', 'Door frames', 'Wooden windows', 'Aluminium windows', 'Window frames',
      'Hinges', 'Locks', 'Handles', 'Door closers', 'Panic bars',
      'Mortise locks', 'Access door hardware'
    ]
  },
  {
    code: 'MET',
    name: 'Metal & SS Fabrication',
    sort_order: 120,
    subcategories: [
      'MS framework', 'MS partitions', 'SS fabrication', 'SS railings', 'Metal cladding',
      'Metal screens', 'Laser-cut metal panels', 'Powder-coated fabrication', 'Aluminium fabrication', 'Metal supports',
      'Metal brackets', 'Custom metal furniture frames', 'Structural fabrication', 'Decorative metalwork'
    ]
  },
  {
    code: 'FUR',
    name: 'Modular & Loose Furniture',
    sort_order: 130,
    subcategories: [
      'Modular workstations', 'Linear workstations', 'Cluster workstations', 'Executive desks', 'Manager desks',
      'Conference tables', 'Meeting tables', 'Modular storage', 'Pedestals', 'Filing cabinets',
      'Ergonomic chairs', 'Executive chairs', 'Visitor chairs', 'Sofas', 'Lounge furniture',
      'Cafeteria furniture', 'Stools', 'Loose tables', 'Custom furniture', 'Upholstered furniture'
    ]
  },
  {
    code: 'ELV',
    name: 'IT, ELV, Security & Automation',
    sort_order: 140,
    subcategories: [
      'CAT6 cabling', 'CAT6A cabling', 'Fibre optic cabling', 'Data points', 'Network racks',
      'Network switches', 'Routers', 'Wi-Fi systems', 'CCTV', 'NVR/DVR',
      'Biometric attendance', 'Access control', 'Magnetic locks', 'PA systems', 'Background music systems',
      'AV systems', 'Projectors', 'LED displays', 'Video conferencing', 'BMS',
      'Lighting automation', 'Sensors', 'Smart controls', 'Integrated security'
    ]
  },
  {
    code: 'SGN',
    name: 'Signage & Branding',
    sort_order: 150,
    subcategories: [
      'Acrylic signage', 'Metal signage', 'LED signage', '3D letters', 'Reception logos',
      'Directional signage', 'Wayfinding', 'Safety signage', 'Vinyl graphics', 'Wall graphics',
      'Frosted films', 'Window branding', 'Illuminated signs', 'Digital signage', 'Custom branding installations'
    ]
  },
  {
    code: 'SFT',
    name: 'Soft Furnishings & Acoustics',
    sort_order: 160,
    subcategories: [
      'Roller blinds', 'Venetian blinds', 'Curtains', 'Motorised blinds', 'Fabric upholstery',
      'Acoustic wall panels', 'Fabric-wrapped panels', 'PET felt panels', 'Acoustic ceiling panels', 'Acoustic baffles',
      'Sound insulation', 'Rugs', 'Decorative furnishings', 'Acoustic treatments'
    ]
  },
  {
    code: 'MSC',
    name: 'Specialised & Miscellaneous Works',
    sort_order: 170,
    subcategories: [
      'Commercial kitchen equipment', 'Specialised retail fixtures', 'Laboratory furniture', 'Cleanroom works', 'Industrial floor coatings',
      'Exterior fit-out works', 'Landscaping', 'Custom installations', 'Equipment rental', 'Transportation',
      'Manpower services', 'Supervision', 'Design services', 'Shop drawings', 'Testing, commissioning',
      'Specialised subcontract works', 'Provisional sums', 'Client-specific works'
    ]
  }
];

export const STANDARD_UOMS = [
  'Nos', 'Sqft', 'Sqm', 'Rft', 'Rmt', 'Kg', 'Ton', 'Set', 'Lump Sum', 'Ltr', 'Box', 'Packet', 'Pair', 'Point', 'Cft', 'Cmt'
];
