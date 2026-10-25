# Pickquote Customer Experience

Updated 2026-10-25. Scope: home, quote, quote lookup, brand, subscription, shopping and privacy. This is an implementation in the existing application, not a hosting migration.

## Reference Review

Sources were reviewed for different jobs, not copied as a template:

- https://ohou.se/ : inspected live desktop screenshot and retrieved branding. White navigation, real product/living imagery and category-led discovery. Retrieved body font: Pretendard; body size 16px. Its blue is not our chosen accent.
- https://www.backmarket.com/en-us : inspected live desktop screenshot and retrieved branding. Product-first commerce, restrained control shapes, direct navigation and clear distinction between merchandise and service promises. Its campaign lime and lavender are not copied.
- https://toss.im/ : inspected live desktop screenshot and retrieved branding. Broad photographic scene and strong hierarchy with limited navigation. Its proprietary Toss font and large animated marketing treatment are not reused.
- https://www.typeform.com/ and https://www.typeform.com/templates-sub-category/quote : retrieved page structure and branding and inspected the live homepage. Its dynamic hero did not fully render in the capture, so no claim of reproducing its animations or inspecting a complete quote submission flow. Progressive questions are an interaction reference, not a copied implementation.
- https://www.heydealer.com/sell : read the current service structure and entry action. Quote comparison starts before long process explanations. Do not reuse its car-specific numerical promises for appliances.
- Previously inspected Wix Electronics Store Modern and Furniture Manufacturer Modern: https://www.wix.com/website-template/view/html/4888 and https://www.wix.com/website-template/view/html/4733 . Useful for imagery and hierarchy, not an instruction to retain the former navy design.

## Chosen Direction

The user explicitly released the previous navy requirement and rejected the centered coral proposal. The replacement has a white and charcoal foundation, a full-bleed appliance interior illustration, and one blue action accent. These are our choices, not extracted measurements from any reference.

Tokens:
- Action: #3067e2; hover: #2150bf; selected surface: #eef3ff.
- Text: #202727; secondary text: #626b70.
- Background: #ffffff; product stage: #edf4f8; quiet surface: #f5f7f7.
- Dividers: #dfe4e5.

Keep locally served SUIT Variable. Body 17px/450; ordinary controls 16-18px/550-650; section headings 27-32px; home category headline 56px desktop and 36px mobile. Letter spacing is zero. Manufacturer logos retain their identity. Existing Pickquote logo pixels are presented in monochrome through CSS, not replaced with invented branding.

## Composition And Paths

Home:
navigation
left-aligned literal service category + short supporting sentence
two real entry actions
full-bleed appliance interior illustration behind the entry actions
square category entries
real comparison examples
horizontal process strip
FAQ and partner registration

No split lifestyle-photo card or centered cutout stack. No fabricated bid amounts, ratings, live activity or stock-product claims. The new hero is generated illustrative artwork (public/assets/pickquote-appliance-space-20261025.webp, 1920 by 819), not a photograph of a real installation or LG/Samsung model evidence. It is decorative and never used for model recommendations. Existing manufacturer cutouts remain in their relevant category entries. The former centered cutout hero has been removed from the markup.

Each home entry carries its own quote mode. It does not depend on an invisible radio selection. Matching drafts survive; switching modes follows the existing reset rules. Quote-less users select products and options before identity verification. Actual image previews appear only with a quote and an attached image.

The question surface is 680px wide on desktop with compact choice rows. Repeated purpose descriptions and the subscription detour have been removed. The page title and back control share one compact row. A non-private selection context shows purpose, brand and chosen products, never phone or name. Mobile uses the same question order with fixed navigation and sufficient bottom clearance. Brand selection uses small logo tabs instead of duplicate large banners. Product browsing retains filters, category navigation and functional consultation dialogs.

## Boundaries

No backend authorization, phone disclosure, retention, authentication or AI recommendation policies changed in this renewal. Kakao remains the recognizable yellow exception. No third-party template code, proprietary fonts or site assets are redistributed.
