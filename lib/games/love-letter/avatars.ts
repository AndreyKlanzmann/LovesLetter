// Avatares temáticos (estilo "saloon" com bichos) atribuídos por assento.
// É só visual — mora aqui, separado do motor, e um reskin troca livremente.
const AVATARS = ["🦊", "🐂", "🐷", "🐱", "🐺", "🐰", "🦝", "🐯"];

export function avatarForSeat(seat: number): string {
  return AVATARS[(seat - 1) % AVATARS.length];
}
