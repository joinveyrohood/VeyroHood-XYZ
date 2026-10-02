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
  if (!found.length) { onErr("No EVM wallet found. Install MetaMask, Rabby, or OKX."); return; }
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
  const hex = "0x" + Number(chainId).toString(16);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch (e) {
    if (Number(chainId) === 11155111 && e.code === 4902) {
      await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: hex, chainName: "Sepolia", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"], blockExplorerUrls: ["https://sepolia.etherscan.io"] }] });
    } else throw e;
  }
  window.VH.chainId = chainId;
}
const USDG = { 1: "0xe343167631d89B6Ffc58B88d6b7fB0228795491D", 4663: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" };
const TREASURY = "0xf6F80827cBAf83798c7763FCd915C0068F2bE60C";
async function payUsdg(chainId) {
  await ensureChain(11155111);
  const provider = window.VH.provider || window.ethereum;
  return provider.request({ method: "eth_sendTransaction", params: [{ from: window.VH.wallet, to: TREASURY, value: "0x5AF3107A4000" }] });
}
