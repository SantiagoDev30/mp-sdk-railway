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

      loadBootstrap(async function () {

        const configResponse = await fetch(baseUrl + "/api/config");
        const { public_key } = await configResponse.json();

        let currentStep = 1;
        let buyerData = {};

        const overlay = document.createElement("div");
        overlay.className = "modal fade show";
        overlay.style.display = "block";
        overlay.style.background = "rgba(0,0,0,0.5)";
        overlay.style.zIndex = "9999";

        overlay.innerHTML = `
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content shadow-lg rounded-4">
              <div class="modal-body p-4" id="mp-modal-body"></div>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        const modalBody = document.getElementById("mp-modal-body");

        function renderStep() {

          /* ================= STEP 1 ================= */

          if (currentStep === 1) {

            modalBody.innerHTML = `
              <h4 class="mb-4">Resumen del pedido</h4>
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-body">
                  <h5>${config.title}</h5>
                  <p class="mb-1">Subtotal: S/ ${config.price}</p>
                  <p class="fw-bold fs-5">Total: S/ ${config.price}</p>
                </div>
              </div>

              <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-outline-secondary" id="close-modal">Cancelar</button>
                <button class="btn btn-primary" id="next-step">Continuar</button>
              </div>
            `;

            document.getElementById("next-step").onclick = () => {
              currentStep = 2;
              renderStep();
            };

            document.getElementById("close-modal").onclick = () => {
              document.body.removeChild(overlay);
            };
          }

          /* ================= STEP 2 ================= */

          else if (currentStep === 2) {

            modalBody.innerHTML = `
              <h4 class="mb-4">Datos del comprador</h4>

              <div class="mb-3">
                <label class="form-label">Nombre completo</label>
                <input type="text" class="form-control" id="buyer-name">
              </div>

              <div class="mb-3">
                <label class="form-label">Correo electrónico</label>
                <input type="email" class="form-control" id="buyer-email">
              </div>

              <div class="d-flex justify-content-between">
                <button class="btn btn-outline-secondary" id="back-step">Atrás</button>
                <button class="btn btn-primary" id="next-step">Continuar</button>
              </div>
            `;

            document.getElementById("back-step").onclick = () => {
              currentStep = 1;
              renderStep();
            };

            document.getElementById("next-step").onclick = () => {

              buyerData = {
                name: document.getElementById("buyer-name").value,
                email: document.getElementById("buyer-email").value
              };

              if (!buyerData.name || !buyerData.email) {
                alert("Complete todos los campos");
                return;
              }

              currentStep = 3;
              renderStep();
            };
          }

          /* ================= STEP 3 ================= */

          else if (currentStep === 3) {

            modalBody.innerHTML = `
              <h4 class="mb-4">Método de pago</h4>
              <div id="payment-container"></div>
              <div class="mt-3">
                <button class="btn btn-outline-secondary" id="back-step">Atrás</button>
              </div>
            `;

            document.getElementById("back-step").onclick = () => {
              currentStep = 2;
              renderStep();
            };

            renderBrick();
          }

          /* ================= STEP 4 ================= */

          else if (currentStep === 4) {

            modalBody.innerHTML = `
              <div class="text-center py-4">
                <h3 class="text-success mb-3">Pago aprobado</h3>
                <p>Gracias por su compra.</p>
                <button class="btn btn-primary mt-3" id="close-modal">Cerrar</button>
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
                amount: Number(config.price)
              },
              paymentMethods: {
                creditCard: "all",
                debitCard: "all"
              },
              callbacks: {

                onReady: () => {},

                onSubmit: async (formData) => {

                  const response = await fetch(baseUrl + "/api/process-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...formData,
                      transaction_amount: Number(config.price),
                      payer: {
                        email: buyerData.email
                      }
                    })
                  });

                  const result = await response.json();

                  if (result.status === "approved") {
                    currentStep = 4;
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