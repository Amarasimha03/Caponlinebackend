import React from 'react';
import { Outlet } from 'react-router-dom';

export default function EmployeeLayout() {

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>


      <main style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
