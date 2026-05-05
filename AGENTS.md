# Typography Rules

Do not introduce new fonts unless explicitly requested.

Use the existing site font system only:
- Display/headline font for major page titles only
- Body/UI font for paragraphs, buttons, cards, forms, and testimonials
- Uppercase tracking is allowed for labels, metadata, and small section tags

Testimonials should NOT use serif fonts or decorative fonts.
Make testimonials stand out through layout, spacing, line-height, quote styling, and amber accents instead of adding another font.

Before changing typography, preserve the existing brand system.
# Project Context

This is the USAM website (not the DOS app).

The website is the public front door to:
- Mission and vision
- Financial Freedom intake
- Missionary support pages

Admin functionality exists under /admin.

Do NOT build app-style dashboards on public pages.
Keep the website simple, clear, and invitational.

---

# Routing Rules

Public pages:
- /
- /financialfreedom
- /give/[userId]
- /missionaries

Admin pages:
- /admin/dashboard
- /admin/missionary-profiles
- /admin/financial-freedom
- /admin/*

All /admin routes must be protected using Supabase auth + admin_users table.

---

# UI Principles

- Keep pages simple and uncluttered
- Avoid dashboard-style layouts on public pages
- Use cards and sections instead of dense data
- One primary CTA per section
- Mobile-first always

Do NOT:
- add unnecessary features
- create large hero dashboards
- overwhelm users with data

---

# Component Rules

- Reuse existing components whenever possible
- Do not duplicate UI patterns
- Keep components small and focused
- Follow existing spacing and card patterns

---

# Supabase Rules

- Use Supabase for all structured data
- Never hardcode credentials
- Do not expose private data publicly
- Use RLS for all tables

Public pages:
- can INSERT only (forms)

Admin pages:
- can SELECT / UPDATE based on admin access

---

# Admin Rules

- All admin pages must use the shared AdminShell
- Sidebar navigation must remain consistent
- Admin pages are tools, not marketing pages

---

# Form Rules

- Forms must feel safe and voluntary
- Avoid overwhelming inputs
- Always include privacy language
- Do not require more than necessary

---

# Development Flow

Always build in this order:

1. Data model (Supabase)
2. Basic UI
3. UX refinement
4. Add intelligence

---

# DO NOT

- introduce new design systems
- add unnecessary complexity
- break existing layout patterns
- expose sensitive financial data