const api = "https://api.frankfurter.app/latest";

async function convertCurrency() {
  const amount = document.getElementById("amount").value;
  const from = document.getElementById("from-currency").value;
  const to = document.getElementById("to-currency").value;
  const result = document.getElementById("result");
  const loader = document.getElementById("loader");

  if (!amount || isNaN(amount)) {
    result.innerText = "Please enter a valid amount.";
    return;
  }

  if (from === to) {
    result.innerText = `${amount} ${from} = ${amount} ${to}`;
    return;
  }

  loader.classList.remove("hidden");
  result.innerText = "";

  try {
    const response = await fetch(`${api}?amount=${amount}&from=${from}&to=${to}`);
    const data = await response.json();
    const rate = data.rates[to];
    const date = data.date;
    result.innerHTML = `
      <strong>${amount} ${from}</strong> = <strong>${rate} ${to}</strong><br/>
      <small>As of: ${date}</small>
    `;
  } catch (error) {
    result.innerText = "⚠️ Error fetching conversion rate. Please try again.";
  } finally {
    loader.classList.add("hidden");
  }
}

window.addEventListener("load", async () => {
  const response = await fetch("https://api.frankfurter.app/currencies");
  const currencies = await response.json();
  const fromSelect = document.getElementById("from-currency");
  const toSelect = document.getElementById("to-currency");

  Object.entries(currencies).forEach(([code, name]) => {
    const option = `<option value="${code}">${code} - ${name}</option>`;
    fromSelect.innerHTML += option;
    toSelect.innerHTML += option;
  });

  fromSelect.value = "USD";
  toSelect.value = "INR";
});
