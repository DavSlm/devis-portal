// =====================================================
// Dictionnaire i18n — wizard public.
// Pas de dépendance externe : ~250 strings au total, le bundle reste léger.
// FR = source de vérité, EN doit être maintenu en parallèle (même clés).
// =====================================================

export type Locale = 'fr' | 'en';
export const LOCALES: Locale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: Locale = 'fr';

export const LOCALE_COOKIE = 'devis_locale';

export interface StepLabels {
  profile: string;
  'product-type': string;
  'perso-level': string;
  'category-neutre': string;
  grammage: string;
  'matiere-full-15g': string;
  'scenteur-full': string;
  packaging: string;
  brief: string;
  quantity: string;
  shipping: string;
  summary: string;
}

export interface Translations {
  header: {
    tagline: string;
    logoAlt: string;
  };
  nav: {
    previous: string;
    next: string;
    submit: string;
  };
  sidebar: {
    title: string;
    progress_step: string;
    upcoming_placeholder: string;
  };
  step_labels: StepLabels;
  profile: {
    title: string;
    subtitle: string;
    particulier: string;
    particulier_desc: string;
    pro: string;
    pro_desc: string;
    your_info: string;
    company_name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
    country_placeholder: string;
    france: string;
    eu: string;
    non_eu: string;
  };
  product_type: {
    title: string;
    subtitle: string;
    oshibori: string;
    oshibori_desc: string;
    plateaux: string;
    plateaux_desc: string;
  };
  perso_level: {
    title: string;
    subtitle: string;
    neutre_title: string;
    neutre_desc: string;
    neutre_chip_stock: string;
    neutre_chip_delay: string;
    semi_title: string;
    semi_desc: string;
    semi_chip: string;
    full_title: string;
    full_desc: string;
    full_chip: string;
  };
  category_neutre: {
    title: string;
    subtitle: string;
    fifteen_g: string;
    ten_g: string;
    six_g: string;
    dim_15_10: string;
    dim_6: string;
    thicker: string;
    thinner: string;
    compact: string;
    six_packs: string;
    two_packs: string;
    cotton_or_bamboo: string;
    full_cotton: string;
  };
  grammage: {
    title: string;
    subtitle_full: string;
    subtitle_semi: string;
    from_18000: string;
    from_30000: string;
    from_50: string;
  };
  matiere: {
    title: string;
    subtitle: string;
    cotton: string;
    cotton_desc: string;
    bamboo: string;
    bamboo_desc: string;
    bamboo_extra: string;
  };
  scent: {
    title: string;
    subtitle: string;
    orange: string;
    orange_desc: string;
    white_tea: string;
    white_tea_desc: string;
    green_tea: string;
    green_tea_desc: string;
    none: string;
    none_desc: string;
  };
  packaging: {
    title_neutre: string;
    title_semi: string;
    subtitle_neutre: string;
    subtitle_semi: string;
    empty: string;
  };
  brief: {
    title: string;
    subtitle: string;
    file_label: string;
    file_label_extra: string;
    file_choose: string;
    file_none: string;
    file_remove: string;
    file_formats: string;
    file_too_large: string;
    description_label: string;
    description_optional: string;
    description_placeholder: string;
  };
  quantity: {
    title: string;
    good_to_know: string;
    dlu_note: string;
    label: string;
    units: string;
    plateaux: string;
    aria_select: string;
    decrease: string;
    increase: string;
    tiers_title: string;
    th_from: string;
    th_unit: string;
    th_savings: string;
    prices_note: string;
    engagements_title: string;
    eng_made_title: string;
    eng_made_desc: string;
    eng_iso_title: string;
    eng_iso_desc: string;
    eng_natural_title: string;
    eng_natural_desc: string;
    eng_derm_title: string;
    eng_derm_desc: string;
    eng_scent_title: string;
    eng_scent_desc: string;
    eng_trace_title: string;
    eng_trace_desc: string;
  };
  shipping: {
    title: string;
    subtitle: string;
    delivery_title: string;
    contact_name: string;
    optional: string;
    contact_name_hint: string;
    street1: string;
    street2: string;
    postal_code: string;
    city: string;
    state: string;
    country: string;
    carrier_phone: string;
    carrier_phone_hint: string;
    billing_same: string;
    billing_title: string;
    company_id_title: string;
    siret: string;
    siret_hint: string;
    siret_placeholder: string;
    siret_invalid: string;
    vat: string;
    vat_hint: string;
    vat_placeholder: string;
    vat_fr_invalid: string;
    vat_ue_invalid: string;
    message: string;
    message_optional: string;
    message_placeholder: string;
  };
  summary: {
    title: string;
    subtitle: string;
    contact: string;
    type: string;
    name: string;
    phone: string;
    product: string;
    range: string;
    perso: string;
    category: string;
    grammage: string;
    matiere: string;
    packaging: string;
    brief: string;
    file: string;
    description: string;
    quantity_estimate: string;
    quantity: string;
    unit_price_est: string;
    total_ht_est: string;
    estimate_note: string;
    delivery: string;
    contact_label: string;
    address: string;
    carrier_phone: string;
    billing: string;
    ids: string;
    vat_fr: string;
    vat_ue: string;
    message: string;
    sending: string;
    submit: string;
    after_note: string;
    error: string;
  };
  validation: {
    minimum: string;
    max_semi: string;
    must_multiple: string;
    plateaux_rule: string;
    neutre_rule: string;
    semi_rule: string;
    full_6g_rule: string;
    full_rule: string;
    pallet: string;
    pallets: string;
    carton: string;
    cartons: string;
    of_n_oshibori: string;
  };
  thanks: {
    title: string;
    body_part1: string;
    body_strong: string;
    body_part2: string;
    reference: string;
    back: string;
  };
}

