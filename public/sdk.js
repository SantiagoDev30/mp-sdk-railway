(function () {

  const scripts = document.getElementsByTagName("script");
  const currentScript = scripts[scripts.length - 1];
  const baseUrl = currentScript.src.replace("/sdk.js", "");

  function loadBootstrap(callback) {
    if (!document.getElementById("mp-bootstrap")) {
      const link = document.createElement("link");
      link.id = "mp-bootstrap";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
      document.head.appendChild(link);
    }
    callback();
  }

  window.MP_SDK = {

    openPayment: async function (config) {

      if (!config.amount) {
        console.error("Debe enviar el campo amount");
        return;
      }

      loadBootstrap(async function () {

        const response = await fetch(baseUrl + "/api/config");
        const { public_key } = await response.json();

        const primaryColor = config.primaryColor || "#0d6efd";

        const style = document.createElement("style");
        style.innerHTML = `
          .mp-primary { color: ${primaryColor}; }
          .mp-btn-primary {
            background-color: ${primaryColor};
            border-color: ${primaryColor};
            color: #fff;
          }
          .mp-btn-primary:hover {
            opacity: 0.9;
          }
        `;
        document.head.appendChild(style);

        let currentStep = 1;

        const overlay = document.createElement("div");
        overlay.className = "modal fade show";
        overlay.style.display = "block";
        overlay.style.background = "rgba(0,0,0,0.5)";
        overlay.style.zIndex = "9999";

        overlay.innerHTML = `
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content rounded-4 shadow">
              <div class="modal-body p-4" id="mp-modal-body"></div>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        const modalBody = document.getElementById("mp-modal-body");

        function renderStep() {

          /* ================= STEP 1 ================= */

          if (currentStep === 1) {

            overlay.querySelector(".modal-dialog").className =
              "modal-dialog modal-md modal-dialog-centered";

            const summary = config.summary || [];
            const currency = config.currency || "S/";

            let summaryHTML = "";

            summary.forEach(item => {
              summaryHTML += `
                <div class="d-flex justify-content-between mb-3">
                  <span>${item.label}</span>
                  <strong>${item.value}</strong>
                </div>
              `;
            });

            modalBody.innerHTML = `
              <h5 class="fw-bold mb-4">Resumen de Compra</h5>

              <div class="card border-0 shadow-sm rounded-4 p-4">
                ${summaryHTML}
                <hr>
                <div class="d-flex justify-content-between fs-5 mt-3">
                  <strong>Total a pagar:</strong>
                  <strong class="mp-primary">
                    ${currency} ${config.amount}
                  </strong>
                </div>
              </div>

              <div class="text-end mt-4">
                <button class="btn mp-btn-primary px-5" id="next-step">
                  Continuar →
                </button>
              </div>
            `;

            document.getElementById("next-step").onclick = () => {
              currentStep = 2;
              renderStep();
            };
          }

          /* ================= STEP 2 ================= */

          else if (currentStep === 2) {

            overlay.querySelector(".modal-dialog").className =
              "modal-dialog modal-lg modal-dialog-centered";

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

                  <!-- MEDIOS DE PAGO -->
                  <div class="col-md-8">
                    <div class="card border-0 shadow-sm rounded-4 p-4">

                      <h6 class="fw-bold mb-4">Medios de pago</h6>

                      <div id="payment-container"></div>

                      <div class="mt-4">
                        <button class="btn btn-outline-secondary" id="back-step">
                          ← Volver
                        </button>
                      </div>

                    </div>
                  </div>

                  <!-- RESUMEN -->
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

            document.getElementById("back-step").onclick = () => {
              currentStep = 1;
              renderStep();
            };

            renderBrick();
          }

          /* ================= STEP 3 ================= */

          else if (currentStep === 3) {

            modalBody.innerHTML = `
              <div class="text-center py-5">
                <h4 class="text-success fw-bold mb-3">Pago Aprobado</h4>
                <p>Tu pago fue procesado correctamente.</p>
                <button class="btn mp-btn-primary mt-4 px-5" id="close-modal">
                  Finalizar
                </button>
              </div>
            `;

            document.getElementById("close-modal").onclick = () => {
              document.body.removeChild(overlay);
            };
          }
        }

        function renderBrick() {

          if (!window.MercadoPago) {
            const script = document.createElement("script");
            script.src = "https://sdk.mercadopago.com/js/v2";
            script.onload = () => initBrick();
            document.body.appendChild(script);
          } else {
            initBrick();
          }

          function initBrick() {

            const mp = new MercadoPago(public_key);
            const bricksBuilder = mp.bricks();

            bricksBuilder.create("payment", "payment-container", {
              initialization: {
                amount: Number(config.amount),
              },
              customization: {
                visual: {
                  style: {
                    theme: "bootstrap",
                  },
                },
                paymentMethods: {
                  creditCard: "all",
                  debitCard: "all",
                  ticket: "all",
                  bankTransfer: "all",
                  onboarding_credits: "all",
                  wallet_purchase: "all",
                  maxInstallments: 1
                },
              },
              callbacks: {

                onReady: () => {
                  console.log("Brick listo");
                },

                onSubmit: async (formData) => {

                  buyerData = {
                    name: document.getElementById("buyer-name").value,
                    email: document.getElementById("buyer-email").value
                  };

                  const response = await fetch(baseUrl + "/api/process-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...formData,
                      transaction_amount: Number(config.amount),
                      payer: {
                        email: buyerData.email
                      }
                    })
                  });

                  const result = await response.json();

                  if (result.status === "approved") {
                    currentStep = 3;
                    renderStep();
                  } else {
                    alert("Pago rechazado o pendiente");
                  }
                },

                onError: (error) => {
                  console.error("Error Brick:", error);
                }
              }
            });
          }
        }

        renderStep();
      });
    }
  };

})();