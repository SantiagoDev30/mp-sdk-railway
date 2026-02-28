(function () {

  // Obtener URL base del script
  const scripts = document.getElementsByTagName("script");
  const currentScript = scripts[scripts.length - 1];
  const baseUrl = currentScript.src.replace("/sdk.js", "");

  window.MP_SDK = {
    openPayment: async function (config) {

      const configResponse = await fetch(baseUrl + "/api/config");
      const { public_key } = await configResponse.json();

      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0,0,0,0.5)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "9999";

      const modal = document.createElement("div");
      modal.style.background = "#fff";
      modal.style.padding = "20px";
      modal.style.borderRadius = "10px";
      modal.style.width = "420px";

      modal.innerHTML = `
        <h3>${config.title}</h3>
        <p>Total: S/ ${config.price}</p>
        <div id="payment-container"></div>
        <button id="close-modal">Cerrar</button>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      document.getElementById("close-modal").onclick = () => {
        document.body.removeChild(overlay);
      };

      if (!window.MercadoPago) {
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => renderBrick();
        document.body.appendChild(script);
      } else {
        renderBrick();
      }

      function renderBrick() {

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
                  transaction_amount: Number(config.price)
                })
              });

              const result = await response.json();

              if (result.status === "approved") {
                alert("Pago aprobado");
                document.body.removeChild(overlay);
              } else {
                alert("Pago rechazado");
              }
            },
            onError: (error) => {
              console.error(error);
            }
          }
        });
      }
    }
  };

})();