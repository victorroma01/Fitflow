/* ═══ core/brand ═══
   El logo de StrataFit dentro de la app (F-40): el del tema claro o el del tema oscuro, según el tema que se ve (el del móvil o
   el elegido en Ajustes). Van las dos imágenes y el CSS enseña la que toca (css/78-first-run, .brl). Las imágenes las genera
   tools/marca.py desde las fuentes de src/img/brand.
   Define: brandLogo
*/
import { BRAND_LOGOS } from '../data/photos.js';
import { html } from './html.js';
/** El logo, con la clase cls (tamaño y sitio). dark: siempre el del tema oscuro (el inicio de sesión, con su fondo oscuro). */
export const brandLogo = (cls, dark) => dark ? html`<img class="brl ${cls}" src="${BRAND_LOGOS.oscuro}" alt="StrataFit">` : html`<span class="brl ${cls}" role="img" aria-label="StrataFit"><img class="brl-c" src="${BRAND_LOGOS.claro}" alt=""><img class="brl-o" src="${BRAND_LOGOS.oscuro}" alt=""></span>`;
