document.addEventListener("DOMContentLoaded", () => {
  
  const { SerialPort } = require("serialport");

  let buffer = "";
  let port = null;
  const labels = ["ULF", "VLF", "LF", "MF", "HF", "VHF"];
  let dataVector1 = [];
  let dataVector2 = [];
  let receivingVector = 1; // Para saber qué vector está llegando

  const ctx = document.getElementById("myChart").getContext("2d");

  const ESP = [
    { vendorId: '1A86', productIds: ['7584', '5584', '5523', '752d', '7523', 'e008', '7522'] }, // CH340
    { vendorId: '10C4', productIds: ['EA60'] } // CP2102
  ];

  const PORTID = document.getElementById("port");
  const Datos = document.getElementById("Datos");
  const btnGraficarTabla1 = document.getElementById("btnGraficarTabla1");
  const btnGraficarTabla2 = document.getElementById("btnGraficarTabla2");

  const tablaBody1 = document.querySelector("#tablaValores1 tbody"); 
  const tablaBody2 = document.querySelector("#tablaValores2 tbody");

  PORTID.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Buscando TCEM 300M`;
  PORTID.className = "badge bg-warning text-dark p-2 fs-6";
  
  Datos.disabled = true;
  btnGraficarTabla1.disabled = true;
  btnGraficarTabla2.disabled = true;

  // Establece que Id's buscar
  function TcemEncontrado(p) {
    return ESP.some(device =>
      p.vendorId?.toUpperCase() === device.vendorId &&
      device.productIds.includes(p.productId?.toUpperCase())
    );
  }

  // Escanea los puertos cada 1 Segundo
  async function EscaneoESP() {
    setInterval(async () => {
      if (port && port.readable) return;

      try {
        const ports = await SerialPort.list();
        const matchingPort = ports.find(TcemEncontrado);

        if (!matchingPort) {
          PORTID.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Buscando TCEM 300M`;
          PORTID.className = "badge bg-warning text-dark p-2 fs-6";
          return;
        }

        port = new SerialPort({
          path: matchingPort.path,
          baudRate: 115200
        });

        port.on("open", () => {
          Datos.disabled = false;
          PORTID.textContent = `TCEM 300M conectado en ${matchingPort.path}`;
          PORTID.className = "badge bg-success text-light p-2 fs-6";
          LecturaData();
        });

        port.on("close", () => {
          Datos.disabled = true;
          PORTID.textContent = "TCEM 300M desconectado";
          PORTID.className = "badge bg-danger text-light p-2 fs-6";
          port = null;
        });

      } catch (err) {
        console.error("Error al escanear puertos:", err);
        PORTID.textContent = `Error al buscar puertos: ${err.message}`;
      }
    }, 1000);
  }

  // Actualiza tabla con los datos y etiquetas
  function actualizarTabla(tablaBody, dataArray, labels) {
    tablaBody.innerHTML = "";
    dataArray.forEach((valor, i) => {
      tablaBody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${i + 1}</td>
          <td>${labels[i]}</td>
          <td>${valor.toFixed(3)}</td>
        </tr>
      `);
    });
  }

  // Lee los datos del ESP
  function LecturaData() {
    port.on("readable", () => {
      let chunk = port.read();
      if (!chunk) return;
      buffer += chunk.toString();

      // Procesar líneas completas separadas por salto de línea
      let lines = buffer.split("\n");
      // Dejar en buffer la última línea incompleta
      buffer = lines.pop();

      lines.forEach(line => {
        const data = line.trim();
        if (!data) return;

        if (data.toUpperCase() === "VECTOR2") {
          receivingVector = 2;
          console.log("Ahora recibiendo Vector 2");
          return;
        } else if (data.toUpperCase() === "VECTOR1") {
          receivingVector = 1;
          console.log("Ahora recibiendo Vector 1");
          return;
        }

        const numericData = parseFloat(data);
        if (isNaN(numericData)) return;

        if (receivingVector === 1 && dataVector1.length < labels.length) {
          dataVector1.push(numericData);
          actualizarTabla(tablaBody1, dataVector1, labels);
          if (dataVector1.length === labels.length) btnGraficarTabla1.disabled = false;
        } else if (receivingVector === 2 && dataVector2.length < labels.length) {
          dataVector2.push(numericData);
          actualizarTabla(tablaBody2, dataVector2, labels);
          if (dataVector2.length === labels.length) btnGraficarTabla2.disabled = false;
        }
      });
    });
  }

  // Estiliza el Chart
  const myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: 'V/M',
        backgroundColor: "rgba(0, 0, 255, 0.6)",
        data: []
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          title: {
            display: true,
            text: 'V/M'
          }
        },
        x: {
          title: {
            display: true,
            text: 'KHz'
          }
        }
      }
    }
  });

    // Grafica el Chart
  function Graficar(dataArray, label) {
    myChart.data.datasets[0].data = dataArray.slice();
    myChart.data.datasets[0].label = label;
    myChart.update();
  }

  // Manda el START\n
  Datos.addEventListener("click", () => {
    if (port && port.writable) {
      dataVector1 = [];
      dataVector2 = [];
      receivingVector = 1;
      btnGraficarTabla1.disabled = true;
      btnGraficarTabla2.disabled = true;
      myChart.data.datasets[0].data = [];
      myChart.update();
      tablaBody1.innerHTML = "";
      tablaBody2.innerHTML = "";

      port.write("START\n", (err) => {
        if (err) {
          console.error("Error al enviar START:", err.message);
        } else {
          console.log("Se envió el START al ESP");
        }
      });
    } else {
      console.warn("ESP no conectado.");
    }
  });

  // Grafica la Tabla 1
  btnGraficarTabla1.addEventListener("click", () => {
    if (dataVector1.length > 0) {
      Graficar(dataVector1, "Tabla 1");
    }
  });

  // Grafica la Tabla 2
  btnGraficarTabla2.addEventListener("click", () => {
    if (dataVector2.length > 0) {
      Graficar(dataVector2, "Tabla 2");
    }
  });

  EscaneoESP();
});
