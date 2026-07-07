window.OrderOps = window.OrderOps || {};

window.OrderOps.formatDate = function(rawDate) {
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        return d.toISOString().split('T')[0];
    } catch(e) {
        return new Date().toISOString().split('T')[0];
    }
};

window.OrderOps.cleanPrice = function(priceString) {
    if (!priceString) return "";
    return priceString.replace('$', '').trim();
};