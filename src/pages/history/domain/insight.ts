/** Uma frase que o histórico tira dos números ("O que os números dizem"). */
export type InsightView = {
  tone: "steel" | "pos" | "near";
  title: string;
  text: string;
};
