export const cleanupExamSession = async ({
  stopCamera,
  stopScreenShare,
  stopTimer,
  disconnectSocket,
  clearLocalStorage,
  exitFullscreen
}) => {
  if (typeof stopCamera === 'function') stopCamera();
  if (typeof stopScreenShare === 'function') stopScreenShare();
  if (typeof stopTimer === 'function') stopTimer();
  if (typeof disconnectSocket === 'function') disconnectSocket();
  if (typeof clearLocalStorage === 'function') clearLocalStorage();
  if (typeof exitFullscreen === 'function') await exitFullscreen();
};
