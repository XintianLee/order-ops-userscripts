// ==UserScript==
// @name         Target Receipt to JSON Parser (dev)
// @namespace    http://tampermonkey.net/
// @version      2026-07-07
// @description  Parses Target order receipts into JSON and sends to a webhook.
// @author       OrderOps Agent
// @match        https://*.target.com/orders/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=target.com
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
        vendor: "Target",
        btnColor: "#cc0000", // Target Red
        btnColorAlt: "#a40000",

        extract: async () => {
            const receipt = {
                store: "Target",
                receiptId: "",
                date: "",
                storeLocation: "",
                paymentMethod: "",
                totals: {
                    subtotal: 0,
                    discountsTotal: 0,
                    tax: 0,
                    grandTotal: 0
                },
                discounts: [],
                items: []
            };

            // Helper to safely grab text content without throwing null errors
            const getText = (selector) => {
                const el = document.querySelector(selector);
                return el ? el.textContent.trim() : "";
            };

            // 1. Top-Level Order Info
            receipt.receiptId = getText('[data-test="store-order-details-receipt-id"]').replace('#', '');

            // Extract the date from the text "Purchased on December 13, 2025 6:37 PM"
            const rawDateNode = document.evaluate("//div[contains(text(), 'Purchased on')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (rawDateNode) {
                receipt.date = window.OrderOps.formatDate(rawDateNode.textContent.replace('Purchased on ', ''));
            }

            // 2. Store Location
            const locationNode = document.evaluate("//p[text()='Store Location']/following-sibling::div", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (locationNode) {
                receipt.storeLocation = locationNode.textContent.trim();
            }

            // 3. Payment Method
            const cardType = getText('[data-test="breakdown-payment_sub_type_value"]');
            const cardNum = getText('[data-test="breakdown-card_number"]');
            receipt.paymentMethod = `${cardType} ${cardNum}`.trim();

            // 4. Totals Breakdown
            receipt.totals.subtotal = window.OrderOps.cleanPrice(getText('[data-test="sub-total-value"]'));
            receipt.totals.tax = window.OrderOps.cleanPrice(getText('[data-test="tax-total"]'));
            receipt.totals.discountsTotal = window.OrderOps.cleanPrice(getText('[data-test="discount-value"]'));

            // The grand total sits inside a specific grid container
            const grandTotalEl = document.querySelector('.paymentBreakdown_paymentBreakdownGrid__L5Xq8[data-test="grand-total"] .paymentBreakdown_summaryValue__9BF2O');
            if (grandTotalEl) {
                receipt.totals.grandTotal = window.OrderOps.cleanPrice(grandTotalEl.textContent);
            }

            // 5. Line-Item Discounts Loop
            // Target intelligently numbers their discounts starting at 0
            let dIndex = 0;
            while (document.querySelector(`[data-test="discount-breakdown-heading-${dIndex}"]`)) {
                receipt.discounts.push({
                    description: getText(`[data-test="discount-breakdown-heading-${dIndex}"]`),
                    amount: window.OrderOps.cleanPrice(getText(`[data-test="discount-breakdown-value-${dIndex}"]`))
                });
                dIndex++;
            }

            // 6. Purchased Items Loop
            const itemNodes = document.querySelectorAll('.styles_styledPackageItem__Uez2M');
            for (const node of itemNodes) {
                const nameEl = node.querySelector('h3.styles_packageItemTitle__BOHNt');
                if (!nameEl) return; // Skip if it's not a real product row

                const priceEl = node.querySelector('[data-test="order-price"]');
                const imgEl = node.querySelector('img.styles_pictureLazy__1fLzp');

                node.querySelector('button.styles_styledBaseIconButton__1fvUp').click();
                await new Promise((resolve) => setTimeout(resolve, 500));
                const linkEl = document.querySelector('div.ModalDrawer a.styles_invertDecorate__Vx5Wz');

                // Find the specific paragraph that contains the word "Qty"
                const qtyEl = Array.from(node.querySelectorAll('p')).find(p => p.textContent.includes('Qty'));

                receipt.items.push({
                    name: nameEl.textContent.trim(),
                    // Strip the " each" text that target sometimes appends to multi-quantity items
                    price: priceEl ? window.OrderOps.cleanPrice(priceEl.textContent.replace('each', '')) : "",
                    quantity: qtyEl ? qtyEl.textContent.replace('Qty', '').trim() : "1",
                    imgUrl: imgEl ? imgEl.src.replace(/(wid|hei)=\d+/g, '$1=800') : null,
                    url: linkEl ? linkEl.href : null,
                });
            }

            return receipt;
        }
    });
})();