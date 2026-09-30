const http = require('http');

http.get('http://127.0.0.1:9222/json/list', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', async () => {
    const wsUrl = JSON.parse(d)[0].webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);
    ws.onopen = async () => {
      let id = 1;
      const send = (m, p = {}) => new Promise(r => {
        const i = id++;
        const h = e => {
          const res = JSON.parse(e.data);
          if (res.id === i) {
            ws.removeEventListener('message', h);
            r(res.result);
          }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: i, method: m, params: p }));
      });
      await send('Page.navigate', { url: 'http://127.0.0.1:5173/service.html' });
      await new Promise(r => setTimeout(r, 1200));
      const res = await send('Runtime.evaluate', {
        expression: `
          (function() {
            const footer = document.querySelector('.site-footer');
            const cta = document.querySelector('.appointment-cta-banner');
            const promo = document.querySelector('.service-estimator-promo-banner');
            const sec = promo ? promo.closest('section') : null;
            const ctaCard = cta ? cta.querySelector('.cta-banner-card') : null;
            return {
              secPaddingBottom: sec ? window.getComputedStyle(sec).paddingBottom : null,
              promoMarginTop: promo ? window.getComputedStyle(promo).marginTop : null,
              ctaPaddingTop: cta ? window.getComputedStyle(cta).paddingTop : null,
              ctaPaddingBottom: cta ? window.getComputedStyle(cta).paddingBottom : null,
              gapBetweenPromoAndCta: (cta && promo) ? (cta.getBoundingClientRect().top - promo.getBoundingClientRect().bottom) : null,
              gapBetweenCtaAndFooter: (footer && cta) ? (footer.getBoundingClientRect().top - cta.getBoundingClientRect().bottom) : null,
              ctaCardBottomToFooterTop: (footer && ctaCard) ? (footer.getBoundingClientRect().top - ctaCard.getBoundingClientRect().bottom) : null
            };
          })()
        `,
        returnByValue: true
      });
      console.log('service.html layout:', res.result.value);

      await send('Page.navigate', { url: 'http://127.0.0.1:5173/about.html' });
      await new Promise(r => setTimeout(r, 1200));
      const resAbout = await send('Runtime.evaluate', {
        expression: `
          (function() {
            const footer = document.querySelector('.site-footer');
            const cta = document.querySelector('.appointment-cta-banner');
            const prevSec = cta ? cta.previousElementSibling : null;
            const ctaCard = cta ? cta.querySelector('.cta-banner-card') : null;
            return {
              prevSecClass: prevSec ? prevSec.className : null,
              prevSecPaddingBottom: prevSec ? window.getComputedStyle(prevSec).paddingBottom : null,
              ctaPaddingTop: cta ? window.getComputedStyle(cta).paddingTop : null,
              ctaPaddingBottom: cta ? window.getComputedStyle(cta).paddingBottom : null,
              gapPrevSecToCta: (prevSec && cta) ? (cta.getBoundingClientRect().top - prevSec.getBoundingClientRect().bottom) : null,
              gapCtaToFooter: (footer && cta) ? (footer.getBoundingClientRect().top - cta.getBoundingClientRect().bottom) : null,
              ctaCardBottomToFooter: (footer && ctaCard) ? (footer.getBoundingClientRect().top - ctaCard.getBoundingClientRect().bottom) : null
            };
          })()
        `,
        returnByValue: true
      });
      console.log('about.html layout:', resAbout.result.value);

      process.exit(0);
    };
  });
});
