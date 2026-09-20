/* Font catalogue + colour palette shared by the site and the admin settings panel.
   src: 'g' = Google Fonts, 'm' = fonts.maateen.me (Bangla), 'sys' = system stack. */
(function () {
    'use strict';

    function g(name, bn) { return { name: name, family: '"' + name + '"', src: 'g', bn: !!bn }; }
    function m(name, slug) { return { name: name + ' (বাংলা)', family: '"' + name + '"', src: 'm', slug: slug, bn: true }; }

    var FONTS = [
        { name: 'System Default', family: 'system-ui, -apple-system, "Segoe UI", sans-serif', src: 'sys', bn: false },

        /* ---- Bangla (Google) ---- */
        g('Noto Sans Bengali', true), g('Noto Serif Bengali', true), g('Hind Siliguri', true),
        g('Baloo Da 2', true), g('Atma', true), g('Mina', true), g('Galada', true),
        g('Tiro Bangla', true), g('Anek Bangla', true),

        /* ---- Bangla (classic web fonts) ---- */
        m('SolaimanLipi', 'solaiman-lipi'), m('Kalpurush', 'kalpurush'), m('Siyam Rupali', 'siyam-rupali'),
        m('Nikosh', 'nikosh'), m('Mukti', 'mukti'), m('AdorshoLipi', 'adorsho-lipi'),
        m('Akaash', 'akaash'), m('AponaLohit', 'apona-lohit'), m('Bensen', 'bensen'),
        m('CharuChandan', 'charu-chandan'), m('Ekushey Lohit', 'ekushey-lohit'),
        m('Likhan', 'likhan'), m('Mitra', 'mitra'), m('Ruposhee Bangla', 'ruposhee-bangla'),
        m('Sagar', 'sagar'), m('Shorif', 'shorif'),

        /* ---- English / Latin ---- */
        g('Work Sans'), g('Playfair Display'), g('Inter'), g('Roboto'), g('Open Sans'), g('Lato'),
        g('Montserrat'), g('Poppins'), g('Raleway'), g('Oswald'), g('Merriweather'), g('Nunito'),
        g('Nunito Sans'), g('Ubuntu'), g('Rubik'), g('Mulish'), g('Manrope'), g('Karla'), g('Cabin'),
        g('Quicksand'), g('Josefin Sans'), g('Barlow'), g('DM Sans'), g('DM Serif Display'),
        g('Fira Sans'), g('PT Sans'), g('PT Serif'), g('Source Sans 3'), g('Source Serif 4'),
        g('Noto Sans'), g('Noto Serif'), g('Lora'), g('Bitter'), g('Crimson Text'), g('EB Garamond'),
        g('Libre Baskerville'), g('Cormorant Garamond'), g('Spectral'), g('Arvo'), g('Zilla Slab'),
        g('Roboto Slab'), g('Titillium Web'), g('Exo 2'), g('Space Grotesk'), g('Space Mono'),
        g('JetBrains Mono'), g('IBM Plex Sans'), g('IBM Plex Serif'), g('IBM Plex Mono'),
        g('Inconsolata'), g('Fira Code'), g('Archivo'), g('Archivo Black'), g('Anton'),
        g('Bebas Neue'), g('Teko'), g('Righteous'), g('Fredoka'), g('Baloo 2'), g('Comfortaa'),
        g('Pacifico'), g('Lobster'), g('Great Vibes'), g('Satisfy'), g('Caveat'), g('Dancing Script'),
        g('Shadows Into Light'), g('Indie Flower'), g('Permanent Marker'), g('Bangers'), g('Chewy'),
        g('Abril Fatface'), g('Alfa Slab One'), g('Cinzel'), g('Marcellus'), g('Philosopher'),
        g('Prata'), g('Yeseva One'), g('Sora'), g('Outfit'), g('Figtree'), g('Plus Jakarta Sans'),
        g('Urbanist'), g('Epilogue'), g('Syne'), g('Lexend'), g('Public Sans'), g('Red Hat Display'),
        g('Hind'), g('Assistant'), g('Heebo'), g('Overpass'), g('Asap'), g('Catamaran'),
        g('Kanit'), g('Prompt'), g('Mukta'), g('Rajdhani'), g('Signika'), g('Domine'),
        g('Vollkorn'), g('Cardo'), g('Neuton'), g('Alegreya'), g('Alegreya Sans'), g('Bree Serif')
    ];

    var THEMES = [
        { name: 'Deep Teal', color: '#083F43' }, { name: 'Indigo', color: '#4338CA' },
        { name: 'Royal Blue', color: '#1D4ED8' }, { name: 'Sky', color: '#0284C7' },
        { name: 'Cyan', color: '#0891B2' }, { name: 'Teal', color: '#0D9488' },
        { name: 'Emerald', color: '#059669' }, { name: 'Green', color: '#16A34A' },
        { name: 'Forest', color: '#166534' }, { name: 'Olive', color: '#4D7C0F' },
        { name: 'Lime', color: '#65A30D' }, { name: 'Amber', color: '#D97706' },
        { name: 'Orange', color: '#EA580C' }, { name: 'Pumpkin', color: '#C2410C' },
        { name: 'Red', color: '#DC2626' }, { name: 'Crimson', color: '#B91C1C' },
        { name: 'Maroon', color: '#7F1D1D' }, { name: 'Rose', color: '#E11D48' },
        { name: 'Pink', color: '#DB2777' }, { name: 'Fuchsia', color: '#C026D3' },
        { name: 'Purple', color: '#9333EA' }, { name: 'Violet', color: '#7C3AED' },
        { name: 'Plum', color: '#6D28D9' }, { name: 'Navy', color: '#1E3A8A' },
        { name: 'Steel', color: '#334155' }, { name: 'Slate', color: '#475569' },
        { name: 'Graphite', color: '#1F2937' }, { name: 'Charcoal', color: '#111827' },
        { name: 'Bronze', color: '#92400E' }, { name: 'Coffee', color: '#78350F' },
        { name: 'Gold', color: '#B45309' }, { name: 'Mint', color: '#047857' },
        { name: 'Sea Green', color: '#0F766E' }, { name: 'Ocean', color: '#075985' },
        { name: 'Cobalt', color: '#1E40AF' }, { name: 'Electric', color: '#2563EB' },
        { name: 'Magenta', color: '#A21CAF' }, { name: 'Wine', color: '#831843' },
        { name: 'Copper', color: '#9A3412' }, { name: 'Moss', color: '#3F6212' }
    ];

    window.SiteFonts = { list: FONTS, themes: THEMES };
})();
