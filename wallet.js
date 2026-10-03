window.VH = { wallet: "", chainId: 0 };
function injectedProviders() {
  const list = [];
  const eth = window.ethereum;
  if (!eth) return list;
  const providers = eth.providers && eth.providers.length ? eth.providers : [eth];
  providers.forEach(function (p) {
    let name = "Browser wallet";
    if (p.isRabby) name = "Rabby";
    else if (p.isOkxWallet || p.isOKExWallet) name = "OKX";
    else if (p.isMetaMask) name = "MetaMask";
    if (!list.some(x => x.name === name)) list.push({ name: name, provider: p });
  });
  return list;
}
async function connectFlow(boxId, onOk, onErr) {
  const box = document.getElementById(boxId);
  const found = injectedProviders();
  if (!found.length) {
    onErr("No wallet in this browser. Open this page inside MetaMask, Rabby, or OKX.");
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
  if (!provider) throw new Error("No wallet. Open this page inside MetaMask, Rabby, or OKX.");
  const hex = "0x" + Number(chainId).toString(16);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch (e) {
    const code = e && (e.code || (e.data && e.data.originalError && e.data.originalError.code));
    if (Number(chainId) === 11155111 && (code === 4902 || code === -32603)) {
      await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: hex, chainName: "Sepolia", nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"], blockExplorerUrls: ["https://sepolia.etherscan.io"] }] });
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } else {
      throw new Error(e.message || "Could not switch to Sepolia");
    }
  }
  const acc = await provider.request({ method: "eth_requestAccounts" });
  window.VH.wallet = acc[0];
  window.VH.chainId = chainId;
  window.VH.provider = provider;
}
const USDG = { 1: "0xe343167631d89B6Ffc58B88d6b7fB0228795491D", 4663: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" };
const TREASURY = "0xf6F80827cBAf83798c7763FCd915C0068F2bE60C";
async function payUsdg() {
  await ensureChain(11155111);
  const provider = window.VH.provider || window.ethereum;
  const from = window.VH.wallet;
  if (!from) throw new Error("Connect wallet first.");
  return provider.request({ method: "eth_sendTransaction", params: [{ from: from, to: TREASURY, value: "0x5af3107a4000" }] });
}
