// ================================
// DOM READY
// ================================
document.addEventListener("DOMContentLoaded", function () {

  // ---- PARAMETER IDS ----
  const params = ["N", "u1", "u2", "mu"];

  // ---- SLIDER ↔ TEXTBOX SYNC ----
  params.forEach(param => {
    const slider = document.getElementById(param);
    const textBox = document.getElementById(param + "_val");

    if (!slider || !textBox) return;

    slider.addEventListener("input", () => {
      textBox.value = slider.value;
    });

    textBox.addEventListener("input", () => {
      slider.value = textBox.value;
    });
  });

  // ---- GENERATE CODE (EXACT OCTAVE CODE) ----
  window.generateCode = function () {

    const N  = document.getElementById("N").value;
    const u1 = document.getElementById("u1").value;
    const u2 = document.getElementById("u2").value;
    const mu = document.getElementById("mu").value;

    const code = `
function lms_ar(N, u_init, mu)
% N: Number of samples
% u_init: Initial values of u [u(1), u(2)]
% mu: Step size for LMS algorithm

% Initialize random noise
v = rand(N, 1);

% Initialize u with given initial values
u = zeros(N, 1);
u(1) = u_init(1);
u(2) = u_init(2);
% Generate autoregressive process
for i = 3:N
u(i) = 0.75 * u(i-1) - 0.5 * u(i-2) + v(i);
endfor

% Calculate autocorrelation matrix R and cross-correlation vector p
R = zeros(2, 2);
p = zeros(2, 1);

for i = 2:N
x = [v(i); v(i-1)];
R = R + x * x';
p = p + x * u(i);
endfor

R = R / (N-1);
p = p / (N-1);
w_opt = R \\ p;

% Initialize LMS weights and error
w_lms = zeros(2, N);
e = zeros(N, 1);

% LMS algorithm
for i = 2:N
e(i) = u(i) - w_lms(:, i-1)' * [v(i); v(i-1)];
w_lms(:, i) = w_lms(:, i-1) + mu * [v(i); v(i-1)] * e(i);
endfor

% Plot mean square error
figure(1)
plot(e.^2);
title('Mean Square Error vs Number of Iterations')
xlabel('Number of Iterations')
ylabel('Mean Square Error')

% Plot random walk of w1
figure(2)
plot(1:N, w_lms(1, :));
hold on
plot(1:N, ones(1, N) * w_opt(1))
title('Random Walk of w1')
xlabel('Number of Iterations')
ylabel('w1')
legend('Estimated w1', 'Optimal w1')
hold off

% Plot random walk of w2
figure(3)
plot(1:N, w_lms(2, :));
hold on
plot(1:N, ones(1, N) * w_opt(2))
title('Random Walk of w2')
xlabel('Number of Iterations')
ylabel('w2')
legend('Estimated w2', 'Optimal w2')
hold off
endfunction

N = ${N};
u_init = [${u1}, ${u2}];
mu = ${mu};
lms_ar(N, u_init, mu);
`;

    document.getElementById("codeBox").value = code.trim();
  };
});

// ================================
// CHART SETUP
// ================================
const lineStyle = {
  pointRadius: 0,
  borderWidth: 1,
  tension: 0.2
};

let mseChart, w1Chart, w2Chart;

// ================================
// SUBMIT & RUN
// ================================
function submitAndRun() {
  runLMS();
}

// ================================
// LMS SIMULATION (MATCHES MATLAB)
// ================================
function runLMS() {

  const N  = Number(document.getElementById("N").value);
  const mu = Number(document.getElementById("mu").value);
  const u1 = Number(document.getElementById("u1").value);
  const u2 = Number(document.getElementById("u2").value);

  // ---- RANDOM NOISE ----
  const v = Array.from({ length: N }, () => Math.random());

  // ---- AR PROCESS ----
  const u = new Array(N).fill(0);
  u[0] = u1;
  u[1] = u2;

  for (let i = 2; i < N; i++) {
    u[i] = 0.75 * u[i - 1] - 0.5 * u[i - 2] + v[i];
  }

  // ---- R & p ----
  let R = [[0, 0], [0, 0]];
  let p = [0, 0];

  for (let i = 1; i < N; i++) {
    const x1 = v[i];
    const x2 = v[i - 1];

    R[0][0] += x1 * x1;
    R[0][1] += x1 * x2;
    R[1][0] += x2 * x1;
    R[1][1] += x2 * x2;

    p[0] += x1 * u[i];
    p[1] += x2 * u[i];
  }

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) R[i][j] /= (N - 1);
    p[i] /= (N - 1);
  }

  // ---- OPTIMAL WEIGHTS ----
  const det = R[0][0] * R[1][1] - R[0][1] * R[1][0];
  const wOpt1 = ( R[1][1] * p[0] - R[0][1] * p[1] ) / det;
  const wOpt2 = ( -R[1][0] * p[0] + R[0][0] * p[1] ) / det;

  // ---- LMS ----
  let w1 = new Array(N).fill(0);
  let w2 = new Array(N).fill(0);
  let mse = new Array(N).fill(0);

  for (let i = 1; i < N; i++) {
    const y = w1[i - 1] * v[i] + w2[i - 1] * v[i - 1];
    const e = u[i] - y;

    w1[i] = w1[i - 1] + mu * v[i] * e;
    w2[i] = w2[i - 1] + mu * v[i - 1] * e;
    mse[i] = e * e;
  }

  const xAxis = Array.from({ length: N }, (_, i) => i);

  // ---- CLEAR OLD CHARTS ----
  if (mseChart) mseChart.destroy();
  if (w1Chart) w1Chart.destroy();
  if (w2Chart) w2Chart.destroy();

const axisConfig = {
  min: 0,
  max: N - 1,
  ticks: {
    stepSize: Math.ceil(N / 5)   // adaptive ticks (50 → 10, 100 → 20)
  },
  title: {
    display: true,
    text: "Number of Iterations"
  }
};

  // ---- MSE ----
 mseChart = new Chart(document.getElementById("mseChart"), {
  type: "line",
  data: {
    labels: xAxis,
    datasets: [{
      label: "Mean Square Error",
      data: mse,
      ...lineStyle
    }]
  },
  options: {
    scales: {
      x: axisConfig
    }
  }
});


  // ---- W1 ----
  w1Chart = new Chart(document.getElementById("w1Chart"), {
    type: "line",
    data: {
      labels: xAxis,
      datasets: [
        { label: "Estimated w1", data: w1, ...lineStyle },
        { label: "Optimal w1", data: Array(N).fill(wOpt1), borderDash: [6,6], pointRadius: 0 }
      ]
    },
    options: {
    scales: {
      x: axisConfig
    }
  }
});

  // ---- W2 ----
  w2Chart = new Chart(document.getElementById("w2Chart"), {
    type: "line",
    data: {
      labels: xAxis,
      datasets: [
        { label: "Estimated w2", data: w2, ...lineStyle },
        { label: "Optimal w2", data: Array(N).fill(wOpt2), borderDash: [6,6], pointRadius: 0 }
      ]
    },
    options: {
      scales: {
        x: axisConfig
      }
    }
  });
}
// ================================
// DOWNLOAD CODE AS .c FILE
// ================================
function downloadCode() {
  const code = document.getElementById("codeBox").value;

  if (!code || code.trim() === "") {
    alert("No code to download. Please generate code first.");
    return;
  }

  // Create a blob with plain text
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });

  // Create a temporary download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "lms_ar.c";   // ✅ .c extension as requested
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
