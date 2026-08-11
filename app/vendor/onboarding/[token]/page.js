'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import VendorOnboardingFormApp from '../../../../components/vendor-portal/VendorOnboardingFormApp';

export default function VendorOnboardingPage() {
  const params = useParams();
  const token = params?.token;

  return <VendorOnboardingFormApp token={token} />;
}
