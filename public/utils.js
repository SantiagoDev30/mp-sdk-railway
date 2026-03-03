window.MP_UTILS = {

  createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "mp-overlay";
    overlay.innerHTML = `
      <div class="mp-modal">
        <button class="mp-close">&times;</button>
        <div id="mp-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  },

  destroyElement(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  },

  injectStyles(primary, secondary) {
    const style = document.createElement("style");
    style.innerHTML = `
      .mp-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.5);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:999999;
      }

      .mp-modal {
        background:#fff;
        width:100%;
        max-width:500px;
        border-radius:20px;
        padding:25px;
        position:relative;
      }

      .mp-modal-lg {
        max-width:1000px;
      }

      .mp-close {
        position:absolute;
        top:15px;
        right:15px;
        background:none;
        border:none;
        font-size:22px;
        cursor:pointer;
      }

      .mp-btn-primary {
        background:${primary};
        color:#fff;
        border:none;
        border-radius:40px;
        padding:10px 25px;
      }

      .mp-btn-primary:hover {
        background:${secondary};
        color:#fff;
      }
    `;
    document.head.appendChild(style);
  }

};