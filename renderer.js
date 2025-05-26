document.addEventListener("DOMContentLoaded", () => {
  const { SerialPort } = require("serialport");

  // --- Estado y constantes ---
  const estado = {
    buffer: "",
    port: null,
    dataVector1: [],
    dataVector2: [],
    receivingVector: 1
  };
  const Bandas = ["ULF", "VLF", "LF", "MF", "HF", "VHF"];
  const Frecuencia = ["300-3000 HZ", "3-30 KHz", "30-300 KHz", "300-3000 KHz", "3-30 MHz", "30-300 KHz"];
  const ESP = [
    { vendorId: '1A86', productIds: ['7584', '5584', '5523', '752d', '7523', 'e008', '7522'] },
    { vendorId: '10C4', productIds: ['EA60'] }
  ];

  // --- Elementos UI ---
  const PORTID = document.getElementById("port");
  const Datos = document.getElementById("Datos");
  const toggleBtn = document.getElementById("Modo Oscuro");
  const logo = document.getElementById("logoTCEM");
  const Graficar1 = document.getElementById("btnGraficarTabla1");
  const Graficar2 = document.getElementById("btnGraficarTabla2");
  const tablaBody1 = document.querySelector("#tablaValores1 tbody");
  const tablaBody2 = document.querySelector("#tablaValores2 tbody");
  const iconoModo = document.getElementById("icono-modo");
  const textoModo = document.getElementById("texto-modo");
  const ctx = document.getElementById("myChart").getContext("2d");

  // --- Inicialización UI ---
  function inicializarUI() {
    PORTID.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Buscando TCEM 300M`;
    PORTID.className = "badge bg-warning text-dark p-2 fs-6";
    Datos.disabled = true;
    Graficar1.disabled = true;
    Graficar2.disabled = true;
  }

  // --- Chart ---
  const myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Bandas,
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
          title: { display: true, text: 'V/M', color: "#222" },
          ticks: { color: "#222" }
        },
        x: {
          title: { display: true, text: 'KHz', color: "#222" },
          ticks: { color: "#222" }
        }
      },
      plugins: {
        legend: { labels: { color: "#222" } }
      }
    }
  });

  // --- Tema ---
  function aplicarTema(modoOscuro) {
    if (modoOscuro) {
      document.body.classList.add("dark-mode");
      logo.src = "Portada TCEM3.png";
      toggleBtn.classList.remove("tema-claro");
      toggleBtn.classList.add("tema-oscuro");
      iconoModo.textContent = "☀️";
      textoModo.textContent = "Modo Claro";
      myChart.options.scales.x.title.color = "rgb(255, 255, 255)";
      myChart.options.scales.y.title.color = "rgb(255, 255, 255)";
      myChart.options.scales.x.ticks.color = "rgb(255, 255, 255)";
      myChart.options.scales.y.ticks.color = "rgb(255, 255, 255)";
      myChart.data.datasets[0].backgroundColor = "rgba(0, 212, 255, 0.7)";
      myChart.options.plugins.legend.labels.color = "rgb(255, 255, 255)";
    } else {
      document.body.classList.remove("dark-mode");
      logo.src = "Portada TCEM3.png";
      toggleBtn.classList.remove("tema-oscuro");
      toggleBtn.classList.add("tema-claro");
      iconoModo.textContent = "🌙";
      textoModo.textContent = "Modo Oscuro";
      myChart.options.scales.x.title.color = "#222";
      myChart.options.scales.y.title.color = "#222";
      myChart.options.scales.x.ticks.color = "#222";
      myChart.options.scales.y.ticks.color = "#222";
      myChart.data.datasets[0].backgroundColor = "rgba(0, 102, 255, 0.7)";
      myChart.options.plugins.legend.labels.color = "#222";
    }
    myChart.update();
  }

  function cargarTemaGuardado() {
    const temaGuardado = localStorage.getItem("tema");
    aplicarTema(temaGuardado === "oscuro");
  }

  function alternarTema() {
    toggleBtn.classList.add("animar");
    setTimeout(() => toggleBtn.classList.remove("animar"), 300);
    const modoOscuro = !document.body.classList.contains("dark-mode");
    aplicarTema(modoOscuro);
    localStorage.setItem("tema", modoOscuro ? "oscuro" : "claro");
  }

  // --- Serial ---
  function TcemEncontrado(p) {
    return ESP.some(device =>
      p.vendorId?.toUpperCase() === device.vendorId &&
      device.productIds.includes(p.productId?.toUpperCase())
    );
  }

  async function EscaneoESP() {
    setInterval(async () => {
      if (estado.port && estado.port.readable) return;
      try {
        const ports = await SerialPort.list();
        const matchingPort = ports.find(TcemEncontrado);

        if (!matchingPort) {
          PORTID.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Buscando TCEM 300M`;
          PORTID.className = "badge bg-warning text-dark p-2 fs-6";
          return;
        }

        estado.port = new SerialPort({
          path: matchingPort.path,
          baudRate: 115200
        });

        estado.port.on("open", () => {
          Datos.disabled = false;
          PORTID.textContent = `TCEM 300M conectado en ${matchingPort.path}`;
          PORTID.className = "badge bg-success text-light p-2 fs-6";
          LecturaData();
        });

        estado.port.on("close", () => {
          Datos.disabled = true;
          PORTID.textContent = "TCEM 300M desconectado";
          PORTID.className = "badge bg-danger text-light p-2 fs-6";
          estado.port = null;
        });

      } catch (err) {
        console.error("Error al escanear puertos:", err);
        PORTID.textContent = `Error al buscar puertos: ${err.message}`;
      }
    }, 1000);
  }

  // --- Tablas y datos ---
  function actualizarTabla(tablaBody, dataArray, bandas, frecuencias) {
    tablaBody.innerHTML = "";
    dataArray.forEach((valor, i) => {
      tablaBody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${bandas[i]}</td>
          <td>${frecuencias[i]}</td>
          <td>${valor.toFixed(3)}</td>
        </tr>
      `);
    });
  }

  function LecturaData() {
    estado.port.on("readable", () => {
      let chunk = estado.port.read();
      if (!chunk) return;
      estado.buffer += chunk.toString();

      let lines = estado.buffer.split("\n");
      estado.buffer = lines.pop();

      lines.forEach(line => {
        const data = line.trim();
        if (!data) return;

        if (data.toUpperCase() === "VECTOR2") {
          estado.receivingVector = 2;
          return;
        } else if (data.toUpperCase() === "VECTOR1") {
          estado.receivingVector = 1;
          return;
        }

        const numericData = parseFloat(data);
        if (isNaN(numericData)) return;

        if (estado.receivingVector === 1 && estado.dataVector1.length < Bandas.length) {
          estado.dataVector1.push(numericData);
          actualizarTabla(tablaBody1, estado.dataVector1, Bandas, Frecuencia);
          if (estado.dataVector1.length === Bandas.length) Graficar1.disabled = false;
        } else if (estado.receivingVector === 2 && estado.dataVector2.length < Bandas.length) {
          estado.dataVector2.push(numericData);
          actualizarTabla(tablaBody2, estado.dataVector2, Bandas, Frecuencia);
          if (estado.dataVector2.length === Bandas.length) Graficar2.disabled = false;
        }
      });
    });
  }

  function Graficar(dataArray, label) {
    myChart.data.datasets[0].data = dataArray.slice();
    myChart.data.datasets[0].label = label;
    myChart.update();
  }

  // --- Eventos UI ---
  Datos.addEventListener("click", () => {
    if (estado.port && estado.port.writable) {
      estado.dataVector1 = [];
      estado.dataVector2 = [];
      estado.receivingVector = 1;
      Graficar1.disabled = true;
      Graficar2.disabled = true;
      myChart.data.datasets[0].data = [];
      myChart.update();
      tablaBody1.innerHTML = "";
      tablaBody2.innerHTML = "";

      estado.port.write("START\n", (err) => {
        if (err) {
          console.error("Error al enviar START:", err.message);
        }
      });
    }
  });

  Graficar1.addEventListener("click", () => {
    if (estado.dataVector1.length > 0) {
      Graficar(estado.dataVector1, "Tabla 1");
    }
  });

  Graficar2.addEventListener("click", () => {
    if (estado.dataVector2.length > 0) {
      Graficar(estado.dataVector2, "Tabla 2");
    }
  });

  toggleBtn.addEventListener("click", alternarTema);

  // --- Inicialización general ---
  inicializarUI();
  cargarTemaGuardado();
  EscaneoESP();
});

