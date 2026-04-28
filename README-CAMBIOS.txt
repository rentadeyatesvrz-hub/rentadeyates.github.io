# Proyecto final - Elite Yacht Rentals CRM + SEO + Ads

## Cambios incluidos
- Formulario de reservas ampliado con **nombre completo** y **fecha de cumpleaños**.
- Flujo **Reserva + CRM** unificado.
- Campos CRM listos en Firestore: `status`, `crmStage`, `source`, `tracking`, `crm.deviceType`.
- Tracking preparado para:
  - Google tag / Google Ads
  - Meta Pixel / Instagram Ads
- WhatsApp Business con mensaje de bienvenida precargado.
- SEO técnico base listo:
  - title
  - meta description
  - Open Graph
  - Twitter Cards
  - canonical
  - JSON-LD
  - robots.txt
  - sitemap.xml

## Reemplazos que debes hacer antes de publicar
En `index.html`, dentro de `window.SITE_CONFIG`, reemplaza:
- `siteUrl`
- `businessPhone`
- `businessPhoneDisplay`
- `businessEmail`
- `googleTagId`
- `googleAdsId`
- `googleAdsSendTo`
- `metaPixelId`
- `instagramUrl`
- `facebookUrl`
- `google-site-verification`
- enlaces `tudominio.com`

## Notas
- El proyecto no crea por sí solo una cuenta real de WhatsApp Business. Deja listo el enlace y el mensaje de bienvenida para usarlo con tu número real.
- Si quieres que el CRM quede **idéntico** al de otra web, hace falta el código o la estructura exacta de esa otra web.
