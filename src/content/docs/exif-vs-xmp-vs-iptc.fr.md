---
title: "EXIF vs XMP vs IPTC : comprendre les standards de métadonnées"
description: "Découvrez les différences entre les standards de métadonnées EXIF, XMP et IPTC. Ce que contient chaque format et lesquels présentent un risque pour la confidentialité de vos photos."
slug: "exif-vs-xmp-vs-iptc"
order: 8
lang: 'fr'
---

Les métadonnées photo existent sous trois formats principaux : EXIF, XMP et IPTC. Chacun sert un but différent et implique des conséquences différentes pour la confidentialité.

## Comparaison rapide

| Fonctionnalité | EXIF | XMP | IPTC |
|----------------|------|-----|------|
| Créé par | Fabricants d'appareils photo | Adobe | Organismes de presse |
| Généré automatiquement | Oui | Partiellement | Non |
| Contient GPS | Oui | Peut | Non |
| Contient infos appareil | Oui | Peut | Non |
| Contient légendes | Non | Oui | Oui |
| Risque de confidentialité | **Élevé** | Moyen | Moyen |
| Format | Binaire | XML (texte) | Binaire |

## EXIF — Le registre de l'appareil photo

L'EXIF est créé automatiquement par votre appareil photo ou smartphone. C'est le type de métadonnées le plus courant et le plus sensible en matière de confidentialité, contenant les coordonnées GPS, les informations sur l'appareil, les horodatages, les numéros de série de l'appareil et les miniatures.

**Risque de confidentialité : ÉLEVÉ** — L'EXIF est la principale préoccupation car il contient des données GPS et des identifiants d'appareil qui sont ajoutés automatiquement sans votre connaissance.

## XMP — La norme moderne d'Adobe

Le XMP a été développé par Adobe et utilise le format XML. Il peut contenir toutes les données EXIF et IPTC ainsi que l'historique d'évaluation, les évaluations, les mots-clés et des métadonnées personnalisées issues de plugins.

**Risque de confidentialité : MOYEN** — Le XMP peut contenir un historique d'édition et duplique souvent des données EXIF sensibles comme les coordonnées GPS.

## IPTC — La norme de la presse

Les métadonnées IPTC sont principalement utilisées par les organismes de presse, les agences de photothèque et les photographes professionnels. Elles contiennent la légende, les mots-clés, les crédits du photographe, l'avis de copyright et les coordonnées.

**Risque de confidentialité : MOYEN** — L'IPTC peut contenir votre nom, vos coordonnées et les détails du copyright.

## Comment notre outil gère les trois

Notre [EXIF Scrub](/fr/) utilise le réencodage via l'API Canvas, qui supprime efficacement les trois types de métadonnées. Seules les données d'affichage essentielles (orientation, profil de couleur) sont conservées.

[Supprimez toutes les métadonnées de vos photos →](/fr/)

Connexes : [Qu'est-ce que les données EXIF ?](/fr/what-is-exif-data) · [Guide des métadonnées photo](/fr/photo-metadata-guide) · [Pourquoi supprimer les données EXIF](/fr/why-remove-exif-data)
