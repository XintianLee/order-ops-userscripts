window.OrderOps = window.OrderOps || {};

window.OrderOps.sendToWebhook = function(payload, onStatusChange) {
    const webhook_url = GM_getValue('webhook_url');
    if (!webhook_url) {
        onStatusChange('nocallback');
        GM_setValue('webhook_url');
        return;
    }

    onStatusChange('sending');

    GM_xmlhttpRequest({
        method: "POST",
        url: webhook_url,
        headers: {
            "Content-Type": "application/json"
        },
        data: JSON.stringify(payload, null, 2),
        onload: function(response) {
            if (response.status >= 200 && response.status < 300) {
                onStatusChange('success');
            } else {
                console.error("Webhook HTTP Error:", response);
                onStatusChange('error', response.status);
            }
        },
        onerror: function(error) {
            console.error("Webhook Network Error:", error);
            onStatusChange('network_error');
        }
    });
};