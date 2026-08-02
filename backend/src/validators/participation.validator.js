const { z } = require('zod');

function isValidFrenchPhone(value) {
  const compact = String(value || '').replace(/[\s().-]/g, '');
  return /^(?:0[1-9]\d{8}|(?:\+|00)33[1-9]\d{8})$/.test(compact);
}

const participationSchema = z.object({
  name: z.string().trim().min(2, 'Le nom est requis.').max(100, 'Le nom est trop long.'),
  phone: z.string().trim()
    .max(30, 'Le numéro de téléphone est trop long.')
    .refine(isValidFrenchPhone, 'Le numéro de téléphone français est invalide.'),
  gameConsent: z.boolean({ required_error: 'Le consentement au jeu est obligatoire.' })
    .refine((value) => value === true, 'Le consentement au jeu est obligatoire.'),
  marketingConsent: z.boolean().optional().default(false),
});

module.exports = { participationSchema, isValidFrenchPhone };