export const fr: Translations = {
  header: {
    tagline: 'Devis personnalisé',
    logoAlt: 'Oshibori Concept',
  },
  nav: {
    previous: 'Précédent',
    next: 'Suivant',
    submit: 'Envoyer ma demande',
  },
  sidebar: {
    title: 'Votre devis',
    progress_step: 'Étape {current} sur {total}',
    upcoming_placeholder: '—',
  },
  step_labels: {
    profile: 'Profil',
    'product-type': 'Produit',
    'perso-level': 'Personnalisation',
    'category-neutre': 'Variante',
    grammage: 'Grammage',
    'matiere-full-15g': 'Matière',
    'scenteur-full': 'Parfum',
    packaging: 'Emballage',
    brief: 'Brief',
    quantity: 'Quantité',
    shipping: 'Livraison',
    summary: 'Récapitulatif',
  },
  profile: {
    title: 'Vous êtes…',
    subtitle: 'Quelques informations pour personnaliser votre devis',
    particulier: 'Particulier',
    particulier_desc: 'Pour un usage personnel ou un événement privé.',
    pro: 'Entreprise',
    pro_desc: 'Restauration, hôtellerie, événementiel, retail, aviation…',
    your_info: 'Vos informations',
    company_name: "Nom de l'entreprise",
    first_name: 'Prénom',
    last_name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    country: 'Pays',
    country_placeholder: '— Sélectionnez —',
    france: 'France',
    eu: 'Union européenne',
    non_eu: 'Hors UE',
  },
  product_type: {
    title: 'Quel produit vous intéresse ?',
    subtitle: 'Choisissez la gamme adaptée à votre projet',
    oshibori: 'Oshibori',
    oshibori_desc: 'Serviettes rafraîchissantes individuelles, neutres ou personnalisées.',
    plateaux: 'Plateaux',
    plateaux_desc: 'Plateaux 1×10 serviettes sèches, prêts à servir.',
  },
  perso_level: {
    title: 'Quel niveau de personnalisation ?',
    subtitle: 'Stock neutre, votre logo, ou packaging entièrement sur mesure',
    neutre_title: 'Oshibori Neutres',
    neutre_desc: "Notre gamme standard, prête à l'emploi, sans marquage.",
    neutre_chip_stock: 'Stock disponible',
    neutre_chip_delay: 'Délai 3 jours ouvrés',
    semi_title: 'Semi Personnalisation',
    semi_desc: 'Votre logo apposé sur nos emballages existants. Impression manuelle, 15 ou 10 grammes.',
    semi_chip: 'MOQ 50 · Délai 15–20 jours',
    full_title: 'Personnalisation Complète',
    full_desc: 'Emballage 100% sur mesure, matière et parfum au choix. Impression industrielle.',
    full_chip: 'MOQ 18 000 · 30 000 pour 6 g',
  },
  category_neutre: {
    title: 'Sélection du grammage',
    subtitle: 'Notre gamme Oshibori Neutres',
    fifteen_g: '15 grammes',
    ten_g: '10 grammes',
    six_g: '6 grammes',
    dim_15_10: '22 × 22,5 cm',
    dim_6: '19 × 18 cm',
    thicker: 'Plus épais',
    thinner: 'Plus fin',
    compact: 'Format compact',
    six_packs: '6 emballages',
    two_packs: '2 emballages',
    cotton_or_bamboo: 'Coton ou bambou',
    full_cotton: '100 % coton',
  },
  grammage: {
    title: 'Sélection du grammage',
    subtitle_full: 'Personnalisation Complète : trois formats au choix',
    subtitle_semi: 'Semi Personnalisation : 15 ou 10 grammes',
    from_18000: 'À partir de 18 000 Oshibori',
    from_30000: 'À partir de 30 000 Oshibori',
    from_50: 'À partir de 50 Oshibori',
  },
  matiere: {
    title: 'Serviette de votre choix',
    subtitle: 'Matière disponible sur Oshibori 15 grammes',
    cotton: '100% Coton',
    cotton_desc: 'Notre matière standard, douce et absorbante.',
    bamboo: '80% Bambou — 20% Coton',
    bamboo_desc: 'Mélange premium, encore plus soft au toucher.',
    bamboo_extra: '+ 0,10 € / unité',
  },
  scent: {
    title: 'Choix du parfum',
    subtitle: 'Nos fragrances exclusives, signature haut de gamme',
    orange: "Fleur d'oranger",
    orange_desc: 'Notes hespéridées, parfum signature haut de gamme.',
    white_tea: 'Thé blanc',
    white_tea_desc: 'Notre signature historique, fraîche et délicate.',
    green_tea: 'Thé vert',
    green_tea_desc: 'Notes végétales, vivifiantes.',
    none: 'Sans parfum',
    none_desc: 'Pour les profils sensibles ou les hôtels neutres.',
  },
  packaging: {
    title_neutre: 'Emballage & parfum',
    title_semi: 'Emballage à personnaliser',
    subtitle_neutre: 'Sélectionnez votre référence',
    subtitle_semi: 'Sur lequel souhaitez-vous appliquer votre marquage ?',
    empty: 'Aucun emballage disponible pour cette configuration.',
  },
  brief: {
    title: 'Décrivez votre projet',
    subtitle: 'Joignez votre logo / charte ou décrivez ce que vous souhaitez',
    file_label: 'Fichier à joindre',
    file_label_extra: '— logo, charte, visuel',
    file_choose: 'Choisir un fichier',
    file_none: 'Aucun fichier sélectionné',
    file_remove: 'Retirer',
    file_formats: "Formats acceptés : PDF, PNG, JPG, AI, EPS, SVG, ZIP — jusqu'à 10 Mo.",
    file_too_large: 'Fichier trop volumineux (max 10 Mo).',
    description_label: 'Description du marquage ou du packaging souhaité',
    description_optional: '— optionnel si fichier joint',
    description_placeholder: 'Couleurs souhaitées, positionnement du logo, références, ambiance…',
  },
  quantity: {
    title: 'Quantité souhaitée',
    good_to_know: 'Bon à savoir :',
    dlu_note:
      "la DLU des Oshibori est de 2 ans après production. Pour optimiser votre prix unitaire, calculez une estimation de votre consommation sur 2 ans.",
    label: 'Quantité',
    units: 'unités',
    plateaux: 'plateaux',
    aria_select: 'Sélecteur de quantité',
    decrease: 'Diminuer',
    increase: 'Augmenter',
    tiers_title: 'Paliers volume',
    th_from: 'À partir de',
    th_unit: 'Prix unitaire',
    th_savings: 'Économie',
    prices_note: 'Prix HT, EXW France · transport en sus, devis détaillé sous 24 h.',
    engagements_title: 'Nos engagements',
    eng_made_title: 'Fabriqué en France',
    eng_made_desc: 'Production et conditionnement intégralement français.',
    eng_iso_title: 'Usine certifiée ISO 22716',
    eng_iso_desc: 'Bonnes pratiques de fabrication cosmétique (BPF européennes).',
    eng_natural_title: 'Matières naturelles',
    eng_natural_desc: '100 % coton ou 80 % bambou / 20 % coton — doux et absorbants.',
    eng_derm_title: 'Testé dermatologiquement',
    eng_derm_desc: 'Hypoallergénique, sans alcool, validé pour toutes les peaux.',
    eng_scent_title: 'Parfums signature',
    eng_scent_desc: 'Fragrances exclusives haut de gamme, créées pour Oshibori Concept.',
    eng_trace_title: 'DLU 2 ans · lot tracé',
    eng_trace_desc: 'Traçabilité complète, sécurité garantie pour vos clients.',
  },
  shipping: {
    title: 'Livraison & facturation',
    subtitle: 'Où et comment vous livrer ?',
    delivery_title: 'Adresse de livraison',
    contact_name: 'Nom du contact',
    optional: 'optionnel',
    contact_name_hint: 'Nom à mentionner sur la livraison',
    street1: 'Rue 1',
    street2: 'Rue 2',
    postal_code: 'Code postal',
    city: 'Ville',
    state: 'Région / État',
    country: 'Pays',
    carrier_phone: 'Téléphone transporteur',
    carrier_phone_hint: 'Pour planifier la livraison',
    billing_same: 'Adresse de facturation identique à la livraison',
    billing_title: 'Adresse de facturation',
    company_id_title: 'Identifiants entreprise',
    siret: 'SIRET',
    siret_hint: '14 chiffres — optionnel',
    siret_placeholder: '000 000 000 00000',
    siret_invalid: 'Format invalide — attendu 14 chiffres.',
    vat: 'N° TVA intracommunautaire',
    vat_hint: 'FR + 11 caractères — optionnel',
    vat_placeholder: 'FR12345678901',
    vat_fr_invalid: 'Format TVA française invalide.',
    vat_ue_invalid: 'Format TVA UE invalide.',
    message: 'Message complémentaire',
    message_optional: '— optionnel',
    message_placeholder: 'Informations utiles à la préparation de votre devis…',
  },
  summary: {
    title: 'Récapitulatif',
    subtitle: 'Vérifiez votre demande avant envoi',
    contact: 'Contact',
    type: 'Type',
    name: 'Nom',
    phone: 'Téléphone',
    product: 'Produit',
    range: 'Gamme',
    perso: 'Personnalisation',
    category: 'Catégorie',
    grammage: 'Grammage',
    matiere: 'Matière',
    packaging: 'Emballage',
    brief: 'Brief',
    file: 'Fichier',
    description: 'Description',
    quantity_estimate: 'Quantité & estimation',
    quantity: 'Quantité',
    unit_price_est: 'Prix unitaire estimé',
    total_ht_est: 'Total estimé HT',
    estimate_note: 'Estimation indicative — un devis détaillé vous sera envoyé sous 24 h.',
    delivery: 'Livraison',
    contact_label: 'Contact',
    address: 'Adresse',
    carrier_phone: 'Tél. transporteur',
    billing: 'Facturation',
    ids: 'Identifiants',
    vat_fr: 'TVA FR',
    vat_ue: 'TVA UE',
    message: 'Message',
    sending: 'Envoi en cours…',
    submit: 'Envoyer ma demande de devis',
    after_note: 'Nous revenons vers vous sous 24 h ouvrées avec votre devis détaillé.',
    error: 'Erreur',
  },
  validation: {
    minimum: 'Minimum : {min} Oshibori.',
    max_semi:
      'Maximum Semi Personnalisation : {max} Oshibori. Au-delà, passez en Personnalisation Complète.',
    must_multiple: 'La quantité doit être un multiple de {multiple}.',
    plateaux_rule: 'Plateaux 1×10 : multiple de 48 — un carton contient 48 plateaux.',
    neutre_rule: '{gCap} Neutres : multiple de {multiple} Oshibori ({g} = {multiple} Oshibori / carton).',
    semi_rule: 'Semi Personnalisation : multiple de 50 Oshibori, entre 50 et 17 950 Oshibori.',
    full_6g_rule: 'Full Personnalisation 6 grammes : multiple de 100, à partir de 30 000 Oshibori.',
    full_rule: 'Full Personnalisation {g} : multiple de 50, à partir de 18 000 Oshibori.',
    pallet: 'palette',
    pallets: 'palettes',
    carton: 'carton',
    cartons: 'cartons',
    of_n_oshibori: 'de {n} Oshibori',
  },
  thanks: {
    title: 'Demande reçue, merci !',
    body_part1: 'Nous avons bien reçu votre demande de devis. Notre équipe vous revient',
    body_strong: 'sous 24 h ouvrées',
    body_part2: 'avec un devis détaillé adapté à votre projet.',
    reference: 'Référence :',
    back: 'Retour sur oshibori-concept.com',
  },
};

