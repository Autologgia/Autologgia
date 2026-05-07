import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'car',
  title: 'Voitures',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nom',
      type: 'string',
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
    }),

    defineField({
      name: 'brand',
      title: 'Marque',
      type: 'string',
      description: 'Ex : Porsche, BMW, Audi, Mercedes…',
    }),

    defineField({
      name: 'model',
      title: 'Modèle',
      type: 'string',
      description: 'Ex : 911, Série 3, A4, Classe C…',
    }),

    defineField({
      name: 'status',
      title: 'Statut',
      type: 'string',
      options: {
        list: [
          { title: 'Disponible', value: 'disponible' },
          { title: 'En préparation', value: 'en_preparation' },
          { title: 'Réservé', value: 'reserve' },
          { title: 'Vendu', value: 'vendu' },
        ],
      },
    }),

    defineField({
      name: 'price',
      title: 'Prix (affiché)',
      type: 'string',
      description: 'Ex : "45 000 €" — valeur affichée sur le site',
    }),

    defineField({
      name: 'numericPrice',
      title: 'Prix numérique (tri)',
      type: 'number',
      description: 'Entrez le prix en chiffres sans symbole (ex : 45000) — utilisé uniquement pour le tri par prix',
    }),

    defineField({
      name: 'year',
      title: 'Année',
      type: 'string',
    }),

    defineField({
      name: 'mileage',
      title: 'Kilométrage',
      type: 'string',
    }),

    defineField({
      name: 'transmission',
      title: 'Transmission',
      type: 'string',
      options: {
        list: [
          { title: 'Manuelle', value: 'Manuelle' },
          { title: 'Semi-automatique', value: 'Semi-automatique' },
          { title: 'Automatique', value: 'Automatique' },
        ],
      },
    }),

    defineField({
      name: 'fuel',
      title: 'Carburant',
      type: 'string',
      options: {
        list: [
          { title: 'Essence', value: 'Essence' },
          { title: 'Diesel', value: 'Diesel' },
          { title: 'Hybride', value: 'Hybride' },
          { title: 'Électrique', value: 'Électrique' },
        ],
      },
    }),

    defineField({
      name: 'power',
      title: 'Puissance',
      type: 'string',
    }),

    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
        },
      ],
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Grand texte', value: 'h3' },
            { title: 'Très grand', value: 'h2' },
            { title: 'Petit texte', value: 'small' },
            { title: 'Centré', value: 'center' },
            { title: 'Aligné à droite', value: 'right' },
            { title: 'Justifié', value: 'justify' },
          ],
          lists: [
            { title: 'Points (•)', value: 'bullet' },
            { title: 'Numérotée (1. 2.)', value: 'number' },
            { title: 'Tirets (—)', value: 'dash' },
          ],
          marks: {
            decorators: [
              { title: 'Gras', value: 'strong' },
              { title: 'Italique', value: 'em' },
              { title: 'Souligné', value: 'underline' },
            ],
            annotations: [],
          },
        },
      ],
    }),

    defineField({
      name: 'options',
      title: 'Options & équipements',
      type: 'array',
      of: [{ type: 'string' }],
    }),

    defineField({
      name: 'location',
      title: 'Localisation',
      type: 'string',
    }),

    defineField({
      name: 'critAir',
      title: "Crit'air",
      type: 'string',
      options: {
        list: [
          { title: "Crit'air 0", value: "Crit'air 0" },
          { title: "Crit'air 1", value: "Crit'air 1" },
          { title: "Crit'air 2", value: "Crit'air 2" },
          { title: "Crit'air 3", value: "Crit'air 3" },
          { title: "Crit'air 4", value: "Crit'air 4" },
          { title: "Crit'air 5", value: "Crit'air 5" },
          { title: 'Non concerné', value: 'Non concerné' },
        ],
      },
    }),

    defineField({
      name: 'historyText',
      title: 'Historique du véhicule (texte)',
      description: 'Résumé de l\'historique : nombre de propriétaires, entretiens, accidents éventuels…',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Grand texte', value: 'h3' },
            { title: 'Très grand', value: 'h2' },
            { title: 'Petit texte', value: 'small' },
            { title: 'Centré', value: 'center' },
            { title: 'Aligné à droite', value: 'right' },
            { title: 'Justifié', value: 'justify' },
          ],
          lists: [
            { title: 'Points (•)', value: 'bullet' },
            { title: 'Numérotée (1. 2.)', value: 'number' },
            { title: 'Tirets (—)', value: 'dash' },
          ],
          marks: {
            decorators: [
              { title: 'Gras', value: 'strong' },
              { title: 'Italique', value: 'em' },
              { title: 'Souligné', value: 'underline' },
            ],
            annotations: [],
          },
        },
      ],
    }),

    defineField({
      name: 'historyFile',
      title: 'Historique du véhicule (fichier PDF)',
      type: 'file',
      description: 'Rapport d\'historique ou carnet d\'entretien en PDF',
      options: {
        accept: '.pdf',
      },
    }),
  ],
})
