export const enterFullscreen = async (element = document.documentElement) => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
    }
  } catch (error) {
    console.warn("Fullscreen request failed:", error);
  }
};

export const exitFullscreen = async () => {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    }
  } catch (error) {
    console.warn("Exit fullscreen failed:", error);
  }
};