export const en: Translations = {
  header: {
    tagline: 'Custom quote',
    logoAlt: 'Oshibori Concept',
  },
  nav: {
    previous: 'Previous',
    next: 'Next',
    submit: 'Submit my request',
  },
  sidebar: {
    title: 'Your quote',
    progress_step: 'Step {current} of {total}',
    upcoming_placeholder: '—',
  },
  step_labels: {
    profile: 'Profile',
    'product-type': 'Product',
    'perso-level': 'Customization',
    'category-neutre': 'Variant',
    grammage: 'Weight',
    'matiere-full-15g': 'Fabric',
    'scenteur-full': 'Fragrance',
    packaging: 'Packaging',
    brief: 'Brief',
    quantity: 'Quantity',
    shipping: 'Shipping',
    summary: 'Summary',
  },
  profile: {
    title: 'You are…',
    subtitle: 'A few details to tailor your quote',
    particulier: 'Individual',
    particulier_desc: 'For personal use or a private event.',
    pro: 'Business',
    pro_desc: 'Restaurants, hospitality, events, retail, aviation…',
    your_info: 'Your details',
    company_name: 'Company name',
    first_name: 'First name',
    last_name: 'Last name',
    email: 'Email',
    phone: 'Phone',
    country: 'Country',
    country_placeholder: '— Select —',
    france: 'France',
    eu: 'European Union',
    non_eu: 'Outside EU',
  },
  product_type: {
    title: 'Which product interests you?',
    subtitle: 'Pick the range that fits your project',
    oshibori: 'Oshibori',
    oshibori_desc: 'Individual refreshing towels, plain or custom-branded.',
    plateaux: 'Trays',
    plateaux_desc: '1×10 dry-towel trays, ready to serve.',
  },
  perso_level: {
    title: 'Which level of customization?',
    subtitle: 'Neutral stock, your logo, or fully bespoke packaging',
    neutre_title: 'Neutral Oshibori',
    neutre_desc: 'Our standard range, ready to use, unbranded.',
    neutre_chip_stock: 'In stock',
    neutre_chip_delay: '3 business-day lead time',
    semi_title: 'Semi-Custom',
    semi_desc: 'Your logo on our existing packaging. Manual printing, 15g or 10g.',
    semi_chip: 'MOQ 50 · 15–20 days lead time',
    full_title: 'Full Customization',
    full_desc: '100% bespoke packaging, choice of fabric and fragrance. Industrial printing.',
    full_chip: 'MOQ 18,000 · 30,000 for 6g',
  },
  category_neutre: {
    title: 'Select weight',
    subtitle: 'Our Neutral Oshibori range',
    fifteen_g: '15 grams',
    ten_g: '10 grams',
    six_g: '6 grams',
    dim_15_10: '22 × 22.5 cm',
    dim_6: '19 × 18 cm',
    thicker: 'Thicker',
    thinner: 'Thinner',
    compact: 'Compact size',
    six_packs: '6 packagings',
    two_packs: '2 packagings',
    cotton_or_bamboo: 'Cotton or bamboo',
    full_cotton: '100% cotton',
  },
  grammage: {
    title: 'Select weight',
    subtitle_full: 'Full Customization: three sizes available',
    subtitle_semi: 'Semi-Custom: 15g or 10g',
    from_18000: 'From 18,000 Oshibori',
    from_30000: 'From 30,000 Oshibori',
    from_50: 'From 50 Oshibori',
  },
  matiere: {
    title: 'Choose your towel',
    subtitle: 'Fabric option available on 15g Oshibori',
    cotton: '100% Cotton',
    cotton_desc: 'Our standard fabric, soft and absorbent.',
    bamboo: '80% Bamboo — 20% Cotton',
    bamboo_desc: 'Premium blend, even softer to the touch.',
    bamboo_extra: '+ €0.10 / unit',
  },
  scent: {
    title: 'Pick a fragrance',
    subtitle: 'Our exclusive premium signature scents',
    orange: 'Orange blossom',
    orange_desc: 'Hesperidic notes, premium signature fragrance.',
    white_tea: 'White tea',
    white_tea_desc: 'Our historical signature, fresh and delicate.',
    green_tea: 'Green tea',
    green_tea_desc: 'Botanical, invigorating notes.',
    none: 'No fragrance',
    none_desc: 'For sensitive skin or neutral hotel settings.',
  },
  packaging: {
    title_neutre: 'Packaging & fragrance',
    title_semi: 'Packaging to customize',
    subtitle_neutre: 'Pick your reference',
    subtitle_semi: 'Which one would you like your branding on?',
    empty: 'No packaging available for this configuration.',
  },
  brief: {
    title: 'Describe your project',
    subtitle: 'Attach your logo / brand guidelines or describe what you have in mind',
    file_label: 'Attach a file',
    file_label_extra: '— logo, brand guide, artwork',
    file_choose: 'Choose a file',
    file_none: 'No file selected',
    file_remove: 'Remove',
    file_formats: 'Accepted formats: PDF, PNG, JPG, AI, EPS, SVG, ZIP — up to 10 MB.',
    file_too_large: 'File too large (max 10 MB).',
    description_label: 'Describe the branding or packaging you want',
    description_optional: '— optional if a file is attached',
    description_placeholder: 'Preferred colours, logo placement, references, mood…',
  },
  quantity: {
    title: 'Desired quantity',
    good_to_know: 'Good to know:',
    dlu_note:
      'Oshibori have a 2-year shelf life from production. To get the best unit price, estimate your 2-year consumption.',
    label: 'Quantity',
    units: 'units',
    plateaux: 'trays',
    aria_select: 'Quantity selector',
    decrease: 'Decrease',
    increase: 'Increase',
    tiers_title: 'Volume tiers',
    th_from: 'From',
    th_unit: 'Unit price',
    th_savings: 'Savings',
    prices_note: 'Excl. VAT, EXW France · shipping extra, detailed quote within 24h.',
    engagements_title: 'Our commitments',
    eng_made_title: 'Made in France',
    eng_made_desc: 'Production and packaging entirely French.',
    eng_iso_title: 'ISO 22716 certified factory',
    eng_iso_desc: 'European GMP for cosmetics.',
    eng_natural_title: 'Natural materials',
    eng_natural_desc: '100% cotton or 80% bamboo / 20% cotton — soft and absorbent.',
    eng_derm_title: 'Dermatologically tested',
    eng_derm_desc: 'Hypoallergenic, alcohol-free, safe for all skin types.',
    eng_scent_title: 'Signature fragrances',
    eng_scent_desc: 'Exclusive premium scents, crafted for Oshibori Concept.',
    eng_trace_title: '2-year shelf life · batch traced',
    eng_trace_desc: 'Full traceability, guaranteed safety for your customers.',
  },
  shipping: {
    title: 'Shipping & billing',
    subtitle: 'Where and how should we deliver?',
    delivery_title: 'Shipping address',
    contact_name: 'Contact name',
    optional: 'optional',
    contact_name_hint: 'Name to appear on the delivery',
    street1: 'Street 1',
    street2: 'Street 2',
    postal_code: 'Postal code',
    city: 'City',
    state: 'State / Region',
    country: 'Country',
    carrier_phone: 'Carrier phone',
    carrier_phone_hint: 'To schedule the delivery',
    billing_same: 'Billing address same as shipping',
    billing_title: 'Billing address',
    company_id_title: 'Company identifiers',
    siret: 'SIRET',
    siret_hint: '14 digits — optional',
    siret_placeholder: '000 000 000 00000',
    siret_invalid: 'Invalid format — expected 14 digits.',
    vat: 'EU VAT number',
    vat_hint: 'FR + 11 characters — optional',
    vat_placeholder: 'FR12345678901',
    vat_fr_invalid: 'Invalid French VAT format.',
    vat_ue_invalid: 'Invalid EU VAT format.',
    message: 'Additional message',
    message_optional: '— optional',
    message_placeholder: 'Anything useful to prepare your quote…',
  },
  summary: {
    title: 'Summary',
    subtitle: 'Review your request before sending',
    contact: 'Contact',
    type: 'Type',
    name: 'Name',
    phone: 'Phone',
    product: 'Product',
    range: 'Range',
    perso: 'Customization',
    category: 'Category',
    grammage: 'Weight',
    matiere: 'Fabric',
    packaging: 'Packaging',
    brief: 'Brief',
    file: 'File',
    description: 'Description',
    quantity_estimate: 'Quantity & estimate',
    quantity: 'Quantity',
    unit_price_est: 'Estimated unit price',
    total_ht_est: 'Estimated total (excl. VAT)',
    estimate_note: 'Indicative estimate — a detailed quote will be sent within 24h.',
    delivery: 'Shipping',
    contact_label: 'Contact',
    address: 'Address',
    carrier_phone: 'Carrier phone',
    billing: 'Billing',
    ids: 'Identifiers',
    vat_fr: 'FR VAT',
    vat_ue: 'EU VAT',
    message: 'Message',
    sending: 'Sending…',
    submit: 'Submit my quote request',
    after_note: 'We will get back to you within 24 business hours with your detailed quote.',
    error: 'Error',
  },
  validation: {
    minimum: 'Minimum: {min} Oshibori.',
    max_semi:
      'Semi-Custom maximum: {max} Oshibori. Above this, switch to Full Customization.',
    must_multiple: 'Quantity must be a multiple of {multiple}.',
    plateaux_rule: 'Trays 1×10: multiples of 48 — one carton contains 48 trays.',
    neutre_rule: '{gCap} Plain: multiples of {multiple} Oshibori ({g} = {multiple} Oshibori / carton).',
    semi_rule: 'Semi-Custom: multiples of 50 Oshibori, between 50 and 17,950 Oshibori.',
    full_6g_rule: 'Full Customization 6 grams: multiples of 100, from 30,000 Oshibori.',
    full_rule: 'Full Customization {g}: multiples of 50, from 18,000 Oshibori.',
    pallet: 'pallet',
    pallets: 'pallets',
    carton: 'carton',
    cartons: 'cartons',
    of_n_oshibori: 'of {n} Oshibori',
  },
  thanks: {
    title: 'Request received, thank you!',
    body_part1: 'We have received your quote request. Our team will get back to you',
    body_strong: 'within 24 business hours',
    body_part2: 'with a detailed quote tailored to your project.',
    reference: 'Reference:',
    back: 'Back to oshibori-concept.com',
  },
};

const DICTIONARIES: Record<Locale, Translations> = { fr, en };

export function getDictionary(locale: Locale): Translations {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** Récupère une string en remplaçant les placeholders `{name}`. */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`,
  );
}
