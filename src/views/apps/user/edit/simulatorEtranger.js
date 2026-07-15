// Liste prédéfinie des pays pour le marquage documentaire « année à l'étranger ».
// Purement informatif : aucune incidence sur les calculs de retraite (trimestres,
// SAM, régimes, montants). Couvre l'UE/EEE/Suisse + les principaux pays sous
// convention bilatérale. Triée fr-FR pour un affichage direct dans un <select>.
export const PAYS_ETRANGER = [
  "Algérie",
  "Allemagne",
  "Autriche",
  "Belgique",
  "Brésil",
  "Bulgarie",
  "Canada",
  "Chypre",
  "Croatie",
  "Danemark",
  "Espagne",
  "Estonie",
  "États-Unis",
  "Finlande",
  "Grèce",
  "Hongrie",
  "Inde",
  "Irlande",
  "Islande",
  "Israël",
  "Italie",
  "Japon",
  "Lettonie",
  "Liechtenstein",
  "Lituanie",
  "Luxembourg",
  "Malte",
  "Maroc",
  "Norvège",
  "Pays-Bas",
  "Pologne",
  "Portugal",
  "Québec",
  "République tchèque",
  "Roumanie",
  "Royaume-Uni",
  "Sénégal",
  "Slovaquie",
  "Slovénie",
  "Suède",
  "Suisse",
  "Tunisie",
  "Turquie",
];

// Vrai si `pays` est une valeur connue de la liste.
export function isValidPays(pays) {
  return typeof pays === "string" && PAYS_ETRANGER.indexOf(pays) !== -1;
}
