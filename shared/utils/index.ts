export function extractTicketId(input: string): string {
    const match = input.match(/([A-Z]+-\d+)/);
    if (!match) {
      throw new Error("No se pudo extraer el ticketId");
    }
    return match[1];
  }