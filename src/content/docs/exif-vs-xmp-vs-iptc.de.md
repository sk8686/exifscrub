---
title: "EXIF vs XMP vs IPTC: Metadatenstandards verstehen"
description: "Lernen Sie die Unterschiede zwischen den Metadatenstandards EXIF, XMP und IPTC kennen. Was jedes Format enthält und welche ein Datenschutzrisiko für Ihre Fotos darstellen."
slug: "exif-vs-xmp-vs-iptc"
order: 8
lang: 'de'
---

Fotometadaten kommen in drei Hauptformaten: EXIF, XMP und IPTC. Jedes dient einem anderen Zweck und birgt unterschiedliche Auswirkungen für den Datenschutz.

## Schnellvergleich

| Merkmal | EXIF | XMP | IPTC |
|----------|------|-----|------|
| Erstellt von | Kamera-Hersteller | Adobe | Nachrichtenorganisationen |
| Automatisch generiert | Ja | Teilweise | Nein |
| Enthält GPS | Ja | Kann | Nein |
| Enthält Kamerainfo | Ja | Kann | Nein |
| Enthält Bildunterschriften | Nein | Ja | Ja |
| Datenschutzrisiko | **Hoch** | Mittel | Mittel |
| Format | Binär | XML (Text) | Binär |

## EXIF — Der Kameraaufzeichnung

EXIF wird automatisch von Ihrer Kamera oder Ihrem Smartphone erstellt. Es ist der häufigste und datenschutzsensibelste Typ von Metadaten und enthält GPS-Koordinaten, Kamerainfo, Zeitstempel, Geräteseriennummern und Miniaturansichten.

**Datenschutzrisiko: HOCH** — EXIF ist das Hauptanliegen, da es GPS-Daten und Geräteidentifikatoren enthält, die ohne Ihr Wissen automatisch hinzugefügt werden.

## XMP — Adobes moderner Standard

XMP wurde von Adobe entwickelt und verwendet das XML-Format. Es kann alle EXIF- und IPTC-Daten sowie Bearbeitungsverläufe, Bewertungen, Stichwörter und benutzerdefinierte Metadaten von Plugins enthalten.

**Datenschutzrisiko: MITTEL** — XMP kann Bearbeitungsverläufe enthalten und dupliziert oft sensible EXIF-Daten wie GPS-Koordinaten.

## IPTC — Der Nachrichtenstandard

IPTC-Metadaten werden hauptsächlich von Nachrichtenagenturen, Stockfoto-Agenturen und professionellen Fotografen verwendet. Sie enthalten Bildunterschrift, Stichwörter, Fotograf-Credits, Copyright-Hinweis und Kontaktinformationen.

**Datenschutzrisiko: MITTEL** — IPTC kann Ihren Namen, Kontaktinformationen und Copyright-Details enthalten.

## Wie unser Tool alle drei behandelt

Unser [EXIF Scrub](/de/) verwendet Canvas-API-Neukodierung, welche effektiv alle drei Arten von Metadaten entfernt. Nur wesentliche Anzeigedaten (Ausrichtung, Farbprofil) werden bewahrt.

[Entfernen Sie alle Metadaten aus Ihren Fotos →](/de/)

Verwandt: [Was sind EXIF-Daten?](/de/what-is-exif-data) · [Fotometadaten-Führer](/de/photo-metadata-guide) · [Warum EXIF-Daten entfernen](/de/why-remove-exif-data)
