/** The assistant persona name shown on attributed transcript rows.
 *
 *  Derived from the desktop package identity (`aro-desktop` → "Aro"). Keep in
 *  sync with `product-identity.cjs` / `package.json` `name` when the fork's
 *  product name changes — there is deliberately no second source of truth in
 *  the renderer (the electron-side PRODUCT_IDENTITY cannot be imported here).
 */
export const ASSISTANT_PERSONA_NAME = 'Aro'
