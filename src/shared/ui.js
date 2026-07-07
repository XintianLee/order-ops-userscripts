// Responsible for DOM injection of generic UI elements and visual state management.

window.OrderOps = window.OrderOps || {};

window.OrderOps.createFloatingButton = function(options) {
    const btn = document.createElement('button');
    btn.textContent = options.text || '📋 Extract Data';
    options.bgColor = options.bgColor || '#0071ce';
    options.bgColorAlt = options.bgColorAlt || '#005ea6';
    
    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        padding: '12px 20px',
        backgroundColor: options.bgColor,
        color: 'white',
        border: 'none',
        borderRadius: '50px',
        fontWeight: 'bold',
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        transition: 'background-color 0.2s'
    });

    btn.onmouseover = () => { 
        if(btn.style.backgroundColor === window.OrderOps.hexToRgb(options.bgColor))
            btn.style.backgroundColor = options.bgColorAlt;
    };
    btn.onmouseout = () => {
        if(btn.style.backgroundColor === window.OrderOps.hexToRgb(options.bgColorAlt))
            btn.style.backgroundColor = options.bgColor;
    };

    document.body.appendChild(btn);
    return btn;
};

window.OrderOps.setButtonState = function(btn, text, color, originalText, originalColor) {
    btn.textContent = text;
    btn.style.backgroundColor = color;
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = originalColor;
    }, 3000);
};

window.OrderOps.copyToClipboard = function(text) {
    if (typeof GM_setClipboard !== "undefined") {
        GM_setClipboard(text, "text");
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
};

window.OrderOps.hexToRgb = function (hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return result ? 
        `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` 
        : hex;
}