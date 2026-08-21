'use client';

import React from 'react';
import { StateProvider } from '../components/StateProvider';
import ConstructOGenieApp from '../components/marketing/ConstructOGenieApp';

export default function Home() {
  return (
    <StateProvider>
      <ConstructOGenieApp />
    </StateProvider>
  );
}
