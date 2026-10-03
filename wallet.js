window.VH = { wallet: "", chainId: 0, provider: null };
const announced = [];
window.addEventListener("eip6963:announceProvider", function (event) {
  const detail = event.detail;
  if (!detail || !detail.provider || !detail.info) return;
  if (!announced.some(function (item) { return item.info.uuid === detail.info.uuid; })) announced.push(detail);
});
window.dispatchEvent(new Event("eip6963:requestProvider"));
function walletName(provider) {
  if (!provider) return "Browser wallet";
  if (provider.isRabby) return "Rabby";
  if (provider.isOkxWallet || provider.isOKExWallet) return "OKX";
  if (provider.isTrust || provider.isTrustWallet) return "Trust";
  if (provider.isCoinbaseWallet) return "Coinbase";
  if (provider.isBitKeep || provider.isBitgetWallet) return "Bitget";
  if (provider.isPhantom) return "Phantom";
  if (provider.isBinance || provider.bbcSignTx) return "Binance";
  if (provider.isTokenPocket) return "TokenPocket";
  if (provider.isZerion) return "Zerion";
  if (provider.isRainbow) return "Rainbow";
  if (provider.isBraveWallet) return "Brave";
  if (provider.isSafePal) return "SafePal";
  if (provider.isImToken) return "imToken";
  if (provider.isMetaMask) return "MetaMask";
  return "Browser wallet";
}
function injectedProviders() {
  const list = [];
  announced.forEach(function (detail) {
    list.push({ name: detail.info.name || "Wallet", provider: detail.provider });
  });
  const eth = window.ethereum;
  if (!eth) return list;
  const providers = eth.providers && eth.providers.length ? eth.providers : [eth];
  providers.forEach(function (provider) {
    const name = walletName(provider);
    if (!list.some(function (item) { return item.name === name; })) list.push({ name: name, provider: provider });
  });
  return list;
}
function renderWalletApps(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const page = location.href.split("#")[0];
  const apps = [
    ["MetaMask", "https://metamask.app.link/dapp/" + page.replace(/^https?:\/\//, "")],
    ["Trust", "https://link.trustwallet.com/open_url?coin_id=60&url=" + encodeURIComponent(page)],
    ["Coinbase", "https://go.cb-w.com/dapp?cb_url=" + encodeURIComponent(page)],
    ["OKX", "https://www.okx.com/download?deeplink=" + encodeURIComponent("okx://wallet/dapp/url?dappUrl=" + page)]
  ];
  box.innerHTML = "";
  apps.forEach(function (app) {
    const a = document.createElement("a");
    a.className = "btn ghost";
    a.href = app[1];
    a.textContent = app[0];
    box.appendChild(a);
  });
}
async function connectFlow(boxId, onOk, onErr) {
  const box = document.getElementById(boxId);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise(function (resolve) { setTimeout(resolve, 150); });
  const found = injectedProviders();
  if (!found.length) {
    onErr("No wallet in this browser. Open this page in MetaMask, Trust, Coinbase, OKX, Rabby, or another EVM wallet.");
    return;
  }
  box.innerHTML = "";
  found.forEach(function (item) {
    const b = document.createElement("button");
    b.className = "btn ghost";
    b.type = "button";
    b.textContent = item.name;
    b.onclick = async function () {
      try {
        const acc = await item.provider.request({ method: "eth_requestAccounts" });
        const chain = await item.provider.request({ method: "eth_chainId" });
        window.VH.wallet = acc[0];
        window.VH.chainId = parseInt(chain, 16);
        window.VH.provider = item.provider;
        onOk(acc[0], item.name);
      } catch (e) { onErr(e.message || "Wallet rejected"); }
    };
    box.appendChild(b);
  });
}
async function ensureChain(chainId) {
  const provider = window.VH.provider || window.ethereum;
  if (!provider) throw new Error("Connect a wallet first.");
  const hex = "0x" + Number(chainId).toString(16);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch (e) {
    const code = e && (e.code || (e.data && e.data.originalError && e.data.originalError.code));
    if (Number(chainId) === 11155111 && (code === 4902 || code === -32603)) {
      await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: hex, chainName: "Sepolia", nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"], blockExplorerUrls: ["https://sepolia.etherscan.io"] }] });
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } else throw new Error(e.message || "Could not switch network");
  }
  const acc = await provider.request({ method: "eth_requestAccounts" });
  window.VH.wallet = acc[0];
  window.VH.chainId = chainId;
  window.VH.provider = provider;
}
const TREASURY = "0xf6F80827cBAf83798c7763FCd915C0068F2bE60C";
async function payUsdg() {
  await ensureChain(11155111);
  const provider = window.VH.provider || window.ethereum;
  const from = window.VH.wallet;
  if (!from) throw new Error("Connect wallet first.");
  return provider.request({ method: "eth_sendTransaction", params: [{ from: from, to: TREASURY, value: "0x11c37937e08000" }] });
}
