// ==UserScript==
// @name         Walmart Receipt to JSON Parser (dev)
// @namespace    http://tampermonkey.net/
// @version      2026-07-07
// @description  Parses Walmart order receipts into JSON and sends to a webhook.
// @author       OrderOps Agent
// @match        https://*.walmart.com/orders/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=walmart.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      ./shared/core.js
// @require      ./shared/ui.js
// @require      ./shared/utils.js
// @require      ./shared/dispatcher.js
// ==/UserScript==

(function() {
    'use strict';

    window.OrderOps.registerScraper({
        vendor: "Walmart",
        btnColor: "#0071ce", // Walmart Blue
        btnColorAlt: "#005ea6",

        // This function strictly returns the JSON object
        extract: async () => {
            const receipt = {
                store: "Walmart",
                date: "",
                storeName: "",
                storeAddress: "",
                paymentMethod: "",
                receiptId: "",
                subtotal: "",
                tax: "",
                total: "",
                items: []
            };

            const dateEl = document.querySelector('h2.ld_E4.ld_E9.ld_E6.f3');
            if (dateEl) receipt.date = window.OrderOps.formatDate(dateEl.textContent.replace(' purchase', '').trim());

            const storeHeaders = Array.from(document.querySelectorAll('h3'));
            const storeHeader = storeHeaders.find(h => h.textContent.includes('Store location'));
            if (storeHeader) {
                const spans = storeHeader.parentElement.parentElement.querySelectorAll('p span');
                if (spans.length >= 2) {
                    receipt.storeName = spans[0].textContent.trim();
                    receipt.storeAddress = spans[1].textContent.trim();
                }
            }

            const paymentEl = document.querySelector('[aria-labelledby^="card-description-"]');
            if (paymentEl) receipt.paymentMethod = paymentEl.textContent.trim();

            const tcSpans = Array.from(document.querySelectorAll('span'));
            const tcEl = tcSpans.find(s => s.textContent.includes('TC#'));
            if (tcEl) receipt.receiptId = tcEl.textContent.replace('TC#', '').trim();

            const totalEl = tcSpans.find(s => s.textContent.trim() === 'Total');
            if (totalEl && totalEl.nextElementSibling) {
                receipt.total = window.OrderOps.cleanPrice(totalEl.nextElementSibling.textContent);
            }

            const subtotalEl = tcSpans.find(s => s.textContent.trim() === 'Subtotal');
            if (subtotalEl && subtotalEl.nextElementSibling) {
                receipt.subtotal = window.OrderOps.cleanPrice(subtotalEl.parentElement.parentElement.textContent.match(/\$([0-9.]+)/)?.[1] || "");
            }

            const taxEl = tcSpans.find(s => s.textContent.trim() === 'Tax');
            if (taxEl && taxEl.parentElement && taxEl.parentElement.nextElementSibling) {
                 receipt.tax = window.OrderOps.cleanPrice(taxEl.parentElement.nextElementSibling.textContent);
            }

            const itemNodes = document.querySelectorAll('[data-testid="itemtile-stack"]');
            itemNodes.forEach(node => {
                const nameEl = node.querySelector('[data-testid="productName"]');
                if (!nameEl) return;

                const aEl = node.querySelector('a[href*="/ip/"]');
                const imgEl = node.querySelector('img[data-testid="productTileImage"]');
                const priceEl = node.querySelector('[data-testid="line-price"]');
                const qtyEl = node.querySelector('.bill-item-quantity');

                receipt.items.push({
                    name: nameEl.textContent.trim(),
                    url: aEl ? (aEl.href.startsWith('http') ? aEl.href : window.location.origin + aEl.getAttribute('href')) : "",
                    imgUrl: imgEl ? imgEl.src.split('?')[0] : "",
                    price: priceEl ? window.OrderOps.cleanPrice(priceEl.textContent) : "",
                    quantity: qtyEl ? qtyEl.textContent.replace('Qty ', '').replace('Wt ', '').trim() : "1"
                });
            });

            // Return the finished payload to the Core Engine
            return receipt;
        }
    });
})();