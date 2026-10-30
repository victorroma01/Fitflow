/* ═══ core/events ═══
   Delegación global de eventos click, change e input.
*/
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b && A[b.dataset.a])
    A[b.dataset.a](+b.dataset.i, b);
});
document.addEventListener('change', e => {
  const b = e.target.closest('[data-c]');
  if (b && C[b.dataset.c]) {
    C[b.dataset.c](e.target, +b.dataset.i, +b.dataset.j);
    if (W && typeof saveSession == 'function')
      saveSession();
  }
});
document.addEventListener('input', e => {
  const u = e.target.dataset.u;
  u && U[u](e.target.value);
});
