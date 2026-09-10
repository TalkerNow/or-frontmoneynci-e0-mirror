/**
 * Lightweight column resize for career grids (Vuexy Infos).
 * Attaches drag handles to thead th without dropping any columns.
 */
export function attachColResize(table) {
  if (!table || !table.tHead) return () => {};
  const ths = Array.from(table.tHead.querySelectorAll("th"));
  const cleanups = [];

  ths.forEach((th) => {
    if (th.querySelector(".col-resize-handle")) return;
    if (getComputedStyle(th).position === "static") {
      th.style.position = "relative";
    }
    const handle = document.createElement("span");
    handle.className = "col-resize-handle";
    handle.title = "Redimensionner la colonne";
    th.appendChild(handle);

    let startX = 0;
    let startW = 0;

    const onMove = (e) => {
      const dx = e.clientX - startX;
      const next = Math.max(28, startW + dx);
      th.style.width = `${next}px`;
      th.style.minWidth = `${next}px`;
      th.style.maxWidth = `${next}px`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startW = th.getBoundingClientRect().width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    handle.addEventListener("mousedown", onDown);
    cleanups.push(() => {
      handle.removeEventListener("mousedown", onDown);
      handle.remove();
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
