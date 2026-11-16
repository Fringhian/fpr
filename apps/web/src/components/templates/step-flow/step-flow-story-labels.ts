import type { Language } from "@fpr/contracts";

const NNBSP = " ";

/** The stories' demo content, in the toolbar's language. It is the stories' content, not the step flow's. */
export const LABELS = {
  en: {
    record: {
      caption: "Bought · World Index ETF · 3 March",
      question: "How many did you buy?",
      field: "Quantity",
      help: "Decimals are fine: 74.328.",
      action: "Review change",
      summary: "This change",
      rows: [
        ["What", "Bought"],
        ["Share", "World Index ETF"],
        ["When", "3 March"],
        ["How many", "10"],
      ],
    },
    signIn: {
      language: "Language",
      question: "Welcome back",
      description: "Sign in to see who’s ahead.",
      email: "Email",
      password: "Password",
      forgot: "Forgot it? Ask the admin for a reset key, then",
      reset: "reset your password",
      action: "Sign in",
      panelCaption: "A made-up race",
      panelTitle: "Who’s ahead this month?",
    },
    portfolio: {
      question: "Here’s your portfolio",
      description:
        "The admin set it up for you. You can change it later in Portfolio.",
      units: "units",
      cash: "Cash",
      action: "Meet everyone",
      panel: "How the others see your portfolio",
    },
    saved: {
      question: "Bought 10 World Index ETF on 3 March",
      session: "This session",
      changes: [
        "Sold 5 US Health ETF · 2 Mar",
        "Bought 10 World Index ETF · 3 Mar",
      ],
      undo: "Undo",
      another: "Record another change",
      done: "Done",
      panel: "Your portfolio now",
    },
  },
  fr: {
    record: {
      caption: "Acheté · World Index ETF · 3 mars",
      question: `Combien en avez-vous acheté${NNBSP}?`,
      field: "Quantité",
      help: `Les décimales sont acceptées${NNBSP}: 74,328.`,
      action: "Vérifier le changement",
      summary: "Ce changement",
      rows: [
        ["Quoi", "Acheté"],
        ["Action", "World Index ETF"],
        ["Quand", "3 mars"],
        ["Combien", "10"],
      ],
    },
    signIn: {
      language: "Langue",
      question: "Bon retour",
      description: "Connectez-vous pour voir qui mène.",
      email: "E-mail",
      password: "Mot de passe",
      forgot: `Oublié${NNBSP}? Demandez une clé de réinitialisation à l’admin, puis`,
      reset: "réinitialisez votre mot de passe",
      action: "Se connecter",
      panelCaption: "Une course inventée",
      panelTitle: `Qui mène ce mois-ci${NNBSP}?`,
    },
    portfolio: {
      question: "Voici votre portefeuille",
      description:
        "L’admin l’a préparé pour vous. Vous pourrez le modifier plus tard dans Portefeuille.",
      units: "parts",
      cash: "Liquidités",
      action: "Rencontrer tout le monde",
      panel: "Ce que les autres voient de votre portefeuille",
    },
    saved: {
      question: "10 World Index ETF achetés le 3 mars",
      session: "Cette session",
      changes: [
        "5 US Health ETF vendus · 2 mars",
        "10 World Index ETF achetés · 3 mars",
      ],
      undo: "Annuler",
      another: "Enregistrer un autre changement",
      done: "Terminé",
      panel: "Votre portefeuille maintenant",
    },
  },
} as const;

export type Labels = (typeof LABELS)[Language];

/** Invented holdings, enough for the step to scroll: name, units, value in euros. */
export const HOLDINGS = [
  ["World Index ETF", "50", "4920"],
  ["Swiss Pharma AG", "12", "1384.20"],
  ["Euro Bank SA", "40", "612.40"],
  ["Global Tech Fund", "8.5", "1102.75"],
  ["Nordic Wind AG", "30", "455.10"],
  ["US Health ETF", "20", "803.60"],
  ["Asia Growth Fund", "15", "690.00"],
  ["Green Bond ETF", "25", "1210.50"],
  ["Alpine Rail AG", "10", "388.90"],
  ["Ocean Freight SA", "6", "244.80"],
  ["Small Cap Europe ETF", "18", "527.40"],
  ["Gold Miners Fund", "9", "301.30"],
] as const;
