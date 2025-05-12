const { SerialPort } = require("serialport");
let port = null;
let espData = []; // Eje Y
let i = 0;

const labels = ["ULF", "VLF", "LF", "MF", "HF", "VHF"]; // Eje X
const ctx = document.getElementById("myChart").getContext("2d"); // dejar asi

const ESP = [
  { vendorId: '1A86', productIds: ['7584', '5584', '5523', '752d', '7523', 'e008', '7522'] }, // CH340
  { vendorId: '10C4', productIds: ['EA60'] }  // CP2102
];

const dataSerial = document.getElementById("data");
const PORTID = document.getElementById("port");
const connectButton = document.getElementById("connectButton");

function TcemEncontrado(p) {
  return ESP.some(device =>
    p.vendorId?.toUpperCase() === device.vendorId &&
    device.productIds.includes(p.productId?.toUpperCase())
  );
}

async function autoConnect() {
  try {
    const ports = await SerialPort.list();
    const matchingPort = ports.find(TcemEncontrado);

    if (!matchingPort) {
      PORTID.textContent = "TCEM 300M desconectado";
      return;
    }

    port = new SerialPort({
      path: matchingPort.path,
      baudRate: 115200
    });

    port.on("open", () => {
      PORTID.textContent = `TCEM 300M conectado en ${matchingPort.path}`;
      LecturaData(); 
    });
/*
    port.on("error", err => {
      console.error("Error:", err.message);
      PORTID.textContent = ` Error: ${err.message}`;
    });
*/
  } catch (err) {
    console.error("Error al listar puertos:", err);
    PORTID.textContent = `Error al buscar puertos: ${err.message}`;
  }
}

// Crear gráfico
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
        max: 6,
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

// Actualizar gráfico
window.Start = function () {
  const interval = setInterval(() => {
    if (i >= espData.length) {
      clearInterval(interval);
      return;
    }

    myChart.data.datasets[0].data[i] = espData[i];
    myChart.update();
    i++;
  }, 1000);
};

// Escuchar los datos del puerto
function LecturaData() {
  port.on("readable", function () {
    const data = port.read().toString().trim();
    console.log("Data:", data);
    dataSerial.textContent = data;

    const numericData = parseFloat(data); // Convertir los datos a número directamente
    if (espData.length < labels.length) {
      espData.push(numericData); 
    }
  });
}

connectButton.addEventListener("click", autoConnect);
