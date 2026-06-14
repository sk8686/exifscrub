# EXIF Metadata Remover — Design Spec

## Product Definition

**One-liner**: Remove EXIF metadata from photos — 100% in your browser, files never leave your device.

**Target users**:
1. Privacy-conscious individuals sharing photos with strangers or online
2. Journalists, lawyers, activists (high-privacy professions)
3. Everyday people learning about online privacy

**Core differentiators vs competitors**:

| Feature | This product | exifdata.io | exifremover.com | verexif.com |
|---------|-------------|-------------|-----------------|-------------|
| Local processing | ✅ | ✅ | ✅ | ❌ uploads to server |
| Before/after comparison | ✅ strikethrough | ❌ | ❌ | ❌ |
| Privacy risk summary | ✅ | ❌ | ❌ | ❌ |
| Risk-level classification | ✅ | ❌ | ❌ | ❌ |
| Clipboard paste upload | ✅ | ❌ | ❌ | ❌ |
| UI quality | Modern | Medium | Medium | Poor |
| Multi-language (future) | ✅ | ❌ | ❌ | ❌ (Spanish only) |

---

## Format Scope

**Images only**: JPG, PNG, WebP, HEIC

- HEIC: Convert to JPEG in-browser via heic2any, then process normally
- Rationale: Images carry the highest EXIF privacy risk; PDF/DOCX metadata is a different use case

---

## Page Structure & SEO

### Tool page (homepage)
`/` — Upload, inspect, clean, download. The primary entry point.

### Content pages (10 pages)

| Page | URL | Target keywords |
|------|-----|-----------------|
| What is EXIF Data | /what-is-exif-data | what is exif data, exif metadata |
| How to Remove EXIF Data | /how-to-remove-exif-data | how to remove exif data, remove metadata from photo |
| Remove GPS from Photos | /remove-gps-from-photos | remove gps from photo, remove location from photo |
| EXIF Privacy Risks | /exif-privacy-risks | exif privacy, photo location privacy |
| Photo Metadata Guide | /photo-metadata-guide | photo metadata, image metadata |
| Remove EXIF from iPhone | /remove-exif-from-iphone | remove exif iphone, iphone photo location |
| Remove EXIF from Android | /remove-exif-from-android | remove exif android, android photo metadata |
| EXIF vs XMP vs IPTC | /exif-vs-xmp-vs-iptc | exif vs xmp, iptc vs exif |
| Best EXIF Remover Tools | /best-exif-remover-tools | best exif remover, exif remover tool |
| Does Social Media Strip EXIF | /does-social-media-strip-exif | does facebook remove exif, whatsapp exif data |

Every content page ends with a CTA: "Try our free EXIF remover →" linking back to the tool page.

---

## Tool Page UX Design

### User flow

```
Drop/select/paste images → Thumbnail grid with risk summary → Click to inspect → One-click clean → Download
```

### Key UX features

**1. Privacy risk summary (most important)**

After upload, instead of dumping raw EXIF tags (what competitors do), show:

```
⚠️ 3 privacy risks found:
• GPS location: 39.9042°N, 116.4074°E
• Device: iPhone 15 Pro Max
• Timestamp: 2024-03-15 14:32:00
```

Users don't need to understand `EXIF Tag 0x8825`. They need to know "what is my photo exposing?"

**2. Metadata risk classification**

| Level | Label | Examples |
|-------|-------|---------|
| 🔴 High risk | GPS coordinates, device serial number | GPSLatitude, SerialNumber |
| 🟡 Medium risk | Device model, capture timestamp | Make, Model, DateTime |
| 🟢 Low risk | Image orientation, color space | Orientation, ColorSpace |

After cleaning: high-risk items shown with red strikethrough, preserved items shown normally.

**3. Smart preservation**

Explicitly explain what is kept and why:

```
✅ Preserved (keeps your photo displaying correctly):
  • Orientation — ensures photo isn't rotated wrong
  • Color profile — keeps colors accurate
```

**4. Batch processing**

- Drag & drop multiple images, show thumbnail grid
- Each thumbnail shows risk count (e.g. `⚠️ 3 risks`)
- "Clean All" + "Download All as ZIP"
- Progress bar during processing

**5. Clipboard paste upload**

