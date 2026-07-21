// ==UserScript==
// @name         Sam's Club Receipt to JSON Parser (dev)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Parses Sam's Club order receipts into JSON and sends to a webhook.
// @author       OrderOps Agent
// @match        https://*.samsclub.com/*/orders/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=samsclub.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
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
        vendor: "Sam's Club",
        btnColor: "#0067a0", // Sam's Club Blue
        btnColorAlt: "#004b75",

        extract: async () => {
            const receipt = {
                store: "Sam's Club",
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

            // --- HEADER INFO ---
            const dateEl = document.querySelector('h1.print-bill-date');
            if (dateEl) receipt.date = window.OrderOps.formatDate(dateEl.textContent.trim());

            const tcEl = document.querySelector('.print-bill-bar-id');
            if (tcEl) receipt.receiptId = tcEl.textContent.replace('TC', '').trim();

            const storeHeaders = Array.from(document.querySelectorAll('h3'));
            const storeHeader = storeHeaders.find(h => h.textContent.includes('Store location'));
            if (storeHeader && storeHeader.parentElement.nextElementSibling) {
                const spans = storeHeader.parentElement.nextElementSibling.querySelectorAll('span');
                if (spans.length >= 2) {
                    receipt.storeName = spans[0].textContent.trim();
                    receipt.storeAddress = spans[1].textContent.trim();
                }
            }

            // --- PAYMENT INFO ---
            const ccImg = document.querySelector('.bill-order-payment-card img[alt]');
            const ccNum = document.querySelector('.bill-order-payment-card [data-sensitivity="severe"]');
            if (ccImg && ccNum) {
                receipt.paymentMethod = `${ccImg.alt} ${ccNum.textContent.trim()}`.trim();
            }

            // --- TOTALS ---
            const subtotalContainer = document.querySelector('.bill-order-payment-subtotal');
            if (subtotalContainer) {
                const amountSpan = subtotalContainer.querySelector('span.b');
                if (amountSpan) receipt.subtotal = window.OrderOps.cleanPrice(amountSpan.textContent);
            }

            const taxContainer = document.querySelector('.print-fees-item');
            if (taxContainer) {
                const taxMatch = taxContainer.textContent.match(/\$([0-9.]+)/);
                if (taxMatch) receipt.tax = window.OrderOps.cleanPrice(taxMatch[1]);
            }

            const totalContainer = document.querySelector('.bill-order-total-payment');
            if (totalContainer) {
                const spans = totalContainer.querySelectorAll('span.b');
                if (spans.length >= 2) receipt.total = window.OrderOps.cleanPrice(spans[1].textContent);
            }

            // --- ITEM EXTRACTION ---
            const itemNodes = document.querySelectorAll('[data-testid="itemtile-stack"]');
            itemNodes.forEach(node => {
                const nameEl = node.querySelector('[data-testid="productName"] span');
                if (!nameEl) return;

                const aEl = node.querySelector('a[link-identifier="itemClick"]');
                const imgEl = node.querySelector('img[data-testid="productTileImage"]');
                const priceEl = node.querySelector('[data-testid="line-price"] span');
                const qtyEl = node.querySelector('.bill-item-quantity');

                // Clean quantity string formats: "lb 4.44 lb" -> "4.44 lb" | "Qty 1" -> "1"
                let rawQty = qtyEl ? qtyEl.textContent.trim() : "1";
                if (rawQty.startsWith('Qty ')) rawQty = rawQty.replace('Qty ', '');
                else if (rawQty.startsWith('lb ')) rawQty = rawQty.replace(/^lb\s*/, ''); 

                // Clean image URL to remove sizing parameters
                let imgUrl = imgEl ? imgEl.src : "";
                if (imgUrl.includes('?')) imgUrl = imgUrl.split('?')[0];

                let itemUrl = "";
                if (aEl && aEl.getAttribute('href')) {
                    const href = aEl.getAttribute('href');
                    itemUrl = href.startsWith('http') ? href : window.location.origin + href;
                }

                receipt.items.push({
                    name: nameEl.textContent.trim(),
                    url: itemUrl,
                    imgUrl: imgUrl,
                    price: priceEl ? window.OrderOps.cleanPrice(priceEl.textContent) : "",
                    quantity: rawQty
                });
            });

            return receipt;
        }
    });
})();