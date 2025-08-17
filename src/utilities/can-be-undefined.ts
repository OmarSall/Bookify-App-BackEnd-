import { ValidateIf } from 'class-validator';

// Prevents null but allows undefined for optional fields
export function CanBeUndefined() {
  return ValidateIf((_, value) => value !== undefined);
}
