window.OrderOps = window.OrderOps || {};

window.OrderOps.registerScraper = function(config) {
    // config expects: { vendor: 'Name', btnColor: '#hex', extract: function() }
    
    const originalText = `📋 Extract ${config.vendor}`;
    const btn = window.OrderOps.createFloatingButton({ 
        text: originalText, 
        bgColor: config.btnColor,
        bgColorAlt: config.btnColorAlt
    });

    // Handle generic button state updates
    const updateUi = (status, detail) => {
        if (status === 'sending') btn.textContent = '⏳ Sending...';
        else if (status === 'success') window.OrderOps.setButtonState(btn, '✅ Sent!', '#2e7d32', originalText, config.btnColor);
        else if (status === 'nocallback') window.OrderOps.setButtonState(btn, '✅ Copied!', '#2e7d32', originalText, config.btnColor);
        else if (status === 'error') window.OrderOps.setButtonState(btn, `❌ Error: ${detail}`, '#d32f2f', originalText, config.btnColor);
    };

    // The universal click listener
    btn.addEventListener('click', async (e) => {
        try {
            e.target.disabled = true;
            // 1. Run the retailer-specific extraction function!
            const receiptData = await config.extract();
            
            // 2. Universal Output
            console.log(`🧾 Extracted ${config.vendor} JSON:`, receiptData);
            window.OrderOps.copyToClipboard(JSON.stringify(receiptData, null, 2));

            // 3. Universal Webhook Handoff
            window.OrderOps.sendToWebhook(receiptData, updateUi);

        } catch (error) {
            console.error(`Error parsing ${config.vendor} receipt:`, error);
            window.OrderOps.setButtonState(btn, '❌ Parse Error', '#d32f2f', originalText, config.btnColor);
            alert(`Error parsing ${config.vendor} receipt. Check console.`);
        } finally {
            e.target.disabled = false;
        }
    });
};

// Register the Settings Menu globally for all OrderOps scripts
GM_registerMenuCommand("⚙️ Edit Webhook URL", () => {
    const currentUrl = GM_getValue("webhook_url", "");
    const newUrl = prompt("Enter your Webhook URL:", currentUrl)?.trim();

    if (newUrl) {
        GM_setValue("webhook_url", newUrl);
        alert("Configuration saved successfully!");
    }
});