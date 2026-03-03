(function () {

  const scripts = document.getElementsByTagName("script");
  const currentScript = scripts[scripts.length - 1];
  const baseUrl = currentScript.src.replace("/sdk.js", "");

  window.MP_SDK = {

    openPayment: async function (config) {

      if (!config.amount) {
        console.error("Debe enviar el campo amount");
        return;
      }

      const response = await fetch(baseUrl + "/api/config");
      const { public_key } = await response.json();

      const primaryColor = config.primaryColor || "#0d6efd";
      const secondaryColor = config.secondaryColor || primaryColor;

      let paymentController = null;
      let statusController = null;

      /* =========================
         SHADOW HOST
      ========================== */

      const host = document.createElement("div");
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });

      /* =========================
         BOOTSTRAP AISLADO
      ========================== */

      const bootstrapCSS = document.createElement("link");
      bootstrapCSS.rel = "stylesheet";
      bootstrapCSS.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
      shadow.appendChild(bootstrapCSS);

      /* =========================
         ESTILOS LOCALES
      ========================== */

      const style = document.createElement("style");
      style.textContent = `
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
        }

        .modal-container {
          background: #fff;
          width: 100%;
          max-width: 900px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          position: relative;
          padding: 20px;
        }

        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          border: none;
          background: transparent;
          font-size: 22px;
          cursor: pointer;
        }

        .mp-primary { color: ${primaryColor}; }

        .mp-btn-primary {
          background: ${primaryColor};
          border: none;
          color: #fff;
        }

        .mp-btn-primary:hover { opacity: 0.9; }
      `;
      shadow.appendChild(style);

      /* =========================
         OVERLAY
      ========================== */

      const overlay = document.createElement("div");
      overlay.className = "overlay";

      overlay.innerHTML = `
        <div class="modal-container">
          <button class="close-btn">&times;</button>
          <div id="mp-body"></div>
        </div>
      `;

      shadow.appendChild(overlay);

      const modalBody = overlay.querySelector("#mp-body");

      /* =========================
         CLEANUP
      ========================== */

      function destroyPaymentBrick() {
        if (paymentController) {
          paymentController.unmount();
          paymentController = null;
        }
      }

      function destroyStatusScreen() {
        if (statusController) {
          statusController.unmount();
          statusController = null;
        }
      }

      function closeModal() {
        destroyPaymentBrick();
        destroyStatusScreen();
        if (globalContainer) {
          document.body.removeChild(globalContainer);
        }
        document.body.removeChild(host);
      }

      overlay.querySelector(".close-btn").onclick = closeModal;

      /* =========================
         GLOBAL BRICK CONTAINER
         (Bridge para evitar error startsWith)
      ========================== */

      const globalContainer = document.createElement("div");
      globalContainer.id = "mp-global-container";
      globalContainer.style.display = "none";
      document.body.appendChild(globalContainer);

      /* =========================
         STEP 1 - RESUMEN
      ========================== */

      function renderSummary() {

        const summary = config.summary || [];
        const currency = config.currency || "S/";

        let summaryHTML = "";

        summary.forEach(item => {
          summaryHTML += `
            <div class="d-flex justify-content-between mb-2">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
            </div>
          `;
        });

        modalBody.innerHTML = `
          <h5 class="fw-bold mb-4">Resumen de Compra</h5>

          <div class="card border-0 shadow-sm rounded-4 p-4 mb-4">
            ${summaryHTML}
            <hr>
            <div class="d-flex justify-content-between fs-5">
              <strong>Total:</strong>
              <strong class="mp-primary">
                ${currency} ${config.amount}
              </strong>
            </div>
          </div>

          <div class="text-end">
            <button class="btn mp-btn-primary px-4" id="next-step">
              Continuar →
            </button>
          </div>
        `;

        modalBody.querySelector("#next-step").onclick = renderPayment;
      }

      /* =========================
         STEP 2 - PAYMENT
      ========================== */

      function renderPayment() {

        const summary = config.summary || [];
        const currency = config.currency || "S/";

        let summaryHTML = "";

        summary.forEach(item => {
          summaryHTML += `
            <div class="d-flex justify-content-between mb-2">
              <span>${item.label}</span>
              <span>${item.value}</span>
            </div>
          `;
        });

        modalBody.innerHTML = `
          <div class="container-fluid">
            <div class="row g-4">

              <div class="col-md-8">
                <div class="card border-0 shadow-sm rounded-4 p-4">
                  <h6 class="fw-bold mb-4">Medios de pago</h6>
                  <div id="shadow-payment-container"></div>
                  <button class="btn btn-outline-secondary mt-4" id="back-step">
                    ← Volver
                  </button>
                </div>
              </div>

              <div class="col-md-4">
                <div class="card border-0 shadow-sm rounded-4 p-4">
                  <h6 class="fw-bold mb-3">Resumen</h6>
                  ${summaryHTML}
                  <hr>
                  <div class="d-flex justify-content-between fs-5">
                    <strong>Total</strong>
                    <strong class="mp-primary">
                      ${currency} ${config.amount}
                    </strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        `;

        modalBody.querySelector("#back-step").onclick = renderSummary;

        renderPaymentBrick();
      }

      /* =========================
         PAYMENT BRICK
      ========================== */

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

        bricksBuilder.create("payment", "mp-global-container", {
          initialization: {
            amount: Number(config.amount)
          },
          appearance: {
            theme: "bootstrap",
            variables: {
              baseColor: primaryColor,
              baseColorFirstVariant: secondaryColor,
              baseColorSecondVariant: secondaryColor,
              borderRadiusMedium: "20px"
            }
          },
          callbacks: {

            onReady: () => {
              const shadowContainer =
                modalBody.querySelector("#shadow-payment-container");

              const brickContent =
                document.getElementById("mp-global-container");

              shadowContainer.appendChild(brickContent);
              brickContent.style.display = "block";
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
                destroyPaymentBrick();
                renderStatusScreen(result.id);
              }
            },

            onError: (error) => {
              console.error("Error Payment Brick:", error);
            }
          }

        }).then(controller => {
          paymentController = controller;
        });
      }

      /* =========================
         STATUS SCREEN
      ========================== */

      function renderStatusScreen(paymentId) {

        modalBody.innerHTML = `<div id="shadow-status-container"></div>`;

        const mp = new MercadoPago(public_key);
        const bricksBuilder = mp.bricks();

        bricksBuilder.create("statusScreen", "mp-global-container", {
          initialization: {
            paymentId: paymentId
          },
          appearance: {
            theme: "bootstrap",
            variables: {
              baseColor: primaryColor
            }
          },
          callbacks: {
            onReady: () => {
              const shadowContainer =
                modalBody.querySelector("#shadow-status-container");

              const brickContent =
                document.getElementById("mp-global-container");

              shadowContainer.appendChild(brickContent);
              brickContent.style.display = "block";
            },
            onError: (error) => {
              console.error("Error Status Screen:", error);
            }
          }

        }).then(controller => {
          statusController = controller;
        });
      }

      renderSummary();
    }
  };

})();