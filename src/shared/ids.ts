/** Gera um id novo. Entra por parâmetro onde se cria registro, porque o id é aleatório (R3). */
export type IdGenerator = () => string;

/** Ids gerados no aparelho: dois aparelhos criando registros offline nunca repetem o número. */
export const generateId: IdGenerator = () => crypto.randomUUID();
