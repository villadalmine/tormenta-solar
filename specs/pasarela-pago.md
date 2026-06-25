# SDD (research) — Pasarela de pago para la suscripción (Países Bajos + Argentina)

- **Estado:** Research / diseño (no implementado). Cierra la parte de PAGO de `suscripcion.md §9.4/§9.6`.
- **Última actualización:** 2026-06-25
- **Contexto:** suscripción **micro** (~€1/mes ≈ tope US$1 por código). El dev opera entre **NL (Países Bajos)** y
  **AR (Argentina)**. El costo real se paga en **USD a OpenRouter** (key-por-código). Hace falta una pasarela
  con **integración fácil (API + webhook)** que, al cobrar, dispare `POST /provision` y mande el código por mail.

## 1. Requisitos
- **Webhook** "pagó OK" → llama a `/provision {email, limit}` (ya existe) → crea key OpenRouter + manda código.
- **Monto chico** (€1/mes) → las **comisiones fijas** pesan; evitar mensualidades.
- **Idealmente recurrente** (mensual) o, mínimo, **link de pago** (sin construir checkout propio).
- Captura del **email** (para mandar el código) — la pasarela ya lo pide al pagar.

## 2. Países Bajos / Europa
| Opción | Integración | Costo | Para nosotros |
|---|---|---|---|
| **Mollie** ⭐ | **La más fácil**: payment links + API limpia + webhook; setup en minutos, sin mensualidad | **iDEAL €0.29 flat**, tarjetas ~1.8%+€0.25, SEPA barato | **Recomendada**: iDEAL (el método holandés), micropagos-friendly, recurring nativo, webhook simple |
| **Stripe** | API muy potente/flexible (más para SaaS complejo) | ~1.5%+€0.25 EU cards; iDEAL soportado | Más flexible pero más para casos complejos; payment links + webhooks también |
| Adyen | Enterprise, más pesado | negociado | Overkill para esto |

**NL → Mollie.** Es lo más rápido de integrar para un micro-cobro: creás un **payment link** (o suscripción
recurrente), el cliente paga con iDEAL/tarjeta, y el **webhook** te avisa → `/provision`. Casi sin código de UI.

## 3. Argentina
| Opción | Integración | Comisión | Para nosotros |
|---|---|---|---|
| **Mercado Pago** | de facto, SDK + checkout + webhooks (IPN) | **6.49% inmediato / 1.79% a 35 días** | El más usado (69%); casi obligatorio para cobrar a argentinos. Fee alto en micro |
| **MODO** | crece, API | 1.49–1.89% | Alternativa más barata |
| **Ualá Bis** | simple | desde 1.4%+IVA (acred. 30d) | La comisión más baja |
| **dLocal** ⭐ (cross-border) | API para cobrar a argentinos y **liquidar en USD/EUR** | ~4–6% negociado | **Interesante**: cobra en AR y te paga en USD → **alineado con pagarle a OpenRouter en USD** |
| Talo | transferencia bancaria, CVU por orden | 0.8–1% | Barato, pero transferencia (no tarjeta intl) |

**AR → Mercado Pago** si querés cobrar a consumidor final argentino (es el default), o **dLocal** si te
conviene **liquidar en USD** (porque el gasto es en USD a OpenRouter) y cobrar internacional.

## 4. Recomendación
- **Empezar con UNA pasarela internacional: Mollie.** Cubre NL/EU (iDEAL + tarjetas + SEPA), micropagos, webhook
  fácil, recurring. Un solo webhook → `/provision`. **Es el camino de menor código.**
- **Argentina, fase 2:** si hay demanda local, sumar **Mercado Pago** (cobro local) o **dLocal** (liquidación en
  USD). Ambos tienen webhook → el mismo `/provision`. Multi-pasarela = más laburo; sólo si lo pide el mercado.
- **Patrón de integración (cualquier pasarela):**
  1. UI "Suscribirme" → **link de pago** de la pasarela (con el email del cliente).
  2. Pago OK → **webhook** a un endpoint nuevo (`POST /pay-webhook`, verifica la firma de la pasarela).
  3. El webhook llama internamente a `/provision {email, limit:1}` → key OpenRouter + código.
  4. **Email** automático con el código (Resend/Mailgun/SES) — ver `suscripcion.md §9.1`.
- **Costo vs €1:** con Mollie iDEAL (€0.29) te queda ~€0.71 neto; con MP inmediato (6.49%) ~€0.94 pero fee%.
  Para €1/mes, **iDEAL/Mollie es lo más sano** en NL; en AR el fee% es inevitable.

## 5. Decisiones abiertas
- ¿**Recurrente** (Mollie subscriptions, se renueva solo) o **pago único de 1 mes** (link, vence en 30d como ya
  hace `/provision`)? El vencimiento de 30d ya está implementado → un **pago único mensual** encaja simple.
- ¿**Una** pasarela (Mollie, intl) o **multi** (Mollie + Mercado Pago para AR)?
- ¿El **webhook** vive en el proxy (`/pay-webhook`) o en el servicio de billing separado (`suscripcion.md §9.6`)?

## 6. Fuentes
- [Best Payment Gateways in the Netherlands 2026 — NOWPayments](https://nowpayments.io/blog/best-payment-gateways-netherlands)
- [Mollie vs Stripe vs Adyen (2026) — Codelevate](https://www.codelevate.com/blog/mollie-vs-stripe-vs-adyen-psp-comparison-2025)
- [Mollie + PayRequest — iDEAL €0.29 flat](https://payrequest.io/payment-providers/mollie)
- [Stripe vs Mollie Payment Links 2026 — PayRequest](https://payrequest.io/blog/stripe-vs-mollie-payment-links-2026)
- [Mejor pasarela de pago Argentina 2026 — GuiaDeSoftware](https://www.guiadesoftware.com/blog/mejor-pasarela-pago-argentina)
- [Pasarelas de pago en Argentina (2026) — Rebill](https://www.rebill.com/blog/pasarelas-pago-argentina)
- [Alternativas a Mercado Pago — Talo](https://talo.com.ar/blogs/alternativas-mercado-pago)
