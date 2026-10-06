// Extrae el mensaje real de un error, venga de Clerk o del backend.
export function getErrorMessage(err, fallback) {
  // Clerk entrega el detalle en un array `errors`
    const clerkError = err?.errors?.[0];
    if (clerkError) return clerkError.longMessage || clerkError.message;

  // El backend responde { message: '...' }, y axios lo deja en response.data
    const apiMessage = err?.response?.data?.message;
    if (apiMessage) return apiMessage;

  // No hubo respuesta del servidor
    if (err?.code === "ERR_NETWORK") {
    return "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.";
    }

    return fallback;
}
