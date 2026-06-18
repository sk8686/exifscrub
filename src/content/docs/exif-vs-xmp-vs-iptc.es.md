---
title: "EXIF vs XMP vs IPTC: entender los estándares de metadatos"
description: "Conozca las diferencias entre los estándares de metadatos EXIF, XMP e IPTC. Qué contiene cada formato y cuáles representan un riesgo para la privacidad de sus fotos."
slug: "exif-vs-xmp-vs-iptc"
order: 8
lang: 'es'
---

Los metadatos de fotos vienen en tres formatos principales: EXIF, XMP e IPTC. Cada uno cumple un propósito diferente y conlleva diferentes implicaciones de privacidad.

## Comparación rápida

| Característica | EXIF | XMP | IPTC |
|----------------|------|-----|------|
| Creado por | Fabricantes de cámaras | Adobe | Organizaciones de noticias |
| Generado automáticamente | Sí | Parcialmente | No |
| Contiene GPS | Sí | Puede | No |
| Contiene info. de cámara | Sí | Puede | No |
| Contiene pies de foto | No | Sí | Sí |
| Riesgo de privacidad | **Alto** | Medio | Medio |
| Formato | Binario | XML (texto) | Binario |

## EXIF — El registro de la cámara

EXIF es creado automáticamente por su cámara o smartphone. Es el tipo de metadatos más común y más sensible a la privacidad, conteniendo coordenadas GPS, información de cámara, marcas de tiempo, números de serie del dispositivo y miniaturas.

**Riesgo de privacidad: ALTO** — EXIF es la principal preocupación porque contiene datos GPS e identificadores de dispositivo que se agregan automáticamente sin su conocimiento.

## XMP — El estándar moderno de Adobe

XMP fue desarrollado por Adobe y usa formato XML. Puede contener todos los datos EXIF e IPTC más historial de edición, valoraciones, palabras clave y metadatos personalizados de complementos.

**Riesgo de privacidad: MEDIO** — XMP puede contener historial de edición y a menudo duplica datos sensibles de EXIF como coordenadas GPS.

## IPTC — El estándar de noticias

Los metadatos IPTC son utilizados principalmente por organizaciones de noticias, agencias de fotografía de stock y fotógrafos profesionales. Contienen pie de foto, palabras clave, crédito del fotógrafo, aviso de derechos de autor e información de contacto.

**Riesgo de privacidad: MEDIO** — IPTC puede contener su nombre, información de contacto y detalles de derechos de autor.

## Cómo nuestra herramienta maneja los tres

Nuestra [EXIF Scrub](/es/) usa re-codificación mediante Canvas API, lo cual elimina eficazmente los tres tipos de metadatos. Solo se conservan datos esenciales de visualización (orientación, perfil de color).

[Elimine todos los metadatos de sus fotos →](/es/)

Relacionado: [¿Qué son los datos EXIF?](/es/what-is-exif-data) · [Guía de metadatos de fotos](/es/photo-metadata-guide) · [¿Por qué eliminar datos EXIF?](/es/why-remove-exif-data)
