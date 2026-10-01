/**
 * Error de cancelamento usado quando a tela desmonta antes da resposta chegar.
 * O nome segue a convenção de `AbortError` para que os hooks possam ignorá-lo.
 */
export function createAbortError(): Error {
  const error = new Error('Requisição cancelada');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Mensagem pt-BR para qualquer erro vindo de uma requisição. */
export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