- Ctrl+V / Cmd+V to paste screenshots directly
- Common scenario: take screenshot → paste → clean → download in 3 seconds
- No competitor supports this

**6. Trust signals**

- Persistent banner: `🔒 100% local processing — your files never leave your device`
- Processing animation: `Processing in your browser...`
- No registration, no cookies, no analytics tracking

---

## Technical Architecture

### Tech stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Astro 5 | Static output, i18n support, React islands |
| UI components | React + Tailwind CSS | Tool page interactivity, component-based dev |
| EXIF reading | exifr | Most complete JS EXIF library, supports JPG/PNG/WebP/HEIC |
| EXIF removal | Canvas API re-encoding | Simple, reliable, JPEG 92% quality visually lossless |
| HEIC support | heic2any | In-browser conversion to JPEG |
| ZIP download | JSZip | Batch download packaging |
| Deployment | Cloudflare Pages | Free, global CDN, auto-build |
| i18n (future) | Astro content collections + JSON translation files | Add language = add translation file |

### Project structure

```
src/
├── components/          # React components
│   ├── DropZone.tsx     # Drag & drop + clipboard paste upload area
│   ├── PhotoGrid.tsx    # Thumbnail grid with risk badges
│   ├── MetaPanel.tsx    # Metadata detail panel with risk classification
│   ├── RiskBadge.tsx    # Risk level badge (high/medium/low)
│   └── CleanButton.tsx  # Clean & download buttons
├── layouts/
│   └── BaseLayout.astro # Site-wide layout (header/footer/SEO)
├── pages/
│   ├── index.astro      # Tool page (homepage)
│   └── [slug].astro     # Content page dynamic routing
├── content/
│   └── docs/            # Content page Markdown
│       ├── what-is-exif-data.en.md
│       ├── how-to-remove-exif-data.en.md
│       └── ...
├── i18n/
│   ├── en.json
│   └── zh.json (future)
└── styles/
    └── global.css       # Tailwind + custom styles
```

### EXIF removal process

1. Read EXIF data with exifr → display risk summary + full metadata
2. On "Clean": draw image to Canvas → export as JPEG (92%) / PNG (lossless) / WebP (92%)
3. Re-read EXIF from cleaned file → show strikethrough comparison
4. Offer individual download or batch ZIP download

### Performance targets

- Homepage LCP < 1.5s (static HTML, no blocking JS)
- Tool page JS loads only on user interaction (Astro islands)
- Content pages: zero JS (pure static HTML)
- Lighthouse: all 4 categories > 95

---

## Visual Design

### Design principles
- **Trust first**: Clean layout, privacy-focused messaging
- **Minimal & restrained**: Generous whitespace, clear information hierarchy
- **Mobile-first**: 50%+ users on mobile, all interactions touch-friendly

### Color scheme

```
Primary:   #2563EB (blue — trust, security)
Success:   #10B981 (green — safe/cleaned)
Warning:   #EF4444 (red — privacy risk)
Background: #FFFFFF / #F8FAFC
Text:       #0F172A / #475569
```

### Typography
- Headings & body: Inter (modern, clean, free)

---

## Future Considerations

- **Multi-language**: Astro i18n routing + JSON translation files. Add language = add translation file + content .md files.
- **Ad integration**: Component-based ad slots (`<AdSlot />`) can be inserted into layouts and content pages.
- **Brand name**: Placeholder for now, to be updated after domain registration.

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Format scope | Images only (JPG/PNG/WebP/HEIC) | Highest privacy risk; PDF/DOCX is different use case |
| Site structure | Tool page + 10 content pages | Better SEO keyword coverage |
| Map visualization | Removed | Not a deciding factor for users; adds complexity |
| Tech stack | Astro + React islands + Tailwind | i18n support, component reuse, static output |
| EXIF removal method | Canvas re-encoding | Simple, reliable, visually lossless |
| Before/after display | Strikethrough on removed items | Simple, mobile-friendly, clear |
| HEIC handling | Browser-side conversion via heic2any | iPhone users expect seamless support |
| PWA/offline | Not included | Conflicts with future ad monetization |
| Clipboard paste | Included | Unique feature, 3-second workflow for screenshots |
| Dark mode | Not included in v1 | Can add later with Tailwind dark: prefix |
