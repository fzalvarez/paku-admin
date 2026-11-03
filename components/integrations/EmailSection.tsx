"use client";

// Correo saliente: configuración y registro de envíos. Al enviar una prueba se recarga el registro.

import { useState } from "react";
import { EmailIntegrationCard } from "@/components/integrations/EmailIntegrationCard";
import { EmailLogsCard } from "@/components/integrations/EmailLogsCard";

export function EmailSection() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <EmailIntegrationCard onTested={() => setRefreshKey((k) => k + 1)} />
      <EmailLogsCard refreshKey={refreshKey} />
    </>
  );
}
