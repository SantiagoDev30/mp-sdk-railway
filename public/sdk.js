(function () {

  const scripts = document.getElementsByTagName("script");
  const currentScript = scripts[scripts.length - 1];
  const baseUrl = currentScript.src.replace("/sdk.js", "");

  /* =========================
     UTILS INTERNAS (NO GLOBALES)
  ========================== */

  const utils = {

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
      if (document.getElementById("mp-sdk-styles")) return;

      const style = document.createElement("style");
      style.id = "mp-sdk-styles";
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
          border-radius:20px;
          padding:25px;
          position:relative;
          max-width:500px;
          transition: max-width .3s ease;
        }

        .mp-modal-sm {
          max-width:500px;
        }

        .mp-modal-lg {
          max-width:1100px;
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

  /* =========================
     SDK PRINCIPAL
  ========================== */

  window.MP_SDK = {

    openPayment: async function (config) {

      if (!config.amount) {
        console.error("Debe enviar el campo amount");
        return;
      }

      const response = await fetch(baseUrl + "/api/config");
      const { public_key } = await response.json();

      const primaryColor = config.primaryColor || "#0d6efd";
      const secondaryColor = config.secondaryColor || "#0b5ed7";

      utils.injectStyles(primaryColor, secondaryColor);

      let paymentController = null;
      let statusController = null;

      const overlay = utils.createOverlay();
      const modal = overlay.querySelector(".mp-modal");
      const modalBody = overlay.querySelector("#mp-body");

      function destroyBricks() {
        if (paymentController) {
          paymentController.unmount();
          paymentController = null;
        }
        if (statusController) {
          statusController.unmount();
          statusController = null;
        }
      }

      function closeModal() {
        destroyBricks();
        utils.destroyElement(overlay);
      }

      overlay.querySelector(".mp-close").onclick = closeModal;

      /* ================= STEP 1 ================= */

      function renderSummary() {

        modal.classList.remove("mp-modal-lg");
        modal.classList.add("mp-modal-sm"); 

        const summary = config.summary || [];
        const currency = config.currency || "S/";

        let summaryHTML = "";

        summary.forEach(item => {
          summaryHTML += `
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
            </div>
          `;
        });

        modalBody.innerHTML = `
          <h5>Resumen de Compra</h5>
          <div style="margin:15px 0;">
            ${summaryHTML}
            <hr>
            <div style="display:flex;justify-content:space-between;font-weight:bold;">
              <span>Total</span>
              <span style="color:${primaryColor}">
                ${currency} ${config.amount}
              </span>
            </div>
          </div>
          <div style="text-align:right;">
            <button class="mp-btn-primary" id="next-step">
              Continuar
            </button>
          </div>
        `;

        modalBody.querySelector("#next-step").onclick = renderPayment;
      }

      /* ================= STEP 2 ================= */

      function renderPayment() {

        modal.classList.remove("mp-modal-sm");
        modal.classList.add("mp-modal-lg");

        const summary = config.summary || [];
        const currency = config.currency || "S/";

        let summaryHTML = "";

        summary.forEach(item => {
          summaryHTML += `
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span>${item.label}</span>
              <span>${item.value}</span>
            </div>
          `;
        });

        modalBody.innerHTML = `
          <div style="display:flex;gap:30px;">
            
            <div style="flex:2;">
              <h6>Medios de pago</h6>
              <div id="payment-container"></div>
              <button id="back-step" style="margin-top:15px;">
                ← Volver
              </button>
            </div>

            <div style="flex:1;border-left:1px solid #eee;padding-left:20px;">
              <h6>Resumen</h6>
              ${summaryHTML}
              <hr>
              <div style="display:flex;justify-content:space-between;font-weight:bold;">
                <span>Total</span>
                <span style="color:${primaryColor}">
                  ${currency} ${config.amount}
                </span>
              </div>
            </div>

          </div>
        `;

        modalBody.querySelector("#back-step").onclick = renderSummary;

        renderPaymentBrick();
      }

      /* ================= PAYMENT BRICK ================= */

      function renderPaymentBrick() {

        if (!window.MercadoPago) {
          const script = document.createElement("script");
          script.src = "https://sdk.mercadopago.com/js/v2";
          script.onload = initPaymentBrick;
          document.body.appendChild(script);
        } else {
          initPaymentBrick();
        }
      }

      function initPaymentBrick() {

        const mp = new MercadoPago(public_key);
        const bricksBuilder = mp.bricks();

        bricksBuilder.create("payment", "payment-container", {

          initialization: {
            amount: Number(config.amount),
          },

          customization: {
            visual: {
              hideFormTitle: true,
              style: {
                theme: "bootstrap",
                customVariables: {
                  baseColor: String(primaryColor),
                  baseColorFirstVariant: String(secondaryColor),
                  baseColorSecondVariant: String(secondaryColor),
                  outlinePrimaryColor: String(primaryColor),
                  borderRadiusSmall: "20px",
                  borderRadiusMedium: "20px",
                  borderRadiusLarge: "20px",
                  borderRadiusFull: "20px",
                  formPadding: "10px",
                }
              },
            },
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              maxInstallments: 1
            },
          },

          callbacks: {

            onReady: () => {
              console.log("Payment Brick listo");
            },

            onSubmit: async (formData) => {

              const response = await fetch(baseUrl + "/api/process-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...formData,
                  transaction_amount: Number(config.amount)
                })
              });

              const result = await response.json();

              if (result.id) {
                destroyBricks();
                renderStatusScreen(result.id);
              }

            },

            onError: (error) => {
              console.error("Error Brick:", error);
            }

          }

        }).then(controller => {
          paymentController = controller;
        });
      }

      /* ================= STEP 3 ================= */

      function renderStatusScreen(paymentId) {

        modal.classList.remove("mp-modal-sm");
        modal.classList.add("mp-modal-lg");

        modalBody.innerHTML = `
          <div id="status-container"></div>
          <div style="text-align:right;margin-top:20px;">
            <button class="mp-btn-primary" id="close-status">
              Finalizar
            </button>
          </div>
        `;

        const mp = new MercadoPago(public_key);
        const bricksBuilder = mp.bricks();

        bricksBuilder.create("statusScreen", "status-container", {

          initialization: {
            paymentId: paymentId,
          },

          customization: {
            visual: {
              style: {
                theme: "bootstrap",
                customVariables: {
                  baseColor: String(primaryColor),
                  baseColorFirstVariant: String(secondaryColor),
                  baseColorSecondVariant: String(secondaryColor),
                  borderRadiusMedium: "20px",
                }
              }
            }
          },

          callbacks: {

            onReady: () => {
              console.log("Status Screen listo");
            },

            onError: (error) => {
              console.error("Error Status Screen:", error);
            }

          }

        }).then(controller => {
          statusController = controller;
        });

        modalBody.querySelector("#close-status").onclick = closeModal;
      }

      renderSummary();
    }
  };

})();