const { z } = require('zod');

const participationSchema = z.object({
  name: z.string().trim().min(2, 'Le nom est requis.'),
  phone: z.string().trim().min(8, 'Le numéro de téléphone est invalide.'),
  gameConsent: z.boolean({ required_error: 'Le consentement au jeu est obligatoire.' }),
  marketingConsent: z.boolean().optional().default(false),
});

module.exports = { participationSchema };
