"use client";

/**
 * Identifiant de soumission généré côté navigateur, partagé par l'email
 * (clé d'idempotence Resend) et par Synergy (idempotencyKey).
 *
 * Il est créé UNE FOIS par saisie de formulaire et conservé tant que
 * l'envoi n'a pas abouti : si le visiteur réessaie après une erreur réseau,
 * la même clé repart, et ni l'email ni le prospect ne sont dupliqués. Il
 * n'est renouvelé qu'après un succès, pour qu'une seconde demande
 * volontaire reste bien une seconde demande.
 *
 * Format imposé par Synergy : UUID v4 (voir src/lib/leads/validation.ts).
 */

const HEX = "0123456789abcdef";

function randomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let index = 0; index < count; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * `crypto.randomUUID` n'existe pas hors contexte sécurisé (http:// sur une
 * IP locale, vieux navigateurs) : on retombe sur une construction v4
 * explicite plutôt que de laisser la soumission partir sans clé.
 */
export function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  let uuid = "";
  for (let index = 0; index < 16; index += 1) {
    if (index === 4 || index === 6 || index === 8 || index === 10) uuid += "-";
    uuid += HEX[bytes[index] >> 4] + HEX[bytes[index] & 0x0f];
  }
  return uuid;
}
