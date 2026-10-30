/* ═══ workout/wake ═══
   Mantener la pantalla activa durante el entreno.
   Define: wakeLockHandle, keepAwake
*/
import { S, W, wodRun } from '../core/state.js';
let wakeLockHandle = null;
export const keepAwake = async () => {
  try {
    const want = !!(((W && !W.p && S.awk !== 0) || (wodRun && !wodRun.pa && !wodRun.done)) && document.visibilityState == 'visible');
    if (want && !wakeLockHandle && navigator.wakeLock) {
      const l = await navigator.wakeLock.request('screen');
      wakeLockHandle = l;
      l.addEventListener('release', () => {
        if (wakeLockHandle === l)
          wakeLockHandle = null;
      });
    }
    else if (!want && wakeLockHandle) {
      const l = wakeLockHandle;
      wakeLockHandle = null;
      await l.release();
    }
  }
  catch (e) {
    wakeLockHandle = null;
  }
};
document.addEventListener('visibilitychange', keepAwake);
