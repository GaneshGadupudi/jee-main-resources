export function isPhoneDevice() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  return /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(userAgent);
}
