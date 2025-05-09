let i = 0;
let Yval = Array(6).fill(0);
const labels = ["ULF", "VLF", "LF", "MF", "HF", "VHF"];
const ctx = document.getElementById("myChart").getContext("2d");

// Crear gráfico
const myChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: labels,
    datasets: [{
      label: 'V/M',
      backgroundColor: "rgba(0, 0, 255, 0.6)",
      data: [...Yval]
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
    if (i >= Yval.length) {
      clearInterval(interval);
      return;
    }

    Yval[i] = i + 1;
    myChart.data.datasets[0].data = [...Yval];
    myChart.update();
    i++;
  }, 1000);
};


async function testIt () {
  const filters = [
    // CH340
    { usbVendorId: 0x1A86, usbProductId: 0x7584 },
    { usbVendorId: 0x1A86, usbProductId: 0x5584 },
    { usbVendorId: 0x1A86, usbProductId: 0x5523 },
    { usbVendorId: 0x1A86, usbProductId: 0x752d },
    { usbVendorId: 0x1A86, usbProductId: 0x7523 },
    { usbVendorId: 0x1A86, usbProductId: 0xe008 },
    { usbVendorId: 0x1A86, usbProductId: 0x7522 },	
    { usbVendorId: 0x2341, usbProductId: 0x0001 },
    //CP2102
    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }
  ]
  try {
    const port = await navigator.serial.requestPort({ filters })
    const portInfo = port.getInfo()
    document.getElementById('device-name').innerHTML = `TCEM 300M Encontrado`
  } catch (ex) {
    if (ex.name === 'NotFoundError') {
      document.getElementById('device-name').innerHTML = 'TCEM 300M No Encontrado'
    } else {
      document.getElementById('device-name').innerHTML = ex
    }
  }
}
document.getElementById('clickme').addEventListener('click', testIt)

