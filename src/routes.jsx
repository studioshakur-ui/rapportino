// Dashboard CAPO
<Route
  path="/*"
  element={
    <RequireRole allow={['CAPO']}>
      <AppShell />
    </RequireRole>
  }
/>

//
// UFFICIO
//
<Route
  path="/ufficio/*"
  element={
    <RequireRole allow={['UFFICIO']}>
      <UfficioShell />
    </RequireRole>
  }
/>

//
// DIREZIONE
//
<Route
  path="/direction/*"
  element={
    <RequireRole allow={['DIREZIONE']}>
      <DirectionShell />
    </RequireRole>
  }
/>
